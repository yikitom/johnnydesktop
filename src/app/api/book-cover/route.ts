import { NextRequest, NextResponse } from 'next/server';

// Search Google Books API for book cover images
// Try both original title and common English translations

const KNOWN_TRANSLATIONS: Record<string, string> = {
  '思考快与慢': 'Thinking Fast and Slow',
  '思考，快与慢': 'Thinking Fast and Slow',
  '乡土中国': 'From the Soil',
  '人类简史': 'Sapiens',
  '未来简史': 'Homo Deus',
  '三体': 'The Three Body Problem',
  '活着': 'To Live Yu Hua',
  '百年孤独': 'One Hundred Years of Solitude',
  '小王子': 'The Little Prince',
  '追风筝的人': 'The Kite Runner',
  '1984': '1984 George Orwell',
  '围城': 'Fortress Besieged',
  '红楼梦': 'Dream of the Red Chamber',
  '西游记': 'Journey to the West',
};

async function searchGoogleBooks(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const item of data.items || []) {
      const links = item.volumeInfo?.imageLinks;
      const url = links?.thumbnail || links?.smallThumbnail;
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

  // Clean title (remove 《》)
  const cleanTitle = title.replace(/[《》""「」]/g, '');

  // Try 1: Original title + author
  let cover = await searchGoogleBooks(`${cleanTitle} ${author}`);
  if (cover) return NextResponse.json({ coverUrl: cover });

  // Try 2: Known English translation
  const englishTitle = KNOWN_TRANSLATIONS[cleanTitle];
  if (englishTitle) {
    cover = await searchGoogleBooks(englishTitle);
    if (cover) return NextResponse.json({ coverUrl: cover });
  }

  // Try 3: Title only (broader search)
  cover = await searchGoogleBooks(cleanTitle);
  if (cover) return NextResponse.json({ coverUrl: cover });

  // Try 4: intitle search
  cover = await searchGoogleBooks(`intitle:${cleanTitle}`);
  if (cover) return NextResponse.json({ coverUrl: cover });

  return NextResponse.json({ coverUrl: null });
}
