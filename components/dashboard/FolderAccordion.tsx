'use client';

type Folder = {
  id: string;
  name: string;
  documentCount: number;
};

type Doc = {
  id: string;
  title: string;
  updatedAt: string;
  wordCount: number;
  folderId: string | null;
};

export function FolderAccordion({
  folder,
  docs,
  open,
  onToggle,
  onOpenDocument,
}: {
  folder: Folder;
  docs: Doc[];
  open: boolean;
  onToggle: () => void;
  onOpenDocument: (id: string) => void;
}) {
  const expanded = open;

  return (
    <div className="folder-row">
      <button
        type="button"
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={onToggle}
      >
        <span>
          {expanded ? '📂' : '📁'} {folder.name} ({folder.documentCount})
        </span>
        <span style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>
      {expanded ? (
        <div style={{ paddingTop: 8 }}>
          {docs.map((doc) => (
            <button
              type="button"
              key={doc.id}
              style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
              onClick={() => onOpenDocument(doc.id)}
            >
              {doc.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
