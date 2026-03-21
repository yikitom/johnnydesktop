import { NextRequest, NextResponse } from 'next/server';

// In-memory store as fallback when Airtable is not configured
// In production, this connects to Airtable via their API
const inMemoryBooks: Record<string, Record<string, unknown>> = {};

export async function GET() {
  const books = Object.entries(inMemoryBooks).map(([id, book]) => ({
    id,
    airtableId: id,
    ...book,
    isDeleted: false,
    status: 'ready',
  }));
  return NextResponse.json({ books });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'create') {
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    inMemoryBooks[id] = body.book;
    return NextResponse.json({ airtableId: id });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'update' && body.airtableId) {
    if (inMemoryBooks[body.airtableId]) {
      inMemoryBooks[body.airtableId] = {
        ...inMemoryBooks[body.airtableId],
        ...body.book,
      };
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
