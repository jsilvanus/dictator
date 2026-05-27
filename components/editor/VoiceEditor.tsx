'use client';

import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';
import { type AiSession } from '@/lib/ai/session';
import { fontSizePx } from '@/lib/data/default-settings';
import { type HelpCategory } from '@/lib/voice/help';

import { AiHighlight } from './AiHighlight';
import { FontSizeControls } from './FontSizeControls';
import { HelpOverlay } from './HelpOverlay';
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
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<'Saved' | 'Saving…' | 'Unsaved'>('Saved');
  const [saveCount, setSaveCount] = useState(0);
  const [lastDictatedRange, setLastDictatedRange] = useState<{ from: number; to: number } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpCategory, setHelpCategory] = useState<HelpCategory | null>(null);
  const [activeCommandTrigger, setActiveCommandTrigger] = useState(settings.commandTrigger);
  const [hasTriggerOverride, setHasTriggerOverride] = useState(false);
  const inlineAiSessionRef = useRef<AiSession>({ turns: [], currentDocVersion: 0 });

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Start dictating...' }), CharacterCount, Underline, AiHighlight],
    content: initialContent,
    onUpdate: () => {
      inlineAiSessionRef.current.currentDocVersion += 1;
      setStatus('Unsaved');
    },
  });

  const saveNow = useCallback(async () => {
    if (!editor) {
      return;
    }

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
  }, [documentId, editor, saveCount, title]);

  useEffect(() => {
    if (!editor || status !== 'Unsaved') {
      return;
    }

    const timeout = setTimeout(() => {
      void saveNow();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [editor, saveNow, status]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    document.documentElement.style.setProperty('--vd-font-size', `${fontSizePx[settings.viewFontSize]}px`);

    const keyboardHandler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setHelpOpen((prev) => !prev);
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
        <button
          type="button"
          aria-label="Open command help"
          onClick={() => {
            setHelpCategory(null);
            setHelpOpen((prev) => !prev);
          }}
        >
          ?
        </button>
        <FontSizeControls />
        <span className="badge">{status}</span>
      </div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="panel" />
      <div style={{ marginTop: 8, color: 'var(--muted)' }}>Words: {wordCount}</div>
      <VoiceDock
        editor={editor}
        title={title}
        settingsLanguage={settings.language}
        inlineAiSession={inlineAiSessionRef.current}
        lastDictatedRange={lastDictatedRange}
        onLastDictatedRange={setLastDictatedRange}
        onSaveNow={saveNow}
        onCreateDocument={async () => {
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
        onSetTitle={(nextTitle) => {
          setTitle(nextTitle);
          setStatus('Unsaved');
        }}
        onOpenHelp={(category) => {
          setHelpCategory(category ?? null);
          setHelpOpen(true);
        }}
        onActiveTriggerInfo={(trigger, hasOverride) => {
          setActiveCommandTrigger(trigger);
          setHasTriggerOverride(hasOverride);
        }}
      />
      <HelpOverlay
        open={helpOpen}
        category={helpCategory}
        commandTrigger={activeCommandTrigger}
        aiTrigger={settings.aiTrigger}
        hasOverride={hasTriggerOverride}
        onClose={() => setHelpOpen(false)}
      />
      {lastDictatedRange ? (
        <div style={{ marginTop: 8, color: 'var(--muted)' }}>
          Last dictated range: {lastDictatedRange.from}-{lastDictatedRange.to}
        </div>
      ) : null}
    </div>
  );
}
