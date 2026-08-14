/**
 * Cursor System Exports
 * Main entry points for cursor navigation and selection
 */

// Types
export type {
  CursorOperationResult,
  CursorPosition,
  CursorSize,
  CursorState,
  SelectionState,
  TextBoundary,
} from '@/lib/types/cursor';

// Navigation utilities
export {
  findCharacterBoundary,
  findParagraphBoundary,
  findWordBoundary,
  getCursorAtDocEnd,
  getCursorAtDocStart,
  getTextAtCursor,
  moveCursorInDirection,
  validateCursorRange,
} from '@/lib/cursor/navigation';

// Selection utilities
export {
  clearSelection,
  collapseSelection,
  expandSelectionTo,
  getSelectedText,
  getSelectionBounds,
  getSelectionText,
  hasSelection,
  invertSelection,
  selectAllText,
  startSelection,
  validateSelection,
} from '@/lib/cursor/selection';

// Hook
export type { } from '@/lib/hooks/useCursorState';
export { CursorProvider, useCursorState } from '@/lib/hooks/useCursorState';

// Voice command integration
export { executeCursorCommands,handleCursorCommand, parseCursorCommand } from '@/lib/voice/cursor-commands';
export type { CursorTriggerSegment, ExtendedTriggerSegment } from '@/lib/voice/cursor-parser';
export {
  containsCursorKeywords,
  detectCursorSize,
  extractCursorIntent,
  isCursorCommand,
  parseCursorCommandsFromText,
} from '@/lib/voice/cursor-parser';
