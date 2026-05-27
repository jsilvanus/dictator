'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { clearAiHighlight, setAiHighlight } from '@/components/editor/AiHighlight';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { type AiResponse } from '@/lib/ai/prompts';
import { type AiSession,markAccepted, markDiscarded, recordTurn } from '@/lib/ai/session';
import { genId, speakText } from '@/lib/utils/tts-id';
import { executeCommand, parseTriggers } from '@/lib/voice/commands';
import { helpCategories, type HelpCategory } from '@/lib/voice/help';
import { normalizeSpokenPunctuation } from '@/lib/voice/punctuation';

import { TriggerChip } from './TriggerChip';

type PendingAiChange =
  | {
      type: 'insert' | 'replace';
      turnId: string;
      from: number;
      to: number;
      beforeContent: string;
      afterContent: string;
    }
  | {
      type: 'set_title';
      turnId: string;
      beforeTitle: string;
      afterTitle: string;
    };

function getSelectionText(editor: Editor) {
  const { from, to } = editor.state.selection;
  if (from === to) {
    return '';
  }
  return editor.state.doc.textBetween(from, to, '\n', '\n');
}

function getParagraphContext(editor: Editor) {
  const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n');
  const paragraphs = text.split('\n').filter((entry) => entry.trim().length > 0);
  const cursor = editor.state.selection.$from.parent.textContent;
  const index = paragraphs.findIndex((entry) => entry === cursor);
  const before = index <= 0 ? paragraphs.slice(0, 2) : paragraphs.slice(Math.max(0, index - 2), index);

  return {
    cursorParagraph: cursor,
    precedingParagraphs: before,
  };
}

export function VoiceDock({
  editor,
  title,
  settingsLanguage,
  inlineAiSession,
  lastDictatedRange,
  onLastDictatedRange,
  onSaveNow,
  onCreateDocument,
  onSetTitle,
  onOpenHelp,
  onActiveTriggerInfo,
  aiPanelOpen,
  onToggleAiPanel,
  onAiPanelMessage,
}: {
  editor: Editor | null;
  title: string;
  settingsLanguage: string;
  inlineAiSession: AiSession;
  lastDictatedRange: { from: number; to: number } | null;
  onLastDictatedRange: (range: { from: number; to: number } | null) => void;
  onSaveNow: () => Promise<void>;
  onCreateDocument: () => Promise<void>;
  onSetTitle: (title: string) => void;
  onOpenHelp: (category?: HelpCategory) => void;
  onActiveTriggerInfo: (activeTrigger: string, hasOverride: boolean) => void;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
  onAiPanelMessage: (content: string) => void;
}) {
  const { settings, patchSettings } = useSettings();
  const [status, setStatus] = useState('Idle');
  const [temporaryTrigger, setTemporaryTrigger] = useState<string | null>(null);
  const [clearDocumentConfirmUntil, setClearDocumentConfirmUntil] = useState<number | null>(null);
  const [pendingAiChange, setPendingAiChange] = useState<PendingAiChange | null>(null);
  const [commandDetected, setCommandDetected] = useState(false);
  const [runningCommand, setRunningCommand] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const clearHighlightTimeoutRef = useRef<number | null>(null);
  const pendingAiChangeRef = useRef<PendingAiChange | null>(null);

  const activeCommandTrigger = temporaryTrigger ?? settings.commandTrigger;

  useEffect(() => {
    onActiveTriggerInfo(activeCommandTrigger, temporaryTrigger !== null);
  }, [activeCommandTrigger, onActiveTriggerInfo, temporaryTrigger]);

  useEffect(() => {
    const stored = sessionStorage.getItem('temporary-command-trigger');
    if (stored) {
      setTemporaryTrigger(stored);
    }
  }, []);

  useEffect(() => {
    if (temporaryTrigger) {
      sessionStorage.setItem('temporary-command-trigger', temporaryTrigger);
      return;
    }

    sessionStorage.removeItem('temporary-command-trigger');
  }, [temporaryTrigger]);

  useEffect(() => {
    pendingAiChangeRef.current = pendingAiChange;
  }, [pendingAiChange]);

  const stageHighlight = (from: number, to: number) => {
    if (!editor) {
      return;
    }

    setAiHighlight(editor, from, to);

    if (clearHighlightTimeoutRef.current) {
      window.clearTimeout(clearHighlightTimeoutRef.current);
    }

    clearHighlightTimeoutRef.current = window.setTimeout(() => {
      if (!pendingAiChangeRef.current) {
        clearAiHighlight(editor);
      }
    }, 4000);
  };

  const executeAiInline = async (content: string) => {
    if (!editor) {
      return;
    }

    setAiThinking(true);
    setStatus('AI thinking…');

    try {
      const paragraphContext = getParagraphContext(editor);
      const response = await fetch('/api/ai/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: content,
          snapshot: {
            title,
            language: settingsLanguage,
            wordCount: editor.storage.characterCount.words(),
            text: editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n'),
            selection: getSelectionText(editor),
            cursorParagraph: paragraphContext.cursorParagraph,
            precedingParagraphs: paragraphContext.precedingParagraphs,
          },
          session: inlineAiSession,
        }),
      });

      if (!response.ok) {
        setStatus('AI request failed.');
        return;
      }

      const parsed = (await response.json()) as AiResponse;
      const turnId = genId();
      const action = parsed.action;

      if (action.type === 'insert_at_cursor') {
        const from = editor.state.selection.from;
        editor.chain().focus().insertContent(action.content).run();
        const to = editor.state.selection.from;

        if (action.requiresConfirm) {
          stageHighlight(from, to);
          setPendingAiChange({ type: 'insert', turnId, from, to, beforeContent: '', afterContent: action.content });
          inlineAiSession.turns.push({
            id: turnId,
            request: content,
            beforeContent: '',
            afterContent: action.content,
            docVersion: inlineAiSession.currentDocVersion,
            createdAt: Date.now(),
            acceptedAt: null,
            discardedAt: null,
          });
        } else {
          recordTurn(inlineAiSession, {
            id: turnId,
            request: content,
            beforeContent: '',
            afterContent: action.content,
            docVersion: inlineAiSession.currentDocVersion,
          });
        }
      }

      if (action.type === 'replace_selection') {
        const { from, to } = editor.state.selection;
        const beforeContent = editor.state.doc.textBetween(from, to, '\n', '\n');
        editor.chain().focus().insertContent(action.content).run();
        const nextTo = from + action.content.length;
        stageHighlight(from, nextTo);
        setPendingAiChange({
          type: 'replace',
          turnId,
          from,
          to: nextTo,
          beforeContent,
          afterContent: action.content,
        });
        inlineAiSession.turns.push({
          id: turnId,
          request: content,
          beforeContent,
          afterContent: action.content,
          docVersion: inlineAiSession.currentDocVersion,
          createdAt: Date.now(),
          acceptedAt: null,
          discardedAt: null,
        });
      }

      if (action.type === 'set_title') {
        setPendingAiChange({ type: 'set_title', turnId, beforeTitle: title, afterTitle: action.title });
        inlineAiSession.turns.push({
          id: turnId,
          request: content,
          beforeContent: title,
          afterContent: action.title,
          docVersion: inlineAiSession.currentDocVersion,
          createdAt: Date.now(),
          acceptedAt: null,
          discardedAt: null,
        });
      }

      if (action.type === 'speak') {
        speakText(action.speech, settings.ttsVoice);
        recordTurn(inlineAiSession, {
          id: turnId,
          request: content,
          beforeContent: '',
          afterContent: action.speech,
          docVersion: inlineAiSession.currentDocVersion,
        });
      }

      if (parsed.speech && settings.ttsEnabled) {
        speakText(parsed.speech, settings.ttsVoice);
      }

      setStatus(parsed.explanation);
      window.setTimeout(() => setStatus('Idle'), 5000);
    } catch {
      setStatus('AI request failed.');
    } finally {
      setAiThinking(false);
    }
  };

  const speech = useSpeechRecognition({
    language: settings.language,
    commandTrigger: activeCommandTrigger,
    aiTrigger: settings.aiTrigger,
    onInterim: () => setStatus('Listening…'),
    onFinal: (rawText) => {
      if (!editor) {
        return;
      }

      const normalized = normalizeSpokenPunctuation(rawText);
      const segments = parseTriggers(normalized, activeCommandTrigger, settings.aiTrigger);
      let handledText = false;

      if (segments.some((segment) => segment.type === 'command')) {
        setCommandDetected(true);
        window.setTimeout(() => setCommandDetected(false), 800);
      }

      for (const segment of segments) {
        if (segment.type === 'text') {
          // When AI panel is open, route dictation to panel instead of editor
          if (aiPanelOpen) {
            onAiPanelMessage(segment.content);
            handledText = true;
            continue;
          }

          const lower = segment.content.toLowerCase().trim();

          if (lower.includes('new paragraph')) {
            editor.chain().focus().splitBlock().run();
            handledText = true;
            continue;
          }

          if (lower.includes('new line')) {
            editor.chain().focus().insertContent('\n').run();
            handledText = true;
            continue;
          }

          const from = editor.state.selection.from;
          editor.chain().focus().insertContent(segment.content).run();
          const to = editor.state.selection.from;
          onLastDictatedRange({ from, to });
          handledText = true;
          continue;
        }

        if (segment.type === 'command') {
          setRunningCommand(true);
          const matched = executeCommand(segment.content, editor, inlineAiSession, {
            lastDictatedRange,
            setStatus,
            onSave: onSaveNow,
            onCreateDocument,
            onSetTitle,
            onPrint: () => window.print(),
            onMicStop: () => speech.stop(),
            onMicPause: () => speech.pause(),
            onMicResume: () => speech.resume(),
            onOpenHelp: (category) => {
              if (!category) {
                if (settings.ttsEnabled) {
                  speakText(`Help categories: ${helpCategories.join(', ')}`, settings.ttsVoice);
                }
                onOpenHelp();
                return;
              }

              onOpenHelp(category as HelpCategory);
            },
            onTemporaryTriggerChange: setTemporaryTrigger,
            onSpeak: (spoken) => {
              if (settings.ttsEnabled) {
                speakText(spoken, settings.ttsVoice);
              }
            },
            clearDocumentConfirmUntil,
            setClearDocumentConfirmUntil,
          });

          if (!matched) {
            setStatus(`Unknown command: ${segment.content}`);
          }

          setRunningCommand(false);
          continue;
        }

        if (segment.type === 'ai') {
          if (aiPanelOpen) {
            onAiPanelMessage(segment.content);
          } else {
            void executeAiInline(segment.content);
          }
        }
      }

      if (handledText) {
        setStatus('Committed final speech.');
      }
    },
    onError: (message) => setStatus(message),
  });

  useEffect(() => {
    return () => {
      speech.stop();
      onLastDictatedRange(null);
      if (editor) {
        clearAiHighlight(editor);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, onLastDictatedRange]);

  const micStyle = useMemo(() => {
    if (runningCommand) {
      return { borderColor: 'var(--amber)', borderWidth: 2 };
    }

    if (speech.paused) {
      return { outline: '2px solid var(--amber)' };
    }

    if (aiThinking) {
      return { background: 'var(--purple)', color: 'white', boxShadow: '0 0 0 8px rgb(127 119 221 / 20%)' };
    }

    if (speech.listening && aiPanelOpen) {
      return { background: 'var(--purple)', color: 'white', boxShadow: '0 0 0 8px rgb(127 119 221 / 15%)' };
    }

    if (speech.listening) {
      return { background: 'var(--teal)', color: 'white', boxShadow: '0 0 0 8px rgb(13 148 136 / 15%)' };
    }

    return {};
  }, [aiPanelOpen, aiThinking, runningCommand, speech.listening, speech.paused]);

  const handleMicClick = () => {
    if (settings.holdToTalk) {
      return;
    }

    if (speech.listening) {
      speech.stop();
      setStatus('Stopped.');
    } else {
      speech.start();
      setStatus('Listening…');
    }
  };

  return (
    <div className="panel" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          style={micStyle}
          onClick={handleMicClick}
          onMouseDown={() => {
            if (settings.holdToTalk) {
              speech.start();
            }
          }}
          onMouseUp={() => {
            if (settings.holdToTalk) {
              speech.stop();
            }
          }}
          onMouseLeave={() => {
            if (settings.holdToTalk && speech.listening) {
              speech.stop();
            }
          }}
        >
          🎙️ Mic
        </button>
        <button
          type="button"
          style={{
            background: aiPanelOpen ? 'var(--purple)' : undefined,
            color: aiPanelOpen ? 'white' : undefined,
            outline: aiPanelOpen ? '2px solid var(--purple)' : undefined,
          }}
          onClick={onToggleAiPanel}
          aria-label="Toggle AI panel"
          aria-pressed={aiPanelOpen}
        >
          ✨ AI
        </button>
        <TriggerChip
          baseTrigger={settings.commandTrigger}
          activeTrigger={activeCommandTrigger}
          aiTrigger={settings.aiTrigger}
          onChange={setTemporaryTrigger}
        />
        <label>
          Language
          <select value={settings.language} onChange={(event) => patchSettings({ language: event.target.value })}>
            <option value="en-US">en-US</option>
            <option value="fi-FI">fi-FI</option>
            <option value="sv-SE">sv-SE</option>
          </select>
        </label>
        {commandDetected ? <span className="badge command-detected-badge">Command mode</span> : null}
      </div>
      <p style={{ marginTop: 8, color: 'var(--muted)', fontStyle: speech.interimText ? 'italic' : 'normal' }}>
        {speech.interimText ? `Interim: ${speech.interimText}` : `Status: ${status}`}
      </p>
      {pendingAiChange ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              if (!editor) {
                return;
              }

              if (pendingAiChange.type === 'set_title') {
                onSetTitle(pendingAiChange.afterTitle);
                markAccepted(inlineAiSession, pendingAiChange.turnId);
                setPendingAiChange(null);
                setStatus('AI title change accepted.');
                return;
              }

              clearAiHighlight(editor);
              markAccepted(inlineAiSession, pendingAiChange.turnId);
              setPendingAiChange(null);
              setStatus('AI change accepted.');
            }}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => {
              if (!editor) {
                return;
              }

              if (pendingAiChange.type === 'set_title') {
                markDiscarded(inlineAiSession, pendingAiChange.turnId);
                onSetTitle(pendingAiChange.beforeTitle);
                setPendingAiChange(null);
                setStatus('AI title change discarded.');
                return;
              }

              editor.chain().focus().deleteRange({ from: pendingAiChange.from, to: pendingAiChange.to }).run();
              if (pendingAiChange.beforeContent) {
                editor.chain().focus().insertContentAt(pendingAiChange.from, pendingAiChange.beforeContent).run();
              }
              clearAiHighlight(editor);
              markDiscarded(inlineAiSession, pendingAiChange.turnId);
              setPendingAiChange(null);
              setStatus('AI change discarded.');
            }}
          >
            Discard
          </button>
        </div>
      ) : null}
    </div>
  );
}
