import { NextRequest, NextResponse } from 'next/server';

// Known English titles for better search
const KNOWN_TRANSLATIONS: Record<string, string> = {
  '思考快与慢': 'Thinking Fast and Slow',
  '思考，快与慢': 'Thinking Fast and Slow',
  '乡土中国': 'From the Soil',
  '人类简史': 'Sapiens',
  '未来简史': 'Homo Deus',
  '三体': 'The Three-Body Problem',
  '活着': 'To Live',
  '百年孤独': 'One Hundred Years of Solitude',
  '小王子': 'The Little Prince',
  '追风筝的人': 'The Kite Runner',
  '1984': '1984',
  '围城': 'Fortress Besieged',
  '红楼梦': 'Dream of the Red Chamber',
  '西游记': 'Journey to the West',
  '脑机接口': 'Brain-Computer Interface',
  '原则': 'Principles',
};

// Normalize for comparison: lowercase, remove punctuation/spaces
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

// Check if the API result title is a reasonable match for the requested title
function titleMatches(resultTitle: string, requestedTitle: string, englishTitle?: string): boolean {
  const normResult = normalize(resultTitle);
  const normRequested = normalize(requestedTitle);

  if (normResult.includes(normRequested) || normRequested.includes(normResult)) return true;

  if (englishTitle) {
    const normEnglish = normalize(englishTitle);
    if (normResult.includes(normEnglish) || normEnglish.includes(normResult)) return true;
  }

  return false;
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Amazon: search for book cover with title verification via structured data
async function searchAmazon(query: string, requestedTitle: string, englishTitle?: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query + ' book')}&i=stripbooks`;
    const res = await fetchWithTimeout(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract product blocks: each contains a title and an image
    // Match data-component-type="s-search-result" blocks or individual product entries
    const productRegex = /<div[^>]*data-asin="[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    const products = html.match(productRegex) || [];

    for (const block of products.slice(0, 5)) {
      // Extract title from alt text or aria-label
      const titleMatch = block.match(/alt="([^"]+)"/);
      const blockTitle = titleMatch ? titleMatch[1] : '';

      if (!blockTitle || !titleMatches(blockTitle, requestedTitle, englishTitle)) continue;

      // Extract image URL from this specific product block
      const imgMatch = block.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.-]+\.(?:jpg|png)/);
      if (imgMatch) {
        // Return high-res version
        return imgMatch[0].replace(/\._[A-Z][A-Z0-9_,]+_\./, '.');
      }
    }

    // Simpler fallback: find img tags with alt text matching our title
    const imgTagRegex = /<img[^>]*alt="([^"]*)"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"[^>]*>/g;
    let match;
    while ((match = imgTagRegex.exec(html)) !== null) {
      const [, altText, imgUrl] = match;
      if (titleMatches(altText, requestedTitle, englishTitle)) {
        return imgUrl.replace(/\._[A-Z][A-Z0-9_,]+_\./, '.');
      }
    }
  } catch { /* skip */ }
  return null;
}

// JD.com: search for book cover with title verification
async function searchJD(query: string, requestedTitle: string, englishTitle?: string): Promise<string | null> {
  try {
    const searchUrl = `https://search.jd.com/Search?keyword=${encodeURIComponent(query)}&enc=utf-8&book=y`;
    const res = await fetchWithTimeout(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // JD product list items contain title in em/a tags and images in img tags
    // Extract product blocks from the goods list
    const itemRegex = /<li[^>]*class="gl-item"[^>]*>[\s\S]*?<\/li>/g;
    const items = html.match(itemRegex) || [];

    for (const item of items.slice(0, 5)) {
      // Extract title text
      const titleMatch = item.match(/<em>([^<]*(?:<[^>]*>[^<]*)*)<\/em>/);
      const itemTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';

      if (!itemTitle || !titleMatches(itemTitle, requestedTitle, englishTitle)) continue;

      // Extract image URL - JD uses data-lazy-img or src
      const imgMatch = item.match(/data-lazy-img="([^"]+)"/) || item.match(/src="(\/\/img\d+\.360buyimg\.com[^"]+)"/);
      if (imgMatch) {
        let url = imgMatch[1];
        if (url.startsWith('//')) url = 'https:' + url;
        // Get larger image
        return url.replace(/\/s\d+x\d+_/, '/').replace(/\/n\d+\//, '/n1/');
      }
    }
  } catch { /* skip */ }
  return null;
}

// Open Library: structured API with title verification
async function searchOpenLibrary(query: string, requestedTitle: string, englishTitle?: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,cover_i`
    );
    if (!res.ok) return null;
    const data = await res.json();

    for (const doc of data.docs || []) {
      if (!doc.cover_i) continue;
      if (!titleMatches(doc.title || '', requestedTitle, englishTitle)) continue;
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }
  } catch { /* skip */ }
  return null;
}

// Google Books: structured API with title verification
async function searchGoogleBooks(query: string, requestedTitle: string, englishTitle?: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
    );
    if (!res.ok) return null;
    const data = await res.json();

    for (const item of data.items || []) {
      const info = item.volumeInfo;
      if (!info?.imageLinks) continue;
      if (!titleMatches(info.title || '', requestedTitle, englishTitle)) continue;
      const url = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail;
      if (url) {
        return url.replace('http://', 'https://').replace('zoom=1', 'zoom=2');
      }
    }
  } catch { /* skip */ }
  return null;
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') || '';
  const author = req.nextUrl.searchParams.get('author') || '';

  if (!title) return NextResponse.json({ coverUrl: null });

  const cleanTitle = title.replace(/[《》""「」]/g, '');
  const englishTitle = KNOWN_TRANSLATIONS[cleanTitle];

  // Search queries to try
  const queries: string[] = [];
  if (englishTitle) queries.push(englishTitle);
  queries.push(`${cleanTitle} ${author}`);
  queries.push(cleanTitle);

  // Strategy: try Amazon + JD first (best cover quality), then Open Library, then Google Books
  // For each source, try all query variants before moving to next source
  const sources = [searchAmazon, searchJD, searchOpenLibrary, searchGoogleBooks];

  for (const searchFn of sources) {
    for (const q of queries) {
      const cover = await searchFn(q, cleanTitle, englishTitle);
      if (cover) return NextResponse.json({ coverUrl: cover });
    }
  }

  // No verified cover found
  return NextResponse.json({ coverUrl: null });
}
