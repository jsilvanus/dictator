import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { users } from '@/lib/db/schema';

type AuthRow = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  passwordHash: string;
  deactivatedAt: Date | null;
};

type AuthDeps = {
  findByEmail: (email: string) => Promise<AuthRow | null>;
};

const defaultDeps: AuthDeps = {
  async findByEmail(email: string) {
    const { db } = await import('@/lib/db');
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        passwordHash: users.passwordHash,
        deactivatedAt: users.deactivatedAt,
      })
      .from(users)
      .where(eq(users.email, email));
    return user ?? null;
  },
};

export async function authenticateCredentials(email: string, password: string, deps: AuthDeps = defaultDeps) {
  const user = await deps.findByEmail(email);

  if (!user || user.deactivatedAt) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
