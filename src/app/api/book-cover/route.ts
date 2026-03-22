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

  // Chinese title match
  if (normResult.includes(normRequested) || normRequested.includes(normResult)) return true;

  // English title match
  if (englishTitle) {
    const normEnglish = normalize(englishTitle);
    if (normResult.includes(normEnglish) || normEnglish.includes(normResult)) return true;
  }

  return false;
}

// Open Library: structured API with title verification
async function searchOpenLibrary(query: string, requestedTitle: string, englishTitle?: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,cover_i`
    );
    if (!res.ok) return null;
    const data = await res.json();

    for (const doc of data.docs || []) {
      if (!doc.cover_i) continue;
      // Verify title matches
      if (!titleMatches(doc.title || '', requestedTitle, englishTitle)) continue;
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }
  } catch { /* skip */ }
  return null;
}

// Google Books: structured API with title verification
async function searchGoogleBooks(query: string, requestedTitle: string, englishTitle?: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
    );
    if (!res.ok) return null;
    const data = await res.json();

    for (const item of data.items || []) {
      const info = item.volumeInfo;
      if (!info?.imageLinks) continue;
      // Verify title matches
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

  // Search queries to try, in order of specificity
  const queries: string[] = [];
  if (englishTitle) queries.push(englishTitle);
  queries.push(`${cleanTitle} ${author}`);
  queries.push(cleanTitle);

  // Try Open Library first (better cover quality)
  for (const q of queries) {
    const cover = await searchOpenLibrary(q, cleanTitle, englishTitle);
    if (cover) return NextResponse.json({ coverUrl: cover });
  }

  // Fallback to Google Books
  for (const q of queries) {
    const cover = await searchGoogleBooks(q, cleanTitle, englishTitle);
    if (cover) return NextResponse.json({ coverUrl: cover });
  }

  // No verified cover found — client shows fallback
  return NextResponse.json({ coverUrl: null });
}
