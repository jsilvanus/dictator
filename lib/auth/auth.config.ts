/**
 * NextAuth Configuration
 * 
 * Provides authOptions for use with getServerSession
 */

import { auth } from '@/auth';
import type { NextAuthOptions } from 'next-auth';

/**
 * NextAuth configuration options
 * Can be used with getServerSession in API routes
 */
export const authOptions: NextAuthOptions = {
  // Auth handlers are configured in /auth.ts
  // This re-exports for backward compatibility with getServerSession pattern
  providers: [],
  session: {
    strategy: 'jwt',
  },
};
