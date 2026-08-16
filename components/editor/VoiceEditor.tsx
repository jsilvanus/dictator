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
import { fontSizePx, getActivationCommandForLanguage } from '@/lib/data/default-settings';
import { type HelpCategory } from '@/lib/voice/help';

import { AiHighlight } from './AiHighlight';
import { AiPanel } from './AiPanel';
import { CursorIndicator } from './CursorIndicator';
import { DocumentAiSettings } from './DocumentAiSettings';
import { FontSizeControls } from './FontSizeControls';
import { HelpOverlay } from './HelpOverlay';
import { LanguageIndicator } from './LanguageIndicator';
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
  const [status, setStatus] = useState<'Saved' | 'Saving…' | 'Unsaved' | 'Error saving'>('Saved');
  const [saveCount, setSaveCount] = useState(0);
  const [lastDictatedRange, setLastDictatedRange] = useState<{ from: number; to: number } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpCategory, setHelpCategory] = useState<HelpCategory | null>(null);
  const [activeCommandTrigger, setActiveCommandTrigger] = useState(settings.commandTrigger);
  const [hasTriggerOverride, setHasTriggerOverride] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [voiceToPanel, setVoiceToPanel] = useState<string | null>(null);
  const [docSettingsOpen, setDocSettingsOpen] = useState(false);
  const inlineAiSessionRef = useRef<AiSession>({ turns: [], currentDocVersion: 0 });

  const languageSpecificAiTrigger = useMemo(
    () => getActivationCommandForLanguage(settings.language, 'ai', settings.activationCommands),
    [settings.language, settings.activationCommands]
  );

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

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: editor.getJSON(),
          wordCount: editor.storage.characterCount.words(),
          saveCount: nextCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Save failed: ${response.statusText}`
        );
      }

      setSaveCount(nextCount);
      setStatus('Saved');
    } catch (error) {
      console.error('Document save error:', error);
      setStatus('Error saving');
      // Optionally show error to user or retry
    }
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
        <button
          type="button"
          aria-label="Document AI settings"
          onClick={() => setDocSettingsOpen(true)}
          title="Document AI settings"
        >
          ⚙
        </button>
        <LanguageIndicator />
        <FontSizeControls />
        <span className="badge">{status}</span>
      </div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="panel" />
      {editor && (
       <CursorIndicator docText={editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n')} />
      )}
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
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((prev) => !prev)}
        onAiPanelMessage={(content) => setVoiceToPanel((prev) => (prev ? `${prev} ${content}` : content))}
      />
      <AiPanel
        open={aiPanelOpen}
        editor={editor}
        documentId={documentId}
        title={title}
        ttsEnabled={settings.ttsEnabled}
        ttsVoice={settings.ttsVoice}
        language={settings.language}
        voiceMessage={voiceToPanel}
        onVoiceMessageHandled={() => setVoiceToPanel(null)}
        onSetTitle={(nextTitle) => {
          setTitle(nextTitle);
          setStatus('Unsaved');
        }}
        onClose={() => setAiPanelOpen(false)}
      />
      <HelpOverlay
        open={helpOpen}
        category={helpCategory}
        commandTrigger={activeCommandTrigger}
        aiTrigger={languageSpecificAiTrigger}
        hasOverride={hasTriggerOverride}
        onClose={() => setHelpOpen(false)}
      />
      {lastDictatedRange ? (
        <div style={{ marginTop: 8, color: 'var(--muted)' }}>
          Last dictated range: {lastDictatedRange.from}-{lastDictatedRange.to}
        </div>
      ) : null}
      {docSettingsOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDocSettingsOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 8,
              padding: 20,
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <DocumentAiSettings
              documentId={documentId}
              onClose={() => setDocSettingsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
