import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { env } from '@/lib/env';

let hasRun = false;

export async function runMigrations() {
  if (hasRun) {
    return;
  }

  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  const migrationDb = drizzle(migrationClient);

  try {
    await migrate(migrationDb, { migrationsFolder: 'drizzle' });
    hasRun = true;
  } finally {
    await migrationClient.end({ timeout: 5 });
  }
}
