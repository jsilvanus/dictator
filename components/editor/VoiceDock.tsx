'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';

import { useSettings } from '@/components/providers/SettingsProvider';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { normalizeSpokenPunctuation } from '@/lib/voice/punctuation';

import { TriggerChip } from './TriggerChip';

export function VoiceDock({
  editor,
  onLastDictatedRange,
}: {
  editor: Editor | null;
  onLastDictatedRange: (range: { from: number; to: number } | null) => void;
}) {
  const { settings, patchSettings } = useSettings();
  const [status, setStatus] = useState('Idle');
  const speech = useSpeechRecognition({
    language: settings.language,
    onInterim: () => setStatus('Listening…'),
    onFinal: (text) => {
      if (!editor) {
        return;
      }

      const normalized = normalizeSpokenPunctuation(text);
      const lower = normalized.toLowerCase().trim();

      if (lower.includes('new paragraph')) {
        editor.chain().focus().splitBlock().run();
        setStatus('Committed final speech.');
        return;
      }

      if (lower.includes('new line')) {
        editor.chain().focus().insertContent('\n').run();
        setStatus('Committed final speech.');
        return;
      }

      const from = editor.state.selection.from;
      editor.chain().focus().insertContent(normalized).run();
      const to = editor.state.selection.from;
      onLastDictatedRange({ from, to });
      setStatus('Committed final speech.');
    },
    onError: (message) => setStatus(message),
  });

  useEffect(() => {
    return () => {
      speech.stop();
      onLastDictatedRange(null);
    };
  }, [onLastDictatedRange, speech]);

  const micStyle = useMemo(() => {
    if (speech.paused) {
      return { outline: '2px solid var(--amber)' };
    }
    if (speech.listening) {
      return { background: 'var(--teal)', color: 'white', boxShadow: '0 0 0 8px rgb(13 148 136 / 15%)' };
    }
    return {};
  }, [speech.listening, speech.paused]);

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
        <button type="button" style={{ background: 'var(--purple)', color: 'white' }}>
          ✨ AI
        </button>
        <TriggerChip trigger={settings.commandTrigger} />
        <label>
          Language
          <select
            value={settings.language}
            onChange={(event) => patchSettings({ language: event.target.value })}
          >
            <option value="en-US">en-US</option>
            <option value="fi-FI">fi-FI</option>
            <option value="sv-SE">sv-SE</option>
          </select>
        </label>
      </div>
      <p style={{ marginTop: 8, color: 'var(--muted)', fontStyle: speech.interimText ? 'italic' : 'normal' }}>
        {speech.interimText ? `Interim: ${speech.interimText}` : `Status: ${status}`}
      </p>
    </div>
  );
}
