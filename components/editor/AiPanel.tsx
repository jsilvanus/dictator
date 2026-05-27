'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';

import type { AiChatAction } from '@/lib/ai/chat-prompts';
import type { PanelTurn } from '@/lib/ai/context';
import { genId, speakText } from '@/lib/utils/tts-id';

type PanelMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
};

function parseAction(text: string): { speech: string; action: AiChatAction } {
  const match = text.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/);
  const speech = text.replace(/\[ACTION\][\s\S]*?\[\/ACTION\]/, '').trim();

  if (match) {
    try {
      return { speech, action: JSON.parse(match[1]) as AiChatAction };
    } catch {
      // fallthrough
    }
  }

  return { speech: speech || text, action: { type: 'none' } };
}

export function AiPanel({
  open,
  editor,
  documentId,
  title,
  ttsEnabled,
  ttsVoice,
  language,
  voiceMessage,
  onVoiceMessageHandled,
  onSetTitle,
  onClose,
}: {
  open: boolean;
  editor: Editor | null;
  documentId: string;
  title: string;
  ttsEnabled: boolean;
  ttsVoice: string;
  language: string;
  voiceMessage: string | null;
  onVoiceMessageHandled: () => void;
  onSetTitle: (title: string) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load persisted panel session on mount
  useEffect(() => {
    if (!documentId) return;
    fetch(`/api/ai/sessions?documentId=${documentId}`)
      .then((r) => r.json())
      .then((data: { turns?: Array<{ role: string; content: string }> }) => {
        const turns = data.turns ?? [];
        if (turns.length > 0) {
          setMessages(
            turns.map((t) => ({
              id: genId(),
              role: (t.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
              content: t.content,
            })),
          );
        }
      })
      .catch(() => {
        // ignore load errors
      });
  }, [documentId]);

  // Handle voice-routed messages — only when not already streaming so we don't drop them
  useEffect(() => {
    if (voiceMessage && open && !isStreaming) {
      void sendMessage(voiceMessage);
      onVoiceMessageHandled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMessage, open, isStreaming]);

  const conversationHistory: PanelTurn[] = messages
    .filter((m) => !m.streaming)
    .map((m) => ({ role: m.role, content: m.content }));

  function executeAction(action: AiChatAction) {
    if (action.type === 'set_title') {
      onSetTitle(action.title);
      return;
    }

    if (!editor) return;

    if (action.type === 'insert_at_cursor') {
      editor.chain().focus().insertContent(action.content).run();
    } else if (action.type === 'replace_selection') {
      editor.chain().focus().insertContent(action.content).run();
    } else if (action.type === 'read_back') {
      if (!ttsEnabled) return;
      let text = '';
      if (action.target === 'selection') {
        const { from, to } = editor.state.selection;
        text = editor.state.doc.textBetween(from, to, '\n', '\n');
      } else {
        text = editor.state.selection.$from.parent.textContent;
      }
      if (text) speakText(text, ttsVoice);
    } else if (action.type === 'speak') {
      if (ttsEnabled) speakText(action.speech, ttsVoice);
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming) return;

    const userMessage: PanelMessage = { id: genId(), role: 'user', content };
    const assistantId = genId();
    const assistantMessage: PanelMessage = { id: assistantId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputText('');
    setIsStreaming(true);

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const docText = editor
        ? editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n')
        : '';
      const cursorParagraph = editor ? editor.state.selection.$from.parent.textContent : '';
      const paragraphs = docText.split('\n').filter((p) => p.trim().length > 0);
      const cursorIdx = paragraphs.findIndex((p) => p === cursorParagraph);
      const precedingParagraphs =
        cursorIdx <= 0 ? paragraphs.slice(0, 2) : paragraphs.slice(Math.max(0, cursorIdx - 2), cursorIdx);
      const snapshot = {
        title,
        language,
        wordCount: editor?.storage.characterCount?.words() ?? 0,
        fullText: docText,
        selection: editor
          ? (() => {
              const { from, to } = editor.state.selection;
              return from === to ? '' : editor.state.doc.textBetween(from, to, '\n', '\n');
            })()
          : '',
        cursorParagraph,
        precedingParagraphs,
      };

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          snapshot,
          documentId,
          history: conversationHistory,
        }),
      });

      if (!response.ok || !response.body) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: 'Request failed.', streaming: false } : m)),
        );
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m)),
        );
      }

      // Single scroll after streaming completes
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

      const { speech, action } = parseAction(fullText);

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: speech, streaming: false } : m)),
      );

      executeAction(action);

      if (ttsEnabled && speech) {
        speakText(speech, ttsVoice);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: 'Request failed.', streaming: false } : m)),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function clearConversation() {
    setMessages([]);
    await fetch(`/api/ai/sessions?documentId=${documentId}`, { method: 'DELETE' }).catch(() => {});
  }

  if (!open) return null;

  return (
    <div className="panel ai-panel" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: '0.875rem' }}>AI Assistant</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => void clearConversation()}
            style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
            aria-label="Close AI panel"
          >
            ×
          </button>
        </div>
      </div>

      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 8,
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px 0' }}>
            Ask anything about your document.
          </p>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: '0.875rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                background: msg.role === 'user' ? 'var(--surface-raised, #f3f4f6)' : 'rgb(127 119 221 / 10%)',
                borderLeft: msg.role === 'assistant' ? '2px solid var(--purple, #7F77DD)' : 'none',
              }}
            >
              {msg.content}
              {msg.streaming ? <span style={{ opacity: 0.5 }}> ▌</span> : null}
            </div>

            {msg.role === 'assistant' && !msg.streaming ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => void navigator.clipboard.writeText(msg.content)}
                >
                  Copy
                </button>
                {ttsEnabled ? (
                  <button
                    type="button"
                    style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => speakText(msg.content, ttsVoice)}
                  >
                    ▶ Play
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage(inputText);
            }
          }}
          placeholder="Ask AI… (Enter to send)"
          style={{ flex: 1 }}
          disabled={isStreaming}
        />
        <button
          type="button"
          onClick={() => void sendMessage(inputText)}
          disabled={isStreaming || !inputText.trim()}
          style={{ background: 'var(--purple, #7F77DD)', color: 'white', minWidth: 60 }}
        >
          {isStreaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
