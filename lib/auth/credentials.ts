import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function authenticateCredentials(email: string, password: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

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
