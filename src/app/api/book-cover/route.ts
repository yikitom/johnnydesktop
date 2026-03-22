import { NextRequest, NextResponse } from 'next/server';

// Known English titles for better search on non-Chinese sources
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

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---- Source 1: Douban (best for Chinese books) ----
// Uses the internal JSON search endpoint that returns cover_url directly
async function searchDouban(query: string, requestedTitle: string, englishTitle?: string): Promise<string | null> {
  try {
    const url = `https://book.douban.com/j/search?q=${encodeURIComponent(query)}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://book.douban.com/',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Response could be JSON array or object with items/data
    const items: Array<{ title?: string; cover_url?: string }> = [];
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        items.push(...json);
      } else if (json.items) {
        items.push(...json.items);
      } else if (json.data) {
        items.push(...json.data);
      }
    } catch {
      return null;
    }

    for (const item of items.slice(0, 5)) {
      // Strip HTML tags from title if present
      const itemTitle = (item.title || '').replace(/<[^>]*>/g, '').trim();
      if (!itemTitle || !titleMatches(itemTitle, requestedTitle, englishTitle)) continue;
      if (item.cover_url) {
        // Return large version of cover
        return item.cover_url.replace(/\/s\w+\//, '/l/');
      }
    }
  } catch { /* skip */ }
  return null;
}

// ---- Source 2: Bookcover API (Goodreads aggregator) ----
// https://github.com/w3slley/bookcover-api
async function searchBookcoverAPI(title: string, author: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ book_title: title, author_name: author });
    const res = await fetchWithTimeout(
      `https://bookcover.longitood.com/bookcover?${params.toString()}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.url) return data.url;
  } catch { /* skip */ }
  return null;
}

// ---- Source 3: Google Books API ----
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

// ---- Source 4: Open Library ----
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

// Race: return first non-null result, or null if all fail
async function raceForResult(promises: Promise<string | null>[]): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let pending = promises.length;
    if (pending === 0) { resolve(null); return; }

    for (const p of promises) {
      p.then((result) => {
        if (settled) return;
        if (result) {
          settled = true;
          resolve(result);
        } else {
          pending--;
          if (pending === 0) resolve(null);
        }
      }).catch(() => {
        pending--;
        if (!settled && pending === 0) resolve(null);
      });
    }
  });
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title') || '';
  const author = req.nextUrl.searchParams.get('author') || '';

  if (!title) return NextResponse.json({ coverUrl: null });

  const cleanTitle = title.replace(/[《》""「」]/g, '');
  const englishTitle = KNOWN_TRANSLATIONS[cleanTitle];

  // All searches fire in parallel — first valid result wins
  const searches: Promise<string | null>[] = [];

  // Douban: best for Chinese books (try Chinese title, and with author)
  searches.push(searchDouban(cleanTitle, cleanTitle, englishTitle));
  if (author) searches.push(searchDouban(`${cleanTitle} ${author}`, cleanTitle, englishTitle));

  // Bookcover API (Goodreads): try English title if available, then original
  if (englishTitle) {
    searches.push(searchBookcoverAPI(englishTitle, author));
  }
  searches.push(searchBookcoverAPI(cleanTitle, author));

  // Google Books: try English, title+author, title alone
  if (englishTitle) searches.push(searchGoogleBooks(englishTitle, cleanTitle, englishTitle));
  if (author) searches.push(searchGoogleBooks(`${cleanTitle} ${author}`, cleanTitle, englishTitle));
  searches.push(searchGoogleBooks(cleanTitle, cleanTitle, englishTitle));

  // Open Library: try English, title+author, title alone
  if (englishTitle) searches.push(searchOpenLibrary(englishTitle, cleanTitle, englishTitle));
  if (author) searches.push(searchOpenLibrary(`${cleanTitle} ${author}`, cleanTitle, englishTitle));
  searches.push(searchOpenLibrary(cleanTitle, cleanTitle, englishTitle));

  const cover = await raceForResult(searches);
  return NextResponse.json({ coverUrl: cover });
}
