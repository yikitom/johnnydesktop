import { NextRequest, NextResponse } from 'next/server';

// Known English translations for better search on non-Chinese sources
const KNOWN_TRANSLATIONS: Record<string, { title: string; author?: string }> = {
  '思考快与慢': { title: 'Thinking Fast and Slow', author: 'Daniel Kahneman' },
  '思考，快与慢': { title: 'Thinking Fast and Slow', author: 'Daniel Kahneman' },
  '乡土中国': { title: 'From the Soil', author: 'Fei Xiaotong' },
  '人类简史': { title: 'Sapiens', author: 'Yuval Noah Harari' },
  '未来简史': { title: 'Homo Deus', author: 'Yuval Noah Harari' },
  '三体': { title: 'The Three-Body Problem', author: 'Liu Cixin' },
  '活着': { title: 'To Live', author: 'Yu Hua' },
  '百年孤独': { title: 'One Hundred Years of Solitude', author: 'Gabriel Garcia Marquez' },
  '小王子': { title: 'The Little Prince', author: 'Antoine de Saint-Exupery' },
  '追风筝的人': { title: 'The Kite Runner', author: 'Khaled Hosseini' },
  '1984': { title: '1984', author: 'George Orwell' },
  '围城': { title: 'Fortress Besieged', author: 'Qian Zhongshu' },
  '红楼梦': { title: 'Dream of the Red Chamber', author: 'Cao Xueqin' },
  '西游记': { title: 'Journey to the West', author: 'Wu Cheng en' },
  '脑机接口': { title: 'Brain-Computer Interface' },
  '原则': { title: 'Principles', author: 'Ray Dalio' },
  '理性思辨': { title: 'Critical Thinking' },
  '原子弹的制造': { title: 'The Making of the Atomic Bomb', author: 'Richard Rhodes' },
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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---- Source 1: Bookcover API (Goodreads aggregator) ----
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

// ---- Source 2: Google Books API ----
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

// ---- Source 3: Open Library ----
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
  const translation = KNOWN_TRANSLATIONS[cleanTitle];
  const englishTitle = translation?.title;
  const englishAuthor = translation?.author;

  // All searches fire in parallel — first valid result wins
  const searches: Promise<string | null>[] = [];

  // Bookcover API (Goodreads): try with English title+author first for best results
  if (englishTitle && englishAuthor) {
    searches.push(searchBookcoverAPI(englishTitle, englishAuthor));
  } else if (englishTitle) {
    searches.push(searchBookcoverAPI(englishTitle, author));
  }
  // Also try with original title (works for English books)
  searches.push(searchBookcoverAPI(cleanTitle, author));

  // Google Books: try English, title+author, title alone
  if (englishTitle) searches.push(searchGoogleBooks(englishTitle, cleanTitle, englishTitle));
  if (author) searches.push(searchGoogleBooks(`${cleanTitle} ${author}`, cleanTitle, englishTitle));
  searches.push(searchGoogleBooks(cleanTitle, cleanTitle, englishTitle));

  // Open Library: try English title (Chinese short titles get rejected by API),
  // then title+author, then title alone
  if (englishTitle) searches.push(searchOpenLibrary(englishTitle, cleanTitle, englishTitle));
  if (author) searches.push(searchOpenLibrary(`${cleanTitle} ${author}`, cleanTitle, englishTitle));
  searches.push(searchOpenLibrary(cleanTitle, cleanTitle, englishTitle));

  const cover = await raceForResult(searches);
  return NextResponse.json({ coverUrl: cover });
}
