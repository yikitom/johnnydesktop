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
          summary: book.summary,
          content: book.content,
          oneSentenceSummary: book.oneSentenceSummary,
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
): Promise<boolean> {
  try {
    const res = await fetch(AIRTABLE_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', airtableId, book }),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to update Airtable:', e);
    return false;
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
