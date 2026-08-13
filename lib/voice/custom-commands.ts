import type { Editor } from '@tiptap/react';
import type { DictationCommand } from '@/lib/data/default-settings';
import { executeCommand } from './commands';
import type { AiSession } from '@/lib/ai/session';

export type CommandOptions = {
  lastDictatedRange: { from: number; to: number } | null;
  setStatus?: (status: string) => void;
  onSave?: () => Promise<void> | void;
  onCreateDocument?: () => Promise<void> | void;
  onSetTitle?: (title: string) => void;
  onPrint?: () => void;
  onMicStop?: () => void;
  onMicPause?: () => void;
  onMicResume?: () => void;
  onOpenHelp?: (category?: string) => void;
  onTemporaryTriggerChange?: (next: string | null) => void;
  onSpeak?: (text: string) => void;
  clearDocumentConfirmUntil: number | null;
  setClearDocumentConfirmUntil: (next: number | null) => void;
};

/**
 * Check if the text matches a custom dictation command and execute it.
 * Returns true if a command was matched and executed, false otherwise.
 */
export function tryMatchCustomCommand(
  text: string,
  commands: DictationCommand[] | undefined,
  editor: Editor,
  session: AiSession,
  options: CommandOptions,
): boolean {
  if (!commands || commands.length === 0) {
    return false;
  }

  const lowerText = text.toLowerCase().trim();

  for (const command of commands) {
    for (const phrase of command.voicePhrases) {
      if (lowerText === phrase.toLowerCase().trim()) {
        // Found a match, execute the command
        // Map custom command name to actual command
        return executeCommand(command.name, editor, session, options);
      }
    }
  }

  return false;
}

/**
 * Check if the text contains a custom dictation command.
 * Returns the matched command name if found, null otherwise.
 * This is useful for checking if text includes a command as part of a larger phrase.
 */
export function findCustomCommandInText(text: string, commands: DictationCommand[] | undefined): string | null {
  if (!commands || commands.length === 0) {
    return null;
  }

  const lowerText = text.toLowerCase().trim();

  // Check for exact matches first
  for (const command of commands) {
    for (const phrase of command.voicePhrases) {
      if (lowerText === phrase.toLowerCase().trim()) {
        return command.name;
      }
    }
  }

  // Check for partial matches (word boundaries)
  for (const command of commands) {
    for (const phrase of command.voicePhrases) {
      const lowerPhrase = phrase.toLowerCase().trim();
      // Only match if the phrase is a complete word in the text
      if (lowerText.includes(lowerPhrase)) {
        return command.name;
      }
    }
  }

  return null;
}
