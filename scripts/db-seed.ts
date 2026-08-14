import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

// Load local env file so this script works when run directly (not via Next.js)
config({ path: '.env.local' });
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { users } from '@/lib/db/schema';
import { defaultSettings } from '@/lib/data/default-settings';

async function seed() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for db:seed');
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, env.ADMIN_EMAIL));

  if (existing) {
    console.log('Admin already exists. Skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  await db.insert(users).values({
    email: env.ADMIN_EMAIL,
    name: 'Administrator',
    passwordHash,
    role: 'admin',
    settings: defaultSettings,
  });

  console.log('Seeded admin user.');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
