/**
 * Cursor Navigation Utilities
 * Handles finding boundaries and moving cursor through text at different sizes
 */

import type { CursorPosition, CursorSize, TextBoundary } from '@/lib/types/cursor';

/**
 * Find the start and end of a paragraph containing the given offset
 */
export function findParagraphBoundary(text: string, offset: number, direction: 'next' | 'prev'): TextBoundary {
  // Split by double newline to find paragraphs
  const parts = text.split('\n\n');
  let currentPos = 0;
  let currentParaIndex = -1;

  // Find which paragraph contains the offset
  for (let i = 0; i < parts.length; i++) {
    const paraStart = currentPos;
    const paraEnd = currentPos + parts[i].length;

    if (offset >= paraStart && offset < paraEnd) {
      currentParaIndex = i;
      break;
    }
    currentPos = paraEnd + 2; // Account for \n\n
  }

  if (direction === 'next') {
    if (currentParaIndex < 0 || currentParaIndex >= parts.length - 1) {
      // No next paragraph
      return {
        start: text.length,
        end: text.length,
        text: '',
      };
    }

    const nextIndex = currentParaIndex + 1;
    let nextStart = 0;
    for (let i = 0; i < nextIndex; i++) {
      nextStart += parts[i].length + 2; // +2 for \n\n
    }

    const nextEnd = nextStart + parts[nextIndex].length;

    return {
      start: nextStart,
      end: nextEnd,
      text: parts[nextIndex],
    };
  } else {
    // previous
    if (currentParaIndex <= 0) {
      // No previous paragraph
      return {
        start: 0,
        end: 0,
        text: '',
      };
    }

    const prevIndex = currentParaIndex - 1;
    let prevStart = 0;
    for (let i = 0; i < prevIndex; i++) {
      prevStart += parts[i].length + 2;
    }

    const prevEnd = prevStart + parts[prevIndex].length;

    return {
      start: prevStart,
      end: prevEnd,
      text: parts[prevIndex],
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
  const allMatches: RegExpExecArray[] = [];

  // Find all words and track which one contains offset
  while ((match = wordPattern.exec(text)) !== null) {
    allMatches.push(match);
    if (match.index <= offset && offset < match.index + match[0].length) {
      currentWord = {
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
      };
    }
  }

  if (direction === 'next') {
    if (!currentWord) {
      // No word at offset, find next word
      for (const m of allMatches) {
        if (m.index >= offset) {
          return {
            start: m.index,
            end: m.index + m[0].length,
            text: m[0],
          };
        }
      }
      return { start: text.length, end: text.length, text: '' };
    }

    // Find next word after currentWord
    for (const m of allMatches) {
      if (m.index >= currentWord.end) {
        return {
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
        };
      }
    }
    return { start: text.length, end: text.length, text: '' };
  } else {
    // previous
    if (!currentWord) {
      // No word at offset, find previous word
      for (let i = allMatches.length - 1; i >= 0; i--) {
        if (allMatches[i].index < offset) {
          const m = allMatches[i];
          return {
            start: m.index,
            end: m.index + m[0].length,
            text: m[0],
          };
        }
      }
      return { start: 0, end: 0, text: '' };
    }

    // Find previous word before currentWord
    for (let i = allMatches.length - 1; i >= 0; i--) {
      const m = allMatches[i];
      if (m.index + m[0].length <= currentWord.start) {
        return {
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
        };
      }
    }
    return { start: 0, end: 0, text: '' };
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
