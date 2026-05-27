import '@/lib/env';

import { runMigrations } from '@/lib/db/migrate';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await runMigrations();
  }
}
