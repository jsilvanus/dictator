'use client';

import { useCallback, useEffect, useState } from 'react';

type ShareEntry = {
  id: string;
  permission: 'read' | 'edit';
  email: string | null;
  name: string | null;
};

export function ShareModal({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<'invite' | 'link' | 'people'>('invite');
  const [permission, setPermission] = useState<'read' | 'edit'>('edit');
  const [email, setEmail] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    const response = await fetch(`/api/documents/${documentId}/share`);
    if (response.ok) {
      setShares((await response.json()) as ShareEntry[]);
    }
  }, [documentId]);

  useEffect(() => {
    void loadShares();
  }, [loadShares]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgb(0 0 0 / 40%)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 30,
      }}
    >
      <div className="panel" style={{ width: 'min(680px, 100%)' }}>
        <div className="topbar">
          <strong>Share document</strong>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setPanel('invite')}>
            Invite
          </button>
          <button type="button" onClick={() => setPanel('link')}>
            Copy link
          </button>
          <button type="button" onClick={() => setPanel('people')}>
            People with access
          </button>
        </div>

        {panel === 'invite' ? (
          <form
            style={{ display: 'grid', gap: 8 }}
            onSubmit={async (event) => {
              event.preventDefault();
              setInviteError(null);
              const response = await fetch(`/api/documents/${documentId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, permission }),
              });
              if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                setInviteError(data.error ?? 'Failed to send invite');
                return;
              }
              setEmail('');
              await loadShares();
            }}
          >
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
            <select value={permission} onChange={(event) => setPermission(event.target.value as 'read' | 'edit')}>
              <option value="edit">Can edit</option>
              <option value="read">Can view</option>
            </select>
            <button type="submit">Send invite</button>
            {inviteError ? <p style={{ margin: 0, color: 'var(--error, #dc2626)' }}>{inviteError}</p> : null}
          </form>
        ) : null}

        {panel === 'link' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            <select value={permission} onChange={(event) => setPermission(event.target.value as 'read' | 'edit')}>
              <option value="edit">Can edit</option>
              <option value="read">Can view</option>
            </select>
            <button
              type="button"
              onClick={async () => {
                const response = await fetch('/api/shares/link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ documentId, permission }),
                });
                if (!response.ok) {
                  return;
                }
                const data = (await response.json()) as { url: string };
                setTokenUrl(data.url);
                await navigator.clipboard.writeText(data.url);
              }}
            >
              Create and copy link
            </button>
            {tokenUrl ? <code>{tokenUrl}</code> : null}
          </div>
        ) : null}

        {panel === 'people' ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {shares.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>
                  {entry.name ?? entry.email} · {entry.permission}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/documents/${documentId}/share?shareId=${entry.id}`, {
                      method: 'DELETE',
                    });
                    await loadShares();
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
