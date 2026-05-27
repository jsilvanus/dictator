'use client';

import { FormEvent, useState } from 'react';

export function TriggerChip({
  baseTrigger,
  activeTrigger,
  aiTrigger,
  onChange,
}: {
  baseTrigger: string;
  activeTrigger: string;
  aiTrigger: string;
  onChange: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const overrideActive = activeTrigger !== baseTrigger;

  if (editing && !overrideActive) {
    return (
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          const next = draft.trim();
          if (!next) {
            setEditing(false);
            setDraft('');
            return;
          }

          onChange(next);
          setEditing(false);
          setDraft('');
        }}
      >
        <input
          aria-label="Temporary command trigger"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            setEditing(false);
            setDraft('');
          }}
          placeholder="Set trigger"
          style={{ minHeight: 32, width: 132 }}
        />
      </form>
    );
  }

  return (
    <span
      className={`badge ${overrideActive ? 'trigger-chip-override' : 'trigger-chip-default'}`}
      title={`Command trigger: ${activeTrigger}\nAI trigger: ${aiTrigger}\n${
        overrideActive ? 'Session override active' : 'Click to set session override'
      }`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <button
        type="button"
        style={{
          border: 'none',
          background: 'transparent',
          minHeight: 'auto',
          cursor: overrideActive ? 'default' : 'pointer',
          padding: 0,
        }}
        onClick={() => {
          if (!overrideActive) {
            setEditing(true);
          }
        }}
      >
        {activeTrigger}
      </button>
      {overrideActive ? (
        <button
          type="button"
          aria-label="Reset temporary trigger"
          style={{ border: 'none', background: 'transparent', minHeight: 'auto', cursor: 'pointer', padding: 0 }}
          onClick={() => onChange(null)}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
