/**
 * Cursor Selection Functions for Kotlin/Android
 * Implements selection creation, expansion, and manipulation
 */

package com.dictator.core.util.cursor

import com.dictator.core.domain.entity.CursorPosition
import com.dictator.core.domain.entity.CursorSize
import com.dictator.core.domain.entity.CursorState
import com.dictator.core.domain.entity.SelectionState

/**
 * Start a new selection from current cursor position
 */
fun startSelection(text: String, size: CursorSize, cursor: CursorPosition): SelectionState {
    return SelectionState(
        startPos = cursor,
        endPos = cursor,
        isActive = true
    )
}

/**
 * Expand selection in a direction
 */
fun expandSelectionTo(
    selection: SelectionState,
    cursor: CursorPosition,
    direction: String,
    text: String
): SelectionState {
    val newEnd = moveCursorInDirection(text, selection.endPos, direction)
    
    return SelectionState(
        startPos = selection.startPos,
        endPos = newEnd,
        isActive = true
    )
}

/**
 * Collapse selection to a single cursor
 */
fun collapseSelection(state: CursorState): CursorState {
    return state.copy(
        selection = state.selection?.copy(isActive = false),
        lastAction = "move"
    )
}

/**
 * Get the selected text from the document
 */
fun getSelectionText(text: String, selection: SelectionState): String {
    val start = selection.startPos.startChar.coerceIn(0, text.length)
    val end = selection.endPos.endChar.coerceIn(start, text.length)
    return text.substring(start, end)
}

/**
 * Clear selection from cursor state
 */
fun clearSelection(state: CursorState): CursorState {
    return state.copy(selection = null, lastAction = "move")
}

/**
 * Validate selection boundaries
 */
fun validateSelection(text: String, selection: SelectionState): SelectionState {
    return selection.copy(
        startPos = validateCursorRange(text, selection.startPos),
        endPos = validateCursorRange(text, selection.endPos)
    )
}

/**
 * Get selected text from cursor state
 */
fun getSelectedText(text: String, state: CursorState): String {
    return if (state.selection?.isActive == true) {
        getSelectionText(text, state.selection)
    } else {
        ""
    }
}

/**
 * Check if there's an active selection
 */
fun hasSelection(state: CursorState): Boolean {
    return state.selection?.isActive == true
}

/**
 * Select all text in document
 */
fun selectAllText(text: String, size: CursorSize): SelectionState {
    val startPos = CursorPosition(0, 0, size)
    val endPos = CursorPosition(text.length, text.length, size)
    
    return SelectionState(
        startPos = startPos,
        endPos = endPos,
        isActive = true
    )
}
