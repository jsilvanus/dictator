/**
 * Cursor Types for Kotlin/Android
 * Defines the data structures for cursor-based text selection
 */

package com.dictator.core.domain.entity

/**
 * Cursor size for text navigation and selection
 * - paragraph: Navigate/select by paragraph (double newline separated)
 * - word: Navigate/select by word
 * - character: Navigate/select by single character
 */
enum class CursorSize {
    PARAGRAPH,
    WORD,
    CHARACTER
}

/**
 * A cursor position in the document with a size unit
 * @param startChar Absolute character position of the start
 * @param endChar Absolute character position of the end
 * @param size The size unit for this cursor
 */
data class CursorPosition(
    val startChar: Int,
    val endChar: Int,
    val size: CursorSize
)

/**
 * Selection state with direction and bounds
 * @param startPos The start position of the selection
 * @param endPos The end position of the selection
 * @param isActive Whether selection mode is currently active
 */
data class SelectionState(
    val startPos: CursorPosition,
    val endPos: CursorPosition,
    val isActive: Boolean
)

/**
 * Complete cursor state including position and selection
 * @param current Current cursor position
 * @param selection Active selection (if any)
 * @param lastAction Last action performed (move or select)
 */
data class CursorState(
    val current: CursorPosition,
    val selection: SelectionState? = null,
    val lastAction: String = "move"
)

/**
 * Result of a cursor operation
 * @param newState The new cursor state after the operation
 * @param feedback Human-readable feedback message
 * @param selectedText The text that was selected (if applicable)
 * @param isAtBoundary Whether we've reached a document boundary
 */
data class CursorOperationResult(
    val newState: CursorState,
    val feedback: String,
    val selectedText: String? = null,
    val isAtBoundary: Boolean = false
)
