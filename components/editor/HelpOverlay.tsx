'use client';

import { helpCategories, helpEntries, type HelpCategory } from '@/lib/voice/help';

export function HelpOverlay({
  open,
  category,
  commandTrigger,
  aiTrigger,
  hasOverride,
  onClose,
}: {
  open: boolean;
  category: HelpCategory | null;
  commandTrigger: string;
  aiTrigger: string;
  hasOverride: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const categories = category ? [category] : helpCategories;

  return (
    <section className="panel" style={{ marginTop: 8, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <strong>Voice command help</strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, padding: '1rem', maxHeight: 480, overflow: 'auto' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          {categories.map((group) => (
            <article key={group}>
              <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{group}</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {helpEntries[group].map((entry) => (
                  <div key={`${group}-${entry.command}`} className="panel" style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>{entry.command}</div>
                    <div style={{ color: 'var(--muted)' }}>{entry.description}</div>
                    <div style={{ fontStyle: 'italic', color: 'var(--muted)' }}>{entry.example}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <aside className="panel" style={{ height: 'fit-content' }}>
          <h3 style={{ marginTop: 0 }}>Quick reference</h3>
          <p>
            Command trigger: <strong>{commandTrigger}</strong>
          </p>
          <p>
            AI trigger: <strong>{aiTrigger}</strong>
          </p>
          <p>Session override: {hasOverride ? 'Active' : 'Not active'}</p>
          <p>Keyboard: Cmd+/ (Ctrl+/)</p>
        </aside>
      </div>
    </section>
  );
}
