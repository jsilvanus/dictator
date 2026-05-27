import { and, eq, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { VoiceEditor } from '@/components/editor/VoiceEditor';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { AppTopbar } from '@/components/shared/AppTopbar';
import { db } from '@/lib/db';
import { documents, shares, users } from '@/lib/db/schema';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;

  const [record] = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      settings: users.settings,
    })
    .from(documents)
    .innerJoin(users, eq(users.id, session.user.id))
    .leftJoin(shares, and(eq(shares.documentId, documents.id), eq(shares.sharedWith, session.user.id)))
    .where(and(eq(documents.id, id), or(eq(documents.ownerId, session.user.id), eq(shares.sharedWith, session.user.id))));

  if (!record) {
    redirect('/dashboard');
  }

  return (
    <main className="page-shell">
      <AppTopbar title="Document" />
      <SettingsProvider initial={(record.settings ?? {}) as Record<string, unknown>}>
        <VoiceEditor documentId={id} initialTitle={record.title} initialContent={record.content} />
      </SettingsProvider>
    </main>
  );
}
