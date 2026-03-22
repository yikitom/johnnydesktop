import { NextRequest, NextResponse } from 'next/server';

// Known English titles for better Amazon search results
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
  '脑机接口': 'Brain Computer Interface',
};

// Extract book cover image URL from Amazon search results page
async function searchAmazonCover(query: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query + ' book')}&i=stripbooks`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Match Amazon product image URLs (high-res book covers)
    // Amazon image pattern: https://m.media-amazon.com/images/I/XXXXX.jpg
    const imgRegex = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.-]+\.(?:jpg|png)/g;
    const matches = html.match(imgRegex);
    if (!matches || matches.length === 0) return null;

    // Filter out tiny icons/logos, prefer larger book cover images
    for (const url of matches) {
      // Skip sprite images and very small thumbnails
      if (url.includes('sprite') || url.includes('icon') || url.includes('logo')) continue;
      // Return high-res version by removing size constraints
      return url.replace(/\._[A-Z][A-Z0-9_,]+_\./, '.');
    }

    return matches[0];
  } catch {
    return null;
  }
}

// Fallback: Google Books API
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

  // Clean title
  const cleanTitle = title.replace(/[《》""「」]/g, '');
  const englishTitle = KNOWN_TRANSLATIONS[cleanTitle];

  // Try 1: Amazon with English title (if available)
  if (englishTitle) {
    const cover = await searchAmazonCover(englishTitle);
    if (cover) return NextResponse.json({ coverUrl: cover });
  }

  // Try 2: Amazon with original title + author
  let cover = await searchAmazonCover(`${cleanTitle} ${author}`);
  if (cover) return NextResponse.json({ coverUrl: cover });

  // Try 3: Amazon with title only
  cover = await searchAmazonCover(cleanTitle);
  if (cover) return NextResponse.json({ coverUrl: cover });

  // Try 4: Google Books fallback with title + author
  cover = await searchGoogleBooks(`${cleanTitle} ${author}`);
  if (cover) return NextResponse.json({ coverUrl: cover });

  // Try 5: Google Books with English title
  if (englishTitle) {
    cover = await searchGoogleBooks(englishTitle);
    if (cover) return NextResponse.json({ coverUrl: cover });
  }

  // No cover found — client will show fallback
  return NextResponse.json({ coverUrl: null });
}
