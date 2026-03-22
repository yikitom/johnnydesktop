import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appFONUS3XPyW56Ue';
const AIRTABLE_TABLE_NAME = 'jd_books';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';

const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

function headers() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// In-memory fallback when Airtable API key is not configured
const inMemoryBooks: Record<string, Record<string, unknown>> = {};

function useInMemory() {
  return !AIRTABLE_API_KEY;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');

  if (useInMemory()) {
    if (id) {
      const book = inMemoryBooks[id];
      if (!book) return NextResponse.json({ book: null });
      return NextResponse.json({ book: { id, airtableId: id, ...book, isDeleted: !!book.isDeleted, status: book.status || 'ready' } });
    }
    const books = Object.entries(inMemoryBooks).map(([recId, book]) => ({
      id: recId,
      airtableId: recId,
      ...book,
      isDeleted: !!book.isDeleted,
      status: book.status || 'ready',
    }));
    return NextResponse.json({ books });
  }

  try {
    if (id) {
      const res = await fetch(`${airtableUrl}/${id}`, { headers: headers() });
      if (!res.ok) return NextResponse.json({ book: null });
      const data = await res.json();
      const fields = data.fields;
      return NextResponse.json({
        book: {
          id: data.id,
          airtableId: data.id,
          title: fields.title || '',
          author: fields.author || '',
          category: fields.category || '',
          summary: fields.summary || '',
          content: fields.content || '',
          oneSentenceSummary: fields.oneSentenceSummary || '',
          htmlContent: fields.htmlContent || '',
          status: fields.status || 'ready',
          createdAt: fields.createdAt || '',
          updatedAt: fields.updatedAt || '',
          isDeleted: !!fields.isDeleted,
        },
      });
    }

    // List all records
    const res = await fetch(`${airtableUrl}?sort%5B0%5D%5Bfield%5D=createdAt&sort%5B0%5D%5Bdirection%5D=desc`, {
      headers: headers(),
    });
    const data = await res.json();
    const books = (data.records || []).map((rec: { id: string; fields: Record<string, unknown> }) => ({
      id: rec.id,
      airtableId: rec.id,
      title: rec.fields.title || '',
      author: rec.fields.author || '',
      category: rec.fields.category || '',
      summary: rec.fields.summary || '',
      content: rec.fields.content || '',
      oneSentenceSummary: rec.fields.oneSentenceSummary || '',
      htmlContent: rec.fields.htmlContent || '',
      status: rec.fields.status || 'ready',
      createdAt: rec.fields.createdAt || '',
      updatedAt: rec.fields.updatedAt || '',
      isDeleted: !!rec.fields.isDeleted,
    }));
    return NextResponse.json({ books });
  } catch (e) {
    console.error('Airtable GET error:', e);
    return NextResponse.json({ books: [], error: 'Failed to fetch from Airtable' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action !== 'create') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (useInMemory()) {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    inMemoryBooks[id] = body.book;
    return NextResponse.json({ airtableId: id });
  }

  try {
    const fields: Record<string, unknown> = {
      title: body.book.title,
      author: body.book.author || '',
      category: body.book.category || '',
      oneSentenceSummary: body.book.oneSentenceSummary || '',
      htmlContent: body.book.htmlContent || '',
      status: body.book.status || 'ready',
    };

    if (body.book.createdAt) {
      fields.createdAt = body.book.createdAt;
    }
    if (body.book.updatedAt) {
      fields.updatedAt = body.book.updatedAt;
    }

    const res = await fetch(airtableUrl, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ records: [{ fields }] }),
    });

    const data = await res.json();
    const airtableId = data.records?.[0]?.id;
    return NextResponse.json({ airtableId });
  } catch (e) {
    console.error('Airtable POST error:', e);
    return NextResponse.json({ error: 'Failed to save to Airtable' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (body.action !== 'update' || !body.airtableId) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (useInMemory()) {
    if (inMemoryBooks[body.airtableId]) {
      inMemoryBooks[body.airtableId] = {
        ...inMemoryBooks[body.airtableId],
        ...body.book,
      };
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // Only send fields that exist in the Airtable table schema
    const allowedFields = ['title', 'author', 'category', 'oneSentenceSummary', 'htmlContent', 'status', 'isDeleted', 'createdAt', 'updatedAt'];
    const fields: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body.book && body.book[key] !== undefined) {
        fields[key] = body.book[key];
      }
    }

    const res = await fetch(`${airtableUrl}/${body.airtableId}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Airtable PATCH error:', res.status, errBody);
      return NextResponse.json({ error: `Failed to update: ${errBody.slice(0, 200)}` }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Airtable PUT error:', e);
    return NextResponse.json({ error: 'Failed to update Airtable' }, { status: 500 });
  }
}
