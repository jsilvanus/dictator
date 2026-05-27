'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { DocumentRow } from '@/components/dashboard/DocumentRow';
import { FolderAccordion } from '@/components/dashboard/FolderAccordion';
import { ShareModal } from '@/components/shared/ShareModal';

type DocumentRecord = {
  id: string;
  title: string;
  wordCount: number;
  updatedAt: string;
  folderId: string | null;
  ownerId: string;
  sharedBy: string | null;
};

type FolderRecord = {
  id: string;
  name: string;
  documentCount: number;
};

export function DashboardClient({
  documents,
  folders,
}: {
  documents: DocumentRecord[];
  folders: FolderRecord[];
}) {
  const router = useRouter();
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [shareDocId, setShareDocId] = useState<string | null>(null);

  const recent = documents.slice(0, 5);
  const sharedWithMe = documents.filter((doc) => doc.sharedBy);
  const unfiled = documents.filter((doc) => !doc.folderId && !doc.sharedBy);

  const docsByFolder = useMemo(() => {
    return folders.reduce<Record<string, DocumentRecord[]>>((acc, folder) => {
      acc[folder.id] = documents.filter((doc) => doc.folderId === folder.id);
      return acc;
    }, {});
  }, [documents, folders]);

  return (
    <>
      <section className="panel" style={{ marginBottom: 16 }}>
        <button
          type="button"
          style={{ width: '100%', minHeight: 72, borderStyle: 'dashed' }}
          onClick={async () => {
            const response = await fetch('/api/documents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            if (!response.ok) {
              return;
            }
            const created = (await response.json()) as { id: string };
            router.push(`/document/${created.id}`);
          }}
        >
          + New document
        </button>
      </section>

      <section>
        <h2>Recent</h2>
        {recent.map((doc) => (
          <DocumentRow key={doc.id} {...doc} onShare={setShareDocId} />
        ))}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>All documents</h2>
        {folders.map((folder) => (
          <FolderAccordion
            key={folder.id}
            folder={folder}
            docs={docsByFolder[folder.id] ?? []}
            open={openFolder === folder.id}
            onToggle={() => setOpenFolder((prev) => (prev === folder.id ? null : folder.id))}
            onOpenDocument={(id) => router.push(`/document/${id}`)}
          />
        ))}
        {unfiled.map((doc) => (
          <DocumentRow key={doc.id} {...doc} onShare={setShareDocId} />
        ))}
        <button
          type="button"
          onClick={async () => {
            const name = window.prompt('Folder name');
            if (!name) {
              return;
            }
            await fetch('/api/folders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            });
            router.refresh();
          }}
        >
          + New folder
        </button>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Shared with me</h2>
        {sharedWithMe.map((doc) => (
          <div key={doc.id} className="doc-row" style={{ borderColor: '#93c5fd' }}>
            <button type="button" style={{ textAlign: 'left', width: '100%' }} onClick={() => router.push(`/document/${doc.id}`)}>
              📄 {doc.title}
            </button>
          </div>
        ))}
      </section>

      {shareDocId ? <ShareModal documentId={shareDocId} onClose={() => setShareDocId(null)} /> : null}
    </>
  );
}
