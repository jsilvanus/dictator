/**
 * Cursor Provider Component
 * React Context Provider for cursor state management
 */

'use client';

import { createContext, ReactNode,useCallback, useContext, useState } from 'react';

import { moveCursorInDirection, validateCursorRange } from '@/lib/cursor/navigation';
import { clearSelection, expandSelectionTo, getSelectedText, getSelectionText, hasSelection, selectAllText, startSelection } from '@/lib/cursor/selection';
import type { CursorOperationResult, CursorSize, CursorState } from '@/lib/types/cursor';

export interface CursorContextType {
  cursorState: CursorState;
  setCursorSize: (size: CursorSize) => void;
  moveCursor: (direction: 'next' | 'prev', text: string) => CursorOperationResult;
  startSelectMode: (text: string) => void;
  expandSelection: (direction: 'next' | 'prev', text: string) => CursorOperationResult;
  endSelection: () => CursorOperationResult;
  selectAll: (text: string) => CursorOperationResult;
  clearCursorSelection: () => void;
  getCursorInfo: () => { size: CursorSize; position: string; selectedLength: number };
  getSelectedText: (text: string) => string;
  hasSelection: (state?: CursorState) => boolean;
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

/**
 * Initialize cursor state at document start with paragraph size
 */
function initializeCursorState(): CursorState {
  return {
    current: {
      startChar: 0,
      endChar: 0,
      size: 'paragraph',
    },
    lastAction: 'move',
  };
}

/**
 * Create human-readable position feedback
 */
function getPositionFeedback(state: CursorState, text: string): string {
  const { size } = state.current;
  const selectedLength = state.selection
    ? Math.abs(state.selection.endPos.endChar - state.selection.startPos.startChar)
    : state.current.endChar - state.current.startChar;

  const sizeLabel = size === 'paragraph' ? 'paragraph' : size === 'word' ? 'word' : 'character';

  if (!state.selection?.isActive) {
    return `Cursor at ${sizeLabel}`;
  }

  // Count how many units are selected
  let count = 1;
  if (size === 'paragraph' && selectedLength > 0) {
    count = (text.substring(
      state.selection.startPos.startChar,
      state.selection.endPos.endChar,
    ).match(/\n\n/g) || []).length + 1;
  }

  return `Selected ${count} ${sizeLabel}${count > 1 ? 's' : ''}`;
}

export function CursorProvider({ children }: { children: ReactNode }) {
  const [cursorState, setCursorState] = useState<CursorState>(initializeCursorState());

  const setCursorSize = useCallback((size: CursorSize) => {
    setCursorState((prev) => ({
      ...prev,
      current: {
        ...prev.current,
        size,
      },
    }));
  }, []);

  const moveCursor = useCallback((direction: 'next' | 'prev', text: string): CursorOperationResult => {
    const newPosition = moveCursorInDirection(text, cursorState.current, direction);
    const validated = validateCursorRange(text, newPosition);

    setCursorState({
      current: validated,
      lastAction: 'move',
    });

    const isAtBoundary =
      (direction === 'next' && validated.endChar >= text.length) ||
      (direction === 'prev' && validated.startChar <= 0);

    return {
      newState: {
        current: validated,
        lastAction: 'move',
      },
      feedback: getPositionFeedback({ current: validated, lastAction: 'move' }, text),
      isAtBoundary,
    };
  }, [cursorState]);

  const startSelectMode = useCallback((_text: string) => {
    const selection = startSelection(cursorState.current);
    const newState = {
      ...cursorState,
      selection,
      lastAction: 'select' as const,
    };

    setCursorState(newState);
  }, [cursorState]);

  const expandSelection = useCallback(
    (direction: 'next' | 'prev', text: string): CursorOperationResult => {
      if (!cursorState.selection?.isActive) {
        return {
          newState: cursorState,
          feedback: 'No active selection',
          isAtBoundary: false,
        };
      }

      const expanded = expandSelectionTo(text, cursorState.selection, direction);
      const newState = {
        ...cursorState,
        selection: expanded,
        lastAction: 'select' as const,
      };

      setCursorState(newState);

      const selectedText = getSelectionText(text, expanded);
      return {
        newState,
        feedback: getPositionFeedback(newState, text),
        selectedText,
        isAtBoundary: false,
      };
    },
    [cursorState],
  );

  const endSelection = useCallback((): CursorOperationResult => {
    if (!cursorState.selection?.isActive) {
      return {
        newState: cursorState,
        feedback: 'No active selection',
        isAtBoundary: false,
      };
    }

    const newState = {
      ...cursorState,
      selection: { ...cursorState.selection, isActive: false },
      lastAction: 'move' as const,
    };

    setCursorState(newState);

    return {
      newState,
      feedback: 'Selection ended',
      isAtBoundary: false,
    };
  }, [cursorState]);

  const selectAll = useCallback((text: string): CursorOperationResult => {
    const selection = selectAllText(text, cursorState.current.size);
    const newState = {
      ...cursorState,
      selection,
      lastAction: 'select' as const,
    };

    setCursorState(newState);

    return {
      newState,
      feedback: 'Entire document selected',
      selectedText: text,
      isAtBoundary: false,
    };
  }, [cursorState]);

  const clearCursorSelection = useCallback(() => {
    setCursorState((prev) => clearSelection(prev));
  }, []);

  const getCursorInfo = useCallback(() => {
    const size = cursorState.current.size;
    const position = `${cursorState.current.startChar}-${cursorState.current.endChar}`;
    const selectedLength = cursorState.selection?.isActive
      ? Math.abs(cursorState.selection.endPos.endChar - cursorState.selection.startPos.startChar)
      : 0;

    return { size, position, selectedLength };
  }, [cursorState]);

  const contextValue: CursorContextType = {
    cursorState,
    setCursorSize,
    moveCursor,
    startSelectMode,
    expandSelection,
    endSelection,
    selectAll,
    clearCursorSelection,
    getCursorInfo,
    getSelectedText: (text: string) => getSelectedText(text, cursorState),
    hasSelection: (state?: CursorState) => hasSelection(state || cursorState),
  };

  return (
    <CursorContext.Provider value={contextValue}>
      {children}
    </CursorContext.Provider>
  );
}

/**
 * Hook to access cursor state and operations
 */
export function useCursorState(): CursorContextType {
  const context = useContext(CursorContext);
  if (!context) {
    throw new Error('useCursorState must be used within CursorProvider');
  }
  return context;
}
