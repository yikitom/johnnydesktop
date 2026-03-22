import type { Book } from './store';

const AIRTABLE_API_URL = '/api/airtable';

export async function saveBookToAirtable(book: Book): Promise<string | null> {
  try {
    const res = await fetch(AIRTABLE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        book: {
          title: book.title,
          author: book.author,
          category: book.category,
          oneSentenceSummary: book.oneSentenceSummary,
          htmlContent: book.htmlContent || '',
          status: book.status,
          createdAt: book.createdAt,
          updatedAt: book.updatedAt,
        },
      }),
    });
    const data = await res.json();
    return data.airtableId || null;
  } catch (e) {
    console.error('Failed to save to Airtable:', e);
    return null;
  }
}

export async function updateBookInAirtable(
  airtableId: string,
  book: Partial<Book>
): Promise<void> {
  const res = await fetch(AIRTABLE_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', airtableId, book }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '保存到数据库失败');
  }
}

export async function fetchBooksFromAirtable(): Promise<Book[]> {
  try {
    const res = await fetch(AIRTABLE_API_URL);
    const data = await res.json();
    return data.books || [];
  } catch (e) {
    console.error('Failed to fetch from Airtable:', e);
    return [];
  }
}

export async function fetchBookFromAirtable(airtableId: string): Promise<Book | null> {
  try {
    const res = await fetch(`${AIRTABLE_API_URL}?id=${airtableId}`);
    const data = await res.json();
    return data.book || null;
  } catch (e) {
    console.error('Failed to fetch book from Airtable:', e);
    return null;
  }
}
