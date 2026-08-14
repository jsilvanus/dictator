/**
 * Cursor-based selection system for Dictator
 * Enables granular control over what text is sent to AI
 */

export type CursorSize = 'character' | 'word' | 'paragraph';

/**
 * Represents a position in the text with a specific cursor size
 * startChar and endChar are absolute positions in the full text
 */
export interface CursorPosition {
  startChar: number;
  endChar: number;
  size: CursorSize;
}

/**
 * Represents an active selection with start and end positions
 */
export interface SelectionState {
  isActive: boolean;
  startPos: CursorPosition;
  endPos: CursorPosition;
  isExpanding: boolean; // true if expanding in forward direction, false if backward
}

/**
 * Complete cursor state tracking
 */
export interface CursorState {
  current: CursorPosition;
  selection?: SelectionState;
  lastAction: 'move' | 'select' | 'expand';
}

/**
 * Cursor operation results with feedback
 */
export interface CursorOperationResult {
  newState: CursorState;
  feedback: string; // Voice feedback message
  selectedText?: string;
  isAtBoundary: boolean;
}

/**
 * Result of finding text boundaries
 */
export interface TextBoundary {
  start: number;
  end: number;
  text: string;
}
