/**
 * Cursor System Unit Tests
 * Tests for navigation, selection, and voice command parsing
 */

import { describe, it, expect } from 'vitest';
import {
  findParagraphBoundary,
  findWordBoundary,
  findCharacterBoundary,
  getTextAtCursor,
  moveCursorInDirection,
  validateCursorRange,
} from '@/lib/cursor/navigation';
import {
  expandSelectionTo,
  collapseSelection,
  getSelectionText,
  getSelectionBounds,
  startSelection,
  selectAllText,
} from '@/lib/cursor/selection';
import { parseCursorCommand, handleCursorCommand } from '@/lib/voice/cursor-commands';
import { extractCursorIntent, parseCursorCommandsFromText } from '@/lib/voice/cursor-parser';

describe('Cursor Navigation', () => {
  const sampleText = 'This is the first paragraph.\n\nThis is the second paragraph.\n\nThis is the third paragraph.';

  describe('findParagraphBoundary', () => {
    it('should find next paragraph', () => {
      const result = findParagraphBoundary(sampleText, 0, 'next');
      expect(result.text).toContain('second');
    });

    it('should find next paragraph from middle', () => {
      // Start from a position within the first paragraph
      const result = findParagraphBoundary(sampleText, 10, 'next');
      expect(result.text.length > 0).toBe(true);
    });

    it('should handle boundaries correctly', () => {
      const result = findParagraphBoundary(sampleText, 0, 'next');
      expect(result.start).toBeGreaterThan(0);
      expect(result.end).toBeGreaterThan(result.start);
    });
  });

  describe('findWordBoundary', () => {
    it('should find next word', () => {
      const result = findWordBoundary(sampleText, 0, 'next');
      expect(result.text).toBeDefined();
      expect(result.text.length > 0).toBe(true);
    });

    it('should find previous word', () => {
      const result = findWordBoundary(sampleText, 10, 'prev');
      expect(result.text).toBeDefined();
      expect(result.start < 10).toBe(true);
    });

    it('should handle word at current position', () => {
      const result = findWordBoundary(sampleText, 5, 'next');
      expect(result.text).toBeDefined();
    });
  });

  describe('findCharacterBoundary', () => {
    it('should advance by one character', () => {
      const result = findCharacterBoundary(sampleText, 0, 'next');
      expect(result.text).toBe('T');
      expect(result.start).toBe(0);
      expect(result.end).toBe(1);
    });

    it('should go back one character', () => {
      const result = findCharacterBoundary(sampleText, 5, 'prev');
      expect(result.text).toBe(' ');
    });

    it('should handle document boundaries', () => {
      const result = findCharacterBoundary(sampleText, sampleText.length, 'next');
      expect(result.text).toBe('');
    });
  });

  describe('getTextAtCursor', () => {
    it('should return text at cursor position', () => {
      const text = getTextAtCursor(sampleText, {
        startChar: 0,
        endChar: 4,
        size: 'word',
      });
      expect(text).toBe('This');
    });

    it('should handle empty ranges', () => {
      const text = getTextAtCursor(sampleText, {
        startChar: 10,
        endChar: 10,
        size: 'character',
      });
      expect(text).toBe('');
    });
  });

  describe('validateCursorRange', () => {
    it('should clamp out-of-bounds ranges', () => {
      const result = validateCursorRange(sampleText, {
        startChar: -5,
        endChar: sampleText.length + 10,
        size: 'paragraph',
      });
      expect(result.startChar).toBe(0);
      expect(result.endChar).toBe(sampleText.length);
    });

    it('should handle valid ranges', () => {
      const range = {
        startChar: 10,
        endChar: 20,
        size: 'word' as const,
      };
      const result = validateCursorRange(sampleText, range);
      expect(result).toEqual(range);
    });
  });
});

describe('Selection Management', () => {
  const sampleText = 'Hello world. This is a test.';

  describe('startSelection', () => {
    it('should create an active selection', () => {
      const cursor = { startChar: 0, endChar: 5, size: 'word' as const };
      const selection = startSelection(cursor);
      expect(selection.isActive).toBe(true);
      expect(selection.startPos).toEqual(cursor);
      expect(selection.endPos).toEqual(cursor);
    });
  });

  describe('getSelectionText', () => {
    it('should extract selected text', () => {
      const selection = {
        isActive: true,
        startPos: { startChar: 0, endChar: 5, size: 'word' as const },
        endPos: { startChar: 6, endChar: 11, size: 'word' as const },
        isExpanding: true,
      };
      const text = getSelectionText(sampleText, selection);
      expect(text).toBe('Hello world');
    });
  });

  describe('getSelectionBounds', () => {
    it('should return min/max bounds', () => {
      const selection = {
        isActive: true,
        startPos: { startChar: 10, endChar: 15, size: 'word' as const },
        endPos: { startChar: 0, endChar: 5, size: 'word' as const },
        isExpanding: false,
      };
      const bounds = getSelectionBounds(selection);
      expect(bounds.start).toBe(0);
      expect(bounds.end).toBe(15);
    });
  });

  describe('selectAllText', () => {
    it('should select entire document', () => {
      const selection = selectAllText(sampleText, 'paragraph');
      expect(selection.isActive).toBe(true);
      expect(selection.startPos.startChar).toBe(0);
      expect(selection.endPos.endChar).toBe(sampleText.length);
    });
  });
});

describe('Voice Cursor Commands', () => {
  describe('parseCursorCommand', () => {
    it('should parse single command', () => {
      const result = parseCursorCommand('next', 'en');
      expect(result.commands).toContain('next');
    });

    it('should parse cursor size commands', () => {
      const result = parseCursorCommand('big', 'en');
      expect(result.commands).toContain('cursorBig');
    });

    it('should parse chained commands', () => {
      const result = parseCursorCommand('select big next next', 'en');
      expect(result.commands).toContain('select');
      expect(result.commands).toContain('cursorBig');
      expect(result.commands.filter((c) => c === 'next')).toHaveLength(2);
    });

    it('should handle custom aliases', () => {
      const result = parseCursorCommand('advance', 'en', { advance: 'next' });
      expect(result.commands).toContain('next');
    });

    it('should provide feedback', () => {
      const result = parseCursorCommand('next back', 'en');
      expect(result.feedback).toBeDefined();
      expect(result.feedback.length > 0).toBe(true);
    });
  });

  describe('extractCursorIntent', () => {
    it('should detect cursor intent', () => {
      const result = extractCursorIntent('select medium word', 'en');
      expect(result.hasIntent).toBe(true);
      expect(result.cursorSize).toBe('word');
      expect(result.commands).toContain('select');
    });

    it('should extract non-command text', () => {
      const result = extractCursorIntent('select this text', 'en');
      expect(result.nonCommandText).toContain('this');
      expect(result.nonCommandText).toContain('text');
    });

    it('should handle text without cursor commands', () => {
      const result = extractCursorIntent('just regular text', 'en');
      expect(result.hasIntent).toBe(false);
    });
  });

  describe('parseCursorCommandsFromText', () => {
    it('should find multiple commands', () => {
      const commands = parseCursorCommandsFromText('next next select', 'en');
      expect(commands).toHaveLength(3);
      expect(commands.filter((c) => c === 'next')).toHaveLength(2);
    });

    it('should handle Finnish commands', () => {
      const commands = parseCursorCommandsFromText('seuraava', 'fi');
      expect(commands).toContain('next');
    });

    it('should handle Swedish commands', () => {
      const commands = parseCursorCommandsFromText('nästa', 'sv');
      expect(commands).toContain('next');
    });

    it('should ignore unrecognized words', () => {
      const commands = parseCursorCommandsFromText('hello next world', 'en');
      expect(commands).toHaveLength(1);
      expect(commands[0]).toBe('next');
    });
  });
});

describe('Integration: Cursor Context', () => {
  it('should handle cursor state transitions', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    const initialState = {
      current: { startChar: 0, endChar: 0, size: 'paragraph' as const },
      lastAction: 'move' as const,
    };

    // Simulate moving cursor to next paragraph
    const afterMove = moveCursorInDirection(text, initialState.current, 'next');
    expect(afterMove.endChar).toBeGreaterThanOrEqual(initialState.current.endChar);

    // Simulate starting selection
    const selection = startSelection(afterMove);
    expect(selection.isActive).toBe(true);

    // Verify selection can be created
    expect(selection.startPos).toEqual(afterMove);
    expect(selection.endPos).toEqual(afterMove);
  });

  it('should maintain valid state through operations', () => {
    const text = 'Hello world.';
    let state = {
      current: { startChar: 0, endChar: 5, size: 'word' as const },
      lastAction: 'move' as const,
    };

    // Multiple operations
    const selection = startSelection(state.current);
    state = { ...state, selection };

    // Verify selection is created
    expect(state.selection?.isActive).toBe(true);

    // Validate final state
    expect(state.current.startChar).toBeGreaterThanOrEqual(0);
    expect(state.current.endChar).toBeLessThanOrEqual(text.length);
    expect(state.selection?.isActive).toBe(true);
  });
});
