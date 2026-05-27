import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppTopbar } from '@/components/shared/AppTopbar';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [user] = await db.select({ settings: users.settings }).from(users).where(eq(users.id, session.user.id));

  return (
    <main className="page-shell">
      <AppTopbar title="Settings" />
      <SettingsProvider initial={(user?.settings ?? {}) as Record<string, unknown>}>
        <SettingsForm userId={session.user.id} />
      </SettingsProvider>
    </main>
  );
}
