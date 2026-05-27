'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SpeechRecognitionHandle = {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  listening: boolean;
  paused: boolean;
  interimText: string;
  error: string | null;
};

type SpeechRecognitionOptions = {
  language: string;
  commandTrigger: string;
  aiTrigger: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (error: string) => void;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: {
      transcript: string;
    };
  }>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

export function useSpeechRecognition(options: SpeechRecognitionOptions): SpeechRecognitionHandle {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const callbacksRef = useRef({
    onInterim: options.onInterim,
    onFinal: options.onFinal,
    onError: options.onError,
  });

  callbacksRef.current = {
    onInterim: options.onInterim,
    onFinal: options.onFinal,
    onError: options.onError,
  };

  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Constructor =
      typeof window !== 'undefined'
        ? ((window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition)
        : undefined;

    if (!Constructor) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
        callbacksRef.current.onInterim?.(interim);
      }

      if (final) {
        setInterimText('');
        callbacksRef.current.onFinal?.(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' && listening) {
        recognition.start();
        return;
      }

      if (event.error === 'no-speech') {
        return;
      }

      const message =
        event.error === 'not-allowed'
          ? 'Microphone permission denied. Enable microphone access in browser settings.'
          : event.error === 'network'
            ? 'Network error from speech recognition. Retry.'
            : `Speech error: ${event.error}`;

      setError(message);
      callbacksRef.current.onError?.(message);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [listening, options.aiTrigger, options.commandTrigger, options.language]);

  const start = useCallback(() => {
    setError(null);
    setPaused(false);
    recognitionRef.current?.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setPaused(false);
    setInterimText('');
  }, []);

  const pause = useCallback(() => {
    recognitionRef.current?.abort();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    recognitionRef.current?.start();
    setPaused(false);
    setListening(true);
  }, []);

  return useMemo(
    () => ({
      start,
      stop,
      pause,
      resume,
      listening,
      paused,
      interimText,
      error,
    }),
    [error, interimText, listening, pause, paused, resume, start, stop],
  );
}
