import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { env } from '@/lib/env';

let hasRun = false;

export async function runMigrations() {
  if (hasRun) {
    return;
  }

  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

  try {
    await migrate(migrationClient, { migrationsFolder: 'drizzle' });
    hasRun = true;
  } finally {
    await migrationClient.end({ timeout: 5 });
  }
}
