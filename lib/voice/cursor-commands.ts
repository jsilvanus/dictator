/**
 * Cursor Command Executor
 * Parses and executes cursor voice commands
 * Supports command chaining: "select big cursor next next"
 */

import { flattenCursorCommands, getCursorCommandsForLanguage } from '@/lib/data/cursor-command-defaults';
import type { CursorOperationResult,CursorState } from '@/lib/types/cursor';

type CursorCommand =
  | 'next'
  | 'previous'
  | 'select'
  | 'selectAll'
  | 'selectStart'
  | 'selectEnd'
  | 'cursorBig'
  | 'cursorMedium'
  | 'cursorSmall';

interface ParsedCursorCommand {
  commands: CursorCommand[];
  feedback: string;
}

/**
 * Parse cursor command text into individual commands
 * Supports chaining: "select big cursor next next" -> ['select', 'cursorBig', 'next', 'next']
 */
export function parseCursorCommand(
  text: string,
  language: string = 'en',
  customAliases?: Record<string, string>,
): ParsedCursorCommand {
  const commandSet = getCursorCommandsForLanguage(language);
  const flattenedCommands = flattenCursorCommands(commandSet);

  // Combine with custom aliases
  const allCommands = { ...flattenedCommands, ...customAliases };

  const words = text.toLowerCase().trim().split(/\s+/);
  const parsedCommands: CursorCommand[] = [];
  const unknownWords: string[] = [];

  for (const word of words) {
    const command = allCommands[word];
    if (command) {
      parsedCommands.push(command as CursorCommand);
    } else if (!['the', 'a', 'and', 'or', 'is', 'to'].includes(word)) {
      // Skip articles and prepositions
      unknownWords.push(word);
    }
  }

  let feedback = '';
  if (unknownWords.length > 0) {
    feedback = `Unrecognized words: ${unknownWords.join(', ')}. `;
  }
  feedback += `Executing ${parsedCommands.length} command${parsedCommands.length !== 1 ? 's' : ''}`;

  return {
    commands: parsedCommands,
    feedback,
  };
}

interface CursorCommandExecutorOptions {
  onSetCursorSize?: (size: 'paragraph' | 'word' | 'character') => void;
  onMoveCursor?: (direction: 'next' | 'prev') => CursorOperationResult;
  onStartSelection?: () => void;
  onExpandSelection?: (direction: 'next' | 'prev') => CursorOperationResult;
  onEndSelection?: () => CursorOperationResult;
  onSelectAll?: () => CursorOperationResult;
  onPermissionRequired?: (callback: () => void) => void;
}

/**
 * Execute parsed cursor commands
 * Applies cursor size changes, movements, and selections in sequence
 */
export async function executeCursorCommands(
  commands: CursorCommand[],
  cursorState: CursorState,
  text: string,
  options: CursorCommandExecutorOptions,
): Promise<{
  success: boolean;
  feedback: string[];
  finalState: CursorState;
  finalResult?: CursorOperationResult;
}> {
  const feedback: string[] = [];
  let currentState = cursorState;
  let finalResult: CursorOperationResult | undefined;

  for (const command of commands) {
    switch (command) {
      case 'cursorBig':
        options.onSetCursorSize?.('paragraph');
        feedback.push('Cursor size set to paragraph');
        currentState = {
          ...currentState,
          current: { ...currentState.current, size: 'paragraph' },
        };
        break;

      case 'cursorMedium':
        options.onSetCursorSize?.('word');
        feedback.push('Cursor size set to word');
        currentState = {
          ...currentState,
          current: { ...currentState.current, size: 'word' },
        };
        break;

      case 'cursorSmall':
        options.onSetCursorSize?.('character');
        feedback.push('Cursor size set to character');
        currentState = {
          ...currentState,
          current: { ...currentState.current, size: 'character' },
        };
        break;

      case 'next':
        if (!currentState.selection?.isActive) {
          const result = options.onMoveCursor?.('next');
          if (result) {
            feedback.push(result.feedback);
            finalResult = result;
            currentState = result.newState;
          }
        } else {
          const result = options.onExpandSelection?.('next');
          if (result) {
            feedback.push(result.feedback);
            finalResult = result;
            currentState = result.newState;
          }
        }
        break;

      case 'previous':
        if (!currentState.selection?.isActive) {
          const result = options.onMoveCursor?.('prev');
          if (result) {
            feedback.push(result.feedback);
            finalResult = result;
            currentState = result.newState;
          }
        } else {
          const result = options.onExpandSelection?.('prev');
          if (result) {
            feedback.push(result.feedback);
            finalResult = result;
            currentState = result.newState;
          }
        }
        break;

      case 'select':
        options.onStartSelection?.();
        feedback.push('Selection started');
        if (currentState.selection) {
          currentState = {
            ...currentState,
            selection: {
              ...currentState.selection,
              isActive: true,
            },
          };
        }
        break;

      case 'selectAll':
        const selectAllResult = options.onSelectAll?.();
        if (selectAllResult) {
          feedback.push(selectAllResult.feedback);
          finalResult = selectAllResult;
          currentState = selectAllResult.newState;
        }
        break;

      case 'selectStart':
        options.onStartSelection?.();
        feedback.push('Selection started');
        if (currentState.selection) {
          currentState = {
            ...currentState,
            selection: {
              ...currentState.selection,
              isActive: true,
            },
          };
        }
        break;

      case 'selectEnd':
        const endResult = options.onEndSelection?.();
        if (endResult) {
          feedback.push(endResult.feedback);
          finalResult = endResult;
          currentState = endResult.newState;
        }
        break;
    }
  }

  return {
    success: feedback.length > 0,
    feedback,
    finalState: currentState,
    finalResult,
  };
}

/**
 * High-level function to parse and execute cursor command text
 */
export async function handleCursorCommand(
  commandText: string,
  cursorState: CursorState,
  text: string,
  language: string = 'en',
  options: CursorCommandExecutorOptions & { customAliases?: Record<string, string> },
): Promise<{
  success: boolean;
  feedback: string[];
  selectedText?: string;
  finalState: CursorState;
}> {
  const parsed = parseCursorCommand(commandText, language, options.customAliases);

  const result = await executeCursorCommands(parsed.commands, cursorState, text, options);

  return {
    success: result.success,
    feedback: [parsed.feedback, ...result.feedback],
    selectedText: result.finalResult?.selectedText,
    finalState: result.finalState,
  };
}
