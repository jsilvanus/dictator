package com.dictator.core.actor

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Manages the text selection "holding shelf" for the deterministic editor (Blue pill).
 * Allows the Blue pill to anchor a selected text range, count words, and display
 * selection status.
 */
class ActorSelectionHolder {
    private val _holdingState = MutableStateFlow<ActorPillStatus.HoldingSelection?>(null)
    val holdingState: StateFlow<ActorPillStatus.HoldingSelection?> = _holdingState.asStateFlow()

    /**
     * Holds a text range in the selector shelf.
     * Computes word count from document content.
     */
    fun holdSelection(docText: String, startChar: Int, endChar: Int): ActorPillStatus.HoldingSelection {
        val safeStart = startChar.coerceIn(0, docText.length)
        val safeEnd = endChar.coerceIn(safeStart, docText.length)
        val range = TextRangeBounds(safeStart, safeEnd)

        val snippet = if (safeStart < safeEnd) docText.substring(safeStart, safeEnd) else ""
        val wordCount = countWords(snippet)

        val state = ActorPillStatus.HoldingSelection(
            selectedRange = range,
            wordCount = wordCount
        )
        _holdingState.value = state
        return state
    }

    /**
     * Clears any active selection from the holding shelf.
     */
    fun clearSelection() {
        _holdingState.value = null
    }

    /**
     * Whether a selection is currently active in the shelf.
     */
    val isHolding: Boolean get() = _holdingState.value != null

    companion object {
        fun countWords(text: String): Int {
            if (text.isBlank()) return 0
            return text.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.size
        }
    }
}
