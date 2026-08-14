'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { clearAiHighlight, setAiHighlight } from '@/components/editor/AiHighlight';
import { SelectionPermissionDialog } from '@/components/editor/SelectionPermissionDialog';
import { useCursorState } from '@/components/providers/CursorProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { type AiResponse } from '@/lib/ai/prompts';
import { type AiSession,markAccepted, markDiscarded, recordTurn } from '@/lib/ai/session';
import { getActivationCommandForLanguage } from '@/lib/data/default-settings';
import { scanForSensitiveData } from '@/lib/privacy/SensitiveDataDetector';
import { genId, speakText } from '@/lib/utils/tts-id';
import { executeCommand, parseTriggers } from '@/lib/voice/commands';
import { handleCursorCommand } from '@/lib/voice/cursor-commands';
import { containsCursorKeywords } from '@/lib/voice/cursor-parser';
import { tryMatchCustomCommand } from '@/lib/voice/custom-commands';
import { helpCategories, type HelpCategory } from '@/lib/voice/help';
import { normalizeSpokenPunctuation } from '@/lib/voice/punctuation';

import { type LightState,NotificationLight } from './NotificationLight';
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
  const cursor = useCursorState();
  const [status, setStatus] = useState('Idle');
  const [temporaryTrigger, setTemporaryTrigger] = useState<string | null>(null);
  const [clearDocumentConfirmUntil, setClearDocumentConfirmUntil] = useState<number | null>(null);
  const [pendingAiChange, setPendingAiChange] = useState<PendingAiChange | null>(null);
  const [commandDetected, setCommandDetected] = useState(false);
  const [runningCommand, setRunningCommand] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [lightState, setLightState] = useState<LightState>('idle');
  const [selectionPermissionOpen, setSelectionPermissionOpen] = useState(false);
  const [detectedPiiTypes, setDetectedPiiTypes] = useState<any[]>([]);
  const [pendingAiRequest, setPendingAiRequest] = useState<{ content: string; riskLevel: 'low' | 'medium' | 'high'; selectedText: string } | null>(null);
  const clearHighlightTimeoutRef = useRef<number | null>(null);
  const pendingAiChangeRef = useRef<PendingAiChange | null>(null);

  const activeCommandTrigger = temporaryTrigger ?? settings.commandTrigger;
  
  const languageSpecificAiTrigger = useMemo(
    () => getActivationCommandForLanguage(settings.language, 'ai', settings.activationCommands),
    [settings.language, settings.activationCommands]
  );

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

  useEffect(() => {
    // Update light state based on voice recognition and processing state
    if (aiThinking) {
      setLightState('ai');
    } else if (runningCommand) {
      setLightState('command');
    } else if (speech.listening) {
      setLightState('listening');
    } else {
      setLightState('idle');
    }
  }, [speech.listening, runningCommand, aiThinking]);

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

    // Check for PII in selection
    const selectedText = getSelectionText(editor);
    if (selectedText) {
      const scanResult = scanForSensitiveData(selectedText);
      if (scanResult.hasSensitiveData && scanResult.detected.length > 0) {
        // Show permission dialog
        const piiTypes = [...new Set(scanResult.detected.map(d => d.type))];
        const riskLevel = scanResult.detected.some(d => d.confidence > 0.9) ? 'high' : 
                         scanResult.detected.some(d => d.confidence > 0.75) ? 'medium' : 'low';
        
        setDetectedPiiTypes(piiTypes);
        setPendingAiRequest({ content, riskLevel, selectedText });
        setSelectionPermissionOpen(true);
        setStatus('PII detected - requesting permission...');
        return;
      }
    }

    // No PII detected or no selection, proceed with AI request
    proceedWithAiRequest(content);
  };

  const proceedWithAiRequest = async (content: string) => {
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
    aiTrigger: languageSpecificAiTrigger,
    onInterim: () => setStatus('Listening…'),
    onFinal: (rawText) => {
      if (!editor) {
        return;
      }

      const normalized = normalizeSpokenPunctuation(rawText);
      const segments = parseTriggers(normalized, activeCommandTrigger, languageSpecificAiTrigger);
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

          // Try custom dictation commands first
          const customMatched = tryMatchCustomCommand(
            lower,
            settings.dictationCommands,
            editor,
            inlineAiSession,
            {
              lastDictatedRange,
              setStatus,
              onSave: onSaveNow,
              onCreateDocument,
              onSetTitle,
              onPrint: () => window.print(),
              onMicStop: () => speech.stop(),
              onMicPause: () => speech.pause(),
              onMicResume: () => speech.resume(),
              onOpenHelp,
              onTemporaryTriggerChange: setTemporaryTrigger,
              onSpeak: (spoken) => {
                if (settings.ttsEnabled) {
                  speakText(spoken, settings.ttsVoice);
                }
              },
              clearDocumentConfirmUntil,
              setClearDocumentConfirmUntil,
            },
          );

          if (customMatched) {
            handledText = true;
            continue;
          }

          // Fallback to standard text insertion
          const from = editor.state.selection.from;
          editor.chain().focus().insertContent(segment.content).run();
          const to = editor.state.selection.from;
          onLastDictatedRange({ from, to });
          handledText = true;
          continue;
        }

        if (segment.type === 'command') {
          setRunningCommand(true);
          
          // Check if this might be a cursor command
          const docText = editor?.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n') || '';
          const isCursorCommand = containsCursorKeywords(segment.content, settings.language);
          
          let matched = false;
          
          // Try cursor command first if it looks like a cursor command
          if (isCursorCommand && editor) {
            // Handle cursor command asynchronously
            handleCursorCommand(
              segment.content,
              cursor.cursorState,
              docText,
              settings.language,
              {
                onSetCursorSize: cursor.setCursorSize,
                onMoveCursor: (direction) => cursor.moveCursor(direction, docText),
                onExpandSelection: (direction) => cursor.expandSelection(direction, docText),
                onStartSelection: () => cursor.startSelectMode(docText),
                onEndSelection: () => cursor.endSelection(),
                onSelectAll: () => cursor.selectAll(docText),
                customAliases: (settings as any).customCommandAliases || {},
              }
            )
              .then((result) => {
                if (result.success) {
                  setStatus(result.feedback.join('. '));
                  if (settings.ttsEnabled && result.feedback.length > 0) {
                    speakText(result.feedback[0], settings.ttsVoice);
                  }
                }
              })
              .catch((error) => {
                console.error('Cursor command error:', error);
                setStatus(`Command error: ${segment.content}`);
              })
              .finally(() => {
                setRunningCommand(false);
              });
            
            matched = true;
          } else {
            // Standard command handling
            matched = executeCommand(segment.content, editor, inlineAiSession, {
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
          }
          
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NotificationLight 
            state={lightState}
            settings={settings.voiceNotificationLight}
            size="small"
          />
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
        </div>
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
          aiTrigger={languageSpecificAiTrigger}
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
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Cursor:</span>
          {(['paragraph', 'word', 'character'] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => cursor.setCursorSize(size)}
              style={{
                padding: '4px 8px',
                fontSize: '0.875rem',
                background: cursor.cursorState.current.size === size ? 'var(--teal)' : 'transparent',
                color: cursor.cursorState.current.size === size ? 'white' : 'inherit',
                border: `1px solid ${cursor.cursorState.current.size === size ? 'var(--teal)' : 'var(--muted)'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={`Cursor size: ${size}`}
              aria-label={`Set cursor size to ${size}`}
            >
              {size === 'paragraph' ? '¶' : size === 'word' ? 'W' : 'C'}
            </button>
          ))}
        </div>
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
      <SelectionPermissionDialog
        isOpen={selectionPermissionOpen}
        selectedText={pendingAiRequest?.selectedText || ''}
        detectedPiiTypes={detectedPiiTypes}
        confidence={0.85}
        riskLevel={pendingAiRequest?.riskLevel || 'medium'}
        onAllow={(scope) => {
          if (pendingAiRequest) {
            proceedWithAiRequest(pendingAiRequest.content);
          }
          setSelectionPermissionOpen(false);
          setPendingAiRequest(null);
        }}
        onCancel={() => {
          setSelectionPermissionOpen(false);
          setPendingAiRequest(null);
          setStatus('AI request cancelled.');
        }}
        onEdit={() => {
          setSelectionPermissionOpen(false);
          setStatus('Please edit your selection and try again.');
        }}
        ttsEnabled={settings.ttsEnabled}
        onSpeak={(text) => speakText(text, settings.ttsVoice)}
      />
    </div>
  );
}
