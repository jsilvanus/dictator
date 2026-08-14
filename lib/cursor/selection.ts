/**
 * Selection Management Utilities
 * Handles expanding, collapsing, and manipulating text selections
 */

import type { CursorPosition, CursorState,SelectionState } from '@/lib/types/cursor';

import { moveCursorInDirection, validateCursorRange } from './navigation';

/**
 * Expand selection in a direction
 */
export function expandSelectionTo(
  text: string,
  currentSelection: SelectionState,
  direction: 'next' | 'prev',
): SelectionState {
  const expandFromPos = currentSelection.isExpanding ? currentSelection.endPos : currentSelection.startPos;

  const newEnd = moveCursorInDirection(text, expandFromPos, direction);

  return {
    isActive: true,
    startPos: currentSelection.startPos,
    endPos: newEnd,
    isExpanding: currentSelection.isExpanding,
  };
}

/**
 * Collapse selection to a single cursor position
 * Defaults to the end of the selection if expanding, start if contracting
 */
export function collapseSelection(selection: SelectionState, moveToEnd: boolean = true): CursorPosition {
  if (moveToEnd && selection.isExpanding) {
    return selection.endPos;
  }
  return selection.startPos;
}

/**
 * Get all text within a selection
 */
export function getSelectionText(text: string, selection: SelectionState): string {
  const start = Math.min(selection.startPos.startChar, selection.endPos.startChar);
  const end = Math.max(selection.startPos.endChar, selection.endPos.endChar);
  return text.slice(start, end);
}

/**
 * Get the bounds of a selection (min/max positions)
 */
export function getSelectionBounds(selection: SelectionState): { start: number; end: number } {
  const start = Math.min(selection.startPos.startChar, selection.endPos.startChar);
  const end = Math.max(selection.startPos.endChar, selection.endPos.endChar);
  return { start, end };
}

/**
 * Invert selection - select everything EXCEPT current selection
 */
export function invertSelection(text: string, selection: SelectionState): SelectionState {
  const { start, end } = getSelectionBounds(selection);

  if (start === 0 && end === text.length) {
    // Nothing to invert if entire document is selected
    return {
      isActive: false,
      startPos: { startChar: 0, endChar: 0, size: selection.startPos.size },
      endPos: { startChar: 0, endChar: 0, size: selection.startPos.size },
      isExpanding: false,
    };
  }

  return {
    isActive: true,
    startPos: {
      startChar: 0,
      endChar: start,
      size: selection.startPos.size,
    },
    endPos: {
      startChar: end,
      endChar: text.length,
      size: selection.startPos.size,
    },
    isExpanding: true,
  };
}

/**
 * Start a new selection from a cursor position
 */
export function startSelection(cursorPos: CursorPosition): SelectionState {
  return {
    isActive: true,
    startPos: cursorPos,
    endPos: cursorPos,
    isExpanding: true,
  };
}

/**
 * Select all text in document
 */
export function selectAllText(text: string, cursorSize: string): SelectionState {
  return {
    isActive: true,
    startPos: {
      startChar: 0,
      endChar: 0,
      size: cursorSize as any,
    },
    endPos: {
      startChar: text.length,
      endChar: text.length,
      size: cursorSize as any,
    },
    isExpanding: true,
  };
}

/**
 * Check if cursor state has an active selection
 */
export function hasSelection(state: CursorState): boolean {
  return state.selection?.isActive ?? false;
}

/**
 * Get selected text from cursor state
 */
export function getSelectedText(text: string, state: CursorState): string {
  if (!state.selection?.isActive) {
    return getTextAtCursor(text, state.current);
  }
  return getSelectionText(text, state.selection);
}

/**
 * Get text at current cursor (single unit)
 */
function getTextAtCursor(text: string, cursorPos: CursorPosition): string {
  return text.slice(cursorPos.startChar, cursorPos.endChar);
}

/**
 * Clear selection, keeping current cursor position
 */
export function clearSelection(state: CursorState): CursorState {
  return {
    ...state,
    selection: undefined,
    lastAction: 'move',
  };
}

/**
 * Validate selection doesn't exceed document bounds
 */
export function validateSelection(text: string, selection: SelectionState): SelectionState {
  return {
    ...selection,
    startPos: validateCursorRange(text, selection.startPos),
    endPos: validateCursorRange(text, selection.endPos),
  };
}
