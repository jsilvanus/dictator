/**
 * Cursor Navigation Utilities
 * Handles finding boundaries and moving cursor through text at different sizes
 */

import type { CursorPosition, CursorSize, TextBoundary } from '@/lib/types/cursor';

/**
 * Find the start and end of a paragraph containing the given offset
 */
export function findParagraphBoundary(text: string, offset: number, direction: 'next' | 'prev'): TextBoundary {
  if (direction === 'next') {
    // Find the start of the next paragraph
    const currentParagraphEnd = text.indexOf('\n\n', offset);
    if (currentParagraphEnd === -1) {
      // Last paragraph
      return {
        start: offset,
        end: text.length,
        text: text.slice(offset),
      };
    }

    const nextParagraphStart = currentParagraphEnd + 2;
    const nextParagraphEnd = text.indexOf('\n\n', nextParagraphStart);
    if (nextParagraphEnd === -1) {
      return {
        start: nextParagraphStart,
        end: text.length,
        text: text.slice(nextParagraphStart),
      };
    }

    return {
      start: nextParagraphStart,
      end: nextParagraphEnd,
      text: text.slice(nextParagraphStart, nextParagraphEnd),
    };
  } else {
    // Find the start of the previous paragraph
    const currentParagraphStart = Math.max(
      0,
      text.lastIndexOf('\n\n', Math.max(0, offset - 1)) + 2,
    );

    if (currentParagraphStart === 1) {
      // First paragraph
      return {
        start: 0,
        end: text.indexOf('\n\n'),
        text: text.slice(0, text.indexOf('\n\n')),
      };
    }

    const prevParagraphEnd = currentParagraphStart - 2;
    const prevParagraphStart = Math.max(
      0,
      text.lastIndexOf('\n\n', Math.max(0, prevParagraphEnd - 1)) + 2,
    );

    return {
      start: prevParagraphStart,
      end: prevParagraphEnd,
      text: text.slice(prevParagraphStart, prevParagraphEnd),
    };
  }
}

/**
 * Find the start and end of a word containing the given offset
 */
export function findWordBoundary(text: string, offset: number, direction: 'next' | 'prev'): TextBoundary {
  const wordPattern = /\b\w+\b/g;
  let match;
  let currentWord: TextBoundary | null = null;

  while ((match = wordPattern.exec(text)) !== null) {
    if (match.index <= offset && offset < match.index + match[0].length) {
      currentWord = {
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      };
      break;
    }
  }

  if (!currentWord) {
    // If no word at offset, treat it as whitespace
    if (direction === 'next') {
      wordPattern.lastIndex = offset;
      const nextMatch = wordPattern.exec(text);
      if (!nextMatch) {
        return {
          start: text.length,
          end: text.length,
          text: '',
        };
      }
      return {
        start: nextMatch.index,
        end: nextMatch.index + nextMatch[0].length,
        text: nextMatch[0],
      };
    } else {
      // Find previous word
      const previousMatches: typeof match[] = [];
      wordPattern.lastIndex = 0;
      while ((match = wordPattern.exec(text)) !== null && match.index < offset) {
        previousMatches.push(match);
      }
      if (previousMatches.length === 0) {
        return {
          start: 0,
          end: 0,
          text: '',
        };
      }
      const prevMatch = previousMatches[previousMatches.length - 1];
      return {
        start: prevMatch.index,
        end: prevMatch.index + prevMatch[0].length,
        text: prevMatch[0],
      };
    }
  }

  if (direction === 'next') {
    wordPattern.lastIndex = currentWord.end;
    const nextMatch = wordPattern.exec(text);
    if (!nextMatch) {
      return {
        start: text.length,
        end: text.length,
        text: '',
      };
    }
    return {
      start: nextMatch.index,
      end: nextMatch.index + nextMatch[0].length,
      text: nextMatch[0],
    };
  } else {
    // Find previous word
    const previousMatches: typeof match[] = [];
    wordPattern.lastIndex = 0;
    while ((match = wordPattern.exec(text)) !== null && match.index < currentWord.start) {
      previousMatches.push(match);
    }
    if (previousMatches.length === 0) {
      return {
        start: 0,
        end: 0,
        text: '',
      };
    }
    const prevMatch = previousMatches[previousMatches.length - 1];
    return {
      start: prevMatch.index,
      end: prevMatch.index + prevMatch[0].length,
      text: prevMatch[0],
    };
  }
}

/**
 * Find character boundary (single character navigation)
 */
export function findCharacterBoundary(text: string, offset: number, direction: 'next' | 'prev'): TextBoundary {
  if (direction === 'next') {
    if (offset >= text.length) {
      return {
        start: text.length,
        end: text.length,
        text: '',
      };
    }
    return {
      start: offset,
      end: offset + 1,
      text: text[offset],
    };
  } else {
    if (offset <= 0) {
      return {
        start: 0,
        end: 0,
        text: '',
      };
    }
    return {
      start: offset - 1,
      end: offset,
      text: text[offset - 1],
    };
  }
}

/**
 * Get text at cursor position
 */
export function getTextAtCursor(text: string, cursorPos: CursorPosition): string {
  return text.slice(cursorPos.startChar, cursorPos.endChar);
}

/**
 * Move cursor in a direction by the specified size unit
 */
export function moveCursorInDirection(
  text: string,
  currentPos: CursorPosition,
  direction: 'next' | 'prev',
): CursorPosition {
  let boundary: TextBoundary;

  switch (currentPos.size) {
    case 'paragraph':
      boundary = findParagraphBoundary(text, currentPos.endChar, direction);
      break;
    case 'word':
      boundary = findWordBoundary(text, currentPos.endChar, direction);
      break;
    case 'character':
      boundary = findCharacterBoundary(text, currentPos.endChar, direction);
      break;
  }

  return {
    startChar: boundary.start,
    endChar: boundary.end,
    size: currentPos.size,
  };
}

/**
 * Validate that a cursor range is within document bounds
 */
export function validateCursorRange(text: string, range: CursorPosition): CursorPosition {
  const start = Math.max(0, Math.min(range.startChar, text.length));
  const end = Math.max(start, Math.min(range.endChar, text.length));

  return {
    startChar: start,
    endChar: end,
    size: range.size,
  };
}

/**
 * Get the position at the start of the document
 */
export function getCursorAtDocStart(size: CursorSize): CursorPosition {
  return {
    startChar: 0,
    endChar: 0,
    size,
  };
}

/**
 * Get the position at the end of the document
 */
export function getCursorAtDocEnd(text: string, size: CursorSize): CursorPosition {
  return {
    startChar: text.length,
    endChar: text.length,
    size,
  };
}
