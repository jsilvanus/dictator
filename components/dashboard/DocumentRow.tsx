import Link from 'next/link';

export function DocumentRow({
  id,
  title,
  updatedAt,
  wordCount,
  onShare,
}: {
  id: string;
  title: string;
  updatedAt: string | Date;
  wordCount: number;
  onShare?: (id: string) => void;
}) {
  return (
    <div className="doc-row">
      <Link href={`/document/${id}`} style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {new Date(updatedAt).toLocaleString()} · {wordCount} words
        </div>
      </Link>
      <button type="button" onClick={() => onShare?.(id)} aria-label="Share document">
        Share
      </button>
    </div>
  );
}
