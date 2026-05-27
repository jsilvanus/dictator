'use client';

import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useState } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';
import { fontSizePx } from '@/lib/data/default-settings';

import { FontSizeControls } from './FontSizeControls';
import { Toolbar } from './Toolbar';
import { VoiceDock } from './VoiceDock';

export function VoiceEditor({
  documentId,
  initialContent,
  initialTitle,
}: {
  documentId: string;
  initialContent: Record<string, unknown>;
  initialTitle: string;
}) {
  const { settings } = useSettings();
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<'Saved' | 'Saving…' | 'Unsaved'>('Saved');
  const [saveCount, setSaveCount] = useState(0);
  const [lastDictatedRange, setLastDictatedRange] = useState<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start dictating...' }),
      CharacterCount,
      Underline,
    ],
    content: initialContent,
    onUpdate: () => {
      setStatus('Unsaved');
    },
  });

  useEffect(() => {
    if (!editor || status !== 'Unsaved') {
      return;
    }

    const timeout = setTimeout(async () => {
      setStatus('Saving…');
      const nextCount = saveCount + 1;

      await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: editor.getJSON(),
          wordCount: editor.storage.characterCount.words(),
          saveCount: nextCount,
        }),
      });

      setSaveCount(nextCount);
      setStatus('Saved');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [documentId, editor, saveCount, status, title]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    document.documentElement.style.setProperty('--vd-font-size', `${fontSizePx[settings.viewFontSize]}px`);

    const keyboardHandler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (event.key === '=' || event.key === '-') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', keyboardHandler);

    return () => window.removeEventListener('keydown', keyboardHandler);
  }, [editor, settings.viewFontSize]);

  const wordCount = useMemo(() => editor?.storage.characterCount.words() ?? 0, [editor]);

  return (
    <div className="editor-wrap panel">
      <div className="topbar">
        <input
          aria-label="Document title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setStatus('Unsaved');
          }}
          style={{ fontSize: '1.125rem', fontWeight: 600, width: '100%' }}
        />
        <FontSizeControls />
        <span className="badge">{status}</span>
      </div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="panel" />
      <div style={{ marginTop: 8, color: 'var(--muted)' }}>Words: {wordCount}</div>
      <VoiceDock editor={editor} onLastDictatedRange={setLastDictatedRange} />
      {lastDictatedRange ? (
        <div style={{ marginTop: 8, color: 'var(--muted)' }}>
          Last dictated range: {lastDictatedRange.from}-{lastDictatedRange.to}
        </div>
      ) : null}
    </div>
  );
}
