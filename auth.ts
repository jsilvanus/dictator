import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authenticateCredentials } from '@/lib/auth/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) {
          return null;
        }

        return authenticateCredentials(email, password);
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? '';
        token.role = (user.role ?? 'editor') as 'admin' | 'editor';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'editor';
      }
      return session;
    },
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const publicPaths = ['/login', '/register', '/api/health', '/api/auth'];
      const isPublic = publicPaths.some((path) => pathname.startsWith(path));

      if (isPublic) {
        return true;
      }

      return !!auth;
    },
  },
});
