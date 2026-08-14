/**
 * Extended Voice Command Parser with Cursor Support
 * Detects and parses cursor navigation commands in voice input
 * Works alongside existing command/ai triggers
 */

import type { TriggerSegment } from './commands';
import { getCursorCommandsForLanguage, flattenCursorCommands } from '@/lib/data/cursor-command-defaults';
import type { CursorSize } from '@/lib/types/cursor';

export type CursorTriggerSegment = TriggerSegment & {
  type: 'cursor-command';
  cursorCommands?: string[];
};

/**
 * Extended segment type that can include cursor commands
 */
export type ExtendedTriggerSegment = TriggerSegment | CursorTriggerSegment;

/**
 * Check if text contains cursor-related keywords
 */
export function containsCursorKeywords(text: string, language: string = 'en'): boolean {
  const keywords = [
    'cursor',
    'navigate',
    'select',
    'big',
    'medium',
    'small',
    'paragraph',
    'word',
    'character',
    'next',
    'back',
    'previous',
  ];

  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Parse cursor commands from text
 * Returns array of recognized cursor commands
 */
export function parseCursorCommandsFromText(
  text: string,
  language: string = 'en',
  customAliases?: Record<string, string>,
): string[] {
  const commandSet = getCursorCommandsForLanguage(language);
  const flattenedCommands = flattenCursorCommands(commandSet);
  const allCommands = { ...flattenedCommands, ...customAliases };

  const words = text.toLowerCase().trim().split(/\s+/);
  const found: string[] = [];

  for (const word of words) {
    if (allCommands[word]) {
      found.push(allCommands[word]);
    }
  }

  return found;
}

/**
 * Detect cursor size from command
 */
export function detectCursorSize(commands: string[]): CursorSize | null {
  for (const cmd of commands) {
    if (cmd === 'cursorBig') return 'paragraph';
    if (cmd === 'cursorMedium') return 'word';
    if (cmd === 'cursorSmall') return 'character';
  }
  return null;
}

/**
 * Check if text is a cursor command
 */
export function isCursorCommand(text: string, language: string = 'en'): boolean {
  const commands = parseCursorCommandsFromText(text, language);
  return commands.length > 0;
}

/**
 * Extract cursor command intent from text
 */
export function extractCursorIntent(text: string, language: string = 'en'): {
  hasIntent: boolean;
  cursorSize?: CursorSize;
  commands: string[];
  nonCommandText: string;
} {
  const commands = parseCursorCommandsFromText(text, language);
  const cursorSize = detectCursorSize(commands);

  // Remove recognized commands from text to get non-command text
  const words = text.toLowerCase().split(/\s+/);
  const commandSet = getCursorCommandsForLanguage(language);
  const flattenedCommands = flattenCursorCommands(commandSet);

  const remainingWords = words.filter((word) => !flattenedCommands[word]);
  const nonCommandText = remainingWords.join(' ');

  return {
    hasIntent: commands.length > 0,
    cursorSize,
    commands,
    nonCommandText,
  };
}
