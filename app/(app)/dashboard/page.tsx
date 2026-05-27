import { and, count, desc, eq, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { AppTopbar } from '@/components/shared/AppTopbar';
import { db } from '@/lib/db';
import { documents, folders, shares } from '@/lib/db/schema';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const docs = await db
    .select({
      id: documents.id,
      title: documents.title,
      wordCount: documents.wordCount,
      updatedAt: documents.updatedAt,
      folderId: documents.folderId,
      ownerId: documents.ownerId,
      sharedBy: shares.sharedBy,
    })
    .from(documents)
    .leftJoin(shares, and(eq(shares.documentId, documents.id), eq(shares.sharedWith, session.user.id)))
    .where(or(eq(documents.ownerId, session.user.id), eq(shares.sharedWith, session.user.id)))
    .orderBy(desc(documents.updatedAt));

  const folderRows = await db
    .select({
      id: folders.id,
      name: folders.name,
      documentCount: count(documents.id),
    })
    .from(folders)
    .leftJoin(documents, eq(documents.folderId, folders.id))
    .where(eq(folders.ownerId, session.user.id))
    .groupBy(folders.id);

  return (
    <main className="page-shell">
      <AppTopbar title="Dashboard" />
      <DashboardClient documents={docs.map((doc) => ({ ...doc, updatedAt: doc.updatedAt.toISOString() }))} folders={folderRows} />
    </main>
  );
}
