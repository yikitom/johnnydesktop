import { NextRequest, NextResponse } from 'next/server';

// Airtable config for jd_users table
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appBn4rAsuq14VeDf';
const AIRTABLE_TABLE_NAME = 'jd_users';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';

const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

async function airtableFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Find user by email
async function findUserByEmail(email: string) {
  const filterFormula = `{email} = "${email}"`;
  const res = await airtableFetch(
    `${airtableUrl}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0] || null;
}

// Create or update user on login
export async function POST(req: NextRequest) {
  const { email, name, avatar, googleId, provider } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // If no Airtable API key, store in-memory fallback
  if (!AIRTABLE_API_KEY) {
    console.log('[Auth] Airtable API key not set, user sync skipped:', email);
    return NextResponse.json({ success: true, source: 'skipped' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    const now = new Date().toISOString();

    if (existingUser) {
      // Update existing user's lastLoginAt and any changed fields
      const updateRes = await airtableFetch(
        `${airtableUrl}/${existingUser.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            fields: {
              name: name || existingUser.fields.name,
              avatar: avatar || existingUser.fields.avatar,
              googleId: googleId || existingUser.fields.googleId,
              lastLoginAt: now,
            },
          }),
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.text();
        console.error('Airtable update error:', err);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        userId: existingUser.id,
      });
    } else {
      // Create new user
      const createRes = await airtableFetch(airtableUrl, {
        method: 'POST',
        body: JSON.stringify({
          fields: {
            email,
            name: name || email.split('@')[0],
            avatar: avatar || '',
            googleId: googleId || '',
            provider: provider || 'email',
            lastLoginAt: now,
            createdAt: now,
            status: 'active',
          },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error('Airtable create error:', err);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      const newUser = await createRes.json();
      return NextResponse.json({
        success: true,
        action: 'created',
        userId: newUser.id,
      });
    }
  } catch (e) {
    console.error('User sync error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get current user info from Airtable
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email param required' }, { status: 400 });
  }

  if (!AIRTABLE_API_KEY) {
    return NextResponse.json({ user: null, source: 'no-api-key' });
  }

  try {
    const user = await findUserByEmail(email);
    if (user) {
      return NextResponse.json({
        user: {
          id: user.id,
          ...user.fields,
        },
      });
    }
    return NextResponse.json({ user: null });
  } catch (e) {
    console.error('User fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
