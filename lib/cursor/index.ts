/**
 * Cursor System Exports
 * Main entry points for cursor navigation and selection
 */

// Types
export type {
  CursorSize,
  CursorPosition,
  SelectionState,
  CursorState,
  CursorOperationResult,
  TextBoundary,
} from '@/lib/types/cursor';

// Navigation utilities
export {
  findParagraphBoundary,
  findWordBoundary,
  findCharacterBoundary,
  getTextAtCursor,
  moveCursorInDirection,
  validateCursorRange,
  getCursorAtDocStart,
  getCursorAtDocEnd,
} from '@/lib/cursor/navigation';

// Selection utilities
export {
  expandSelectionTo,
  collapseSelection,
  getSelectionText,
  getSelectionBounds,
  invertSelection,
  startSelection,
  selectAllText,
  hasSelection,
  getSelectedText,
  clearSelection,
  validateSelection,
} from '@/lib/cursor/selection';

// Hook
export { CursorProvider, useCursorState } from '@/lib/hooks/useCursorState';
export type { } from '@/lib/hooks/useCursorState';

// Voice command integration
export { handleCursorCommand, parseCursorCommand, executeCursorCommands } from '@/lib/voice/cursor-commands';
export {
  containsCursorKeywords,
  parseCursorCommandsFromText,
  detectCursorSize,
  isCursorCommand,
  extractCursorIntent,
} from '@/lib/voice/cursor-parser';
export type { CursorTriggerSegment, ExtendedTriggerSegment } from '@/lib/voice/cursor-parser';
