import NextAuth from 'next-auth';
import type { Provider } from 'next-auth/providers';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

const providers: Provider[] = [
  Credentials({
    name: 'Email',
    credentials: {
      email: { label: '邮箱', type: 'email' },
      password: { label: '密码', type: 'password' },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      const password = credentials?.password as string;
      if (email && password) {
        return {
          id: email,
          email,
          name: email.split('@')[0],
        };
      }
      return null;
    },
  }),
];

// Only add Google provider if credentials are configured
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      // Sync user to Airtable via direct API call (not self-fetch)
      const apiKey = process.env.AIRTABLE_API_KEY;
      const baseId = process.env.AIRTABLE_BASE_ID || 'appBn4rAsuq14VeDf';
      if (apiKey && user.email) {
        try {
          const airtableUrl = `https://api.airtable.com/v0/${baseId}/jd_users`;
          const headers = {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          };

          // Check if user exists
          const filterFormula = `{email} = "${user.email}"`;
          const findRes = await fetch(
            `${airtableUrl}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`,
            { headers }
          );
          const findData = await findRes.json();
          const existing = findData.records?.[0];
          const now = new Date().toISOString();

          if (existing) {
            // Update lastLoginAt
            await fetch(`${airtableUrl}/${existing.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                fields: {
                  name: user.name || existing.fields.name,
                  avatar: user.image || existing.fields.avatar,
                  googleId: account?.providerAccountId || existing.fields.googleId,
                  lastLoginAt: now,
                },
              }),
            });
          } else {
            // Create new user
            await fetch(airtableUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                fields: {
                  email: user.email,
                  name: user.name || user.email.split('@')[0],
                  avatar: user.image || '',
                  googleId: account?.providerAccountId || '',
                  provider: account?.provider || 'email',
                  lastLoginAt: now,
                  createdAt: now,
                  status: 'active',
                },
              }),
            });
          }
        } catch (e) {
          console.error('Failed to sync user to Airtable:', e);
          // Don't block login if Airtable sync fails
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.picture) {
        session.user.image = token.picture;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
