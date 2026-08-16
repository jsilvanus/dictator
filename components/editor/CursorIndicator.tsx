/**
 * Cursor Indicator Component
 * Displays the current cursor position and selection state
 */

'use client';

import { useCursorState } from '@/components/providers/CursorProvider';
import type { CursorSize } from '@/lib/types/cursor';

const CURSOR_SIZE_LABELS: Record<CursorSize, { full: string; short: string }> = {
  paragraph: { full: 'Paragraph', short: '¶' },
  word: { full: 'Word', short: 'W' },
  character: { full: 'Character', short: 'C' },
};

export function CursorIndicator({ docText }: { docText: string }) {
  const cursor = useCursorState();
  const { current, selection, lastAction } = cursor.cursorState;
  const size = current.size;
  const sizeLabel = CURSOR_SIZE_LABELS[size];

  // Calculate position feedback
  let positionText = '';
  if (selection?.isActive) {
    const selectedLength = Math.abs(selection.endPos.endChar - selection.startPos.startChar);
    let count = 1;
    if (size === 'paragraph' && selectedLength > 0) {
      count = (docText.substring(selection.startPos.startChar, selection.endPos.endChar).match(/\n\n/g) || []).length + 1;
    }
    positionText = `${count} ${size}${count > 1 ? 's' : ''} selected`;
  } else {
    positionText = `Position: ${current.startChar}-${current.endChar}`;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: 'var(--surface-alt, #f5f5f5)',
        borderRadius: '4px',
        fontSize: '0.875rem',
        color: 'var(--text-secondary, #666)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 500 }}>Cursor:</span>
        <span
          title={sizeLabel.full}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            backgroundColor:
              size === 'paragraph' ? 'var(--blue, #3b82f6)' : size === 'word' ? 'var(--teal, #0d9488)' : 'var(--purple, #8b5cf6)',
            color: 'white',
            borderRadius: '3px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {sizeLabel.short}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{positionText}</span>
        {selection?.isActive && (
          <span
            title="Selection active"
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--teal, #0d9488)',
            }}
          />
        )}
      </div>

      {lastAction === 'select' && (
        <span style={{ fontSize: '0.75rem', color: 'var(--muted, #999)', fontStyle: 'italic' }}>
          Selection mode
        </span>
      )}
    </div>
  );
}
