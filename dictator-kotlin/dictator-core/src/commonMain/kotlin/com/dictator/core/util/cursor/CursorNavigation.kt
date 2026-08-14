/**
 * Cursor Navigation Functions for Kotlin/Android
 * Implements text boundary finding and cursor movement
 */

package com.dictator.core.util.cursor

import com.dictator.core.domain.entity.CursorPosition
import com.dictator.core.domain.entity.CursorSize
import com.dictator.core.domain.entity.CursorState

/**
 * Find paragraph boundaries in text (separated by double newlines)
 */
fun findParagraphBoundary(text: String, position: Int, direction: String): Pair<Int, Int> {
    if (text.isEmpty()) return Pair(0, 0)
    
    val normalized = position.coerceIn(0, text.length)
    
    // Find start of current paragraph
    var paraStart = normalized
    while (paraStart > 0 && text[paraStart - 1] != '\n') {
        paraStart--
    }
    // Skip leading newlines
    while (paraStart > 0 && text[paraStart - 1] == '\n') {
        paraStart--
    }
    
    // Find end of current paragraph
    var paraEnd = normalized
    while (paraEnd < text.length && text[paraEnd] != '\n') {
        paraEnd++
    }
    
    return when (direction) {
        "next" -> {
            // Move to next paragraph
            var nextStart = paraEnd
            while (nextStart < text.length && text[nextStart] == '\n') {
                nextStart++
            }
            var nextEnd = nextStart
            while (nextEnd < text.length && text[nextEnd] != '\n') {
                nextEnd++
            }
            Pair(nextStart, nextEnd)
        }
        "prev" -> Pair(paraStart, paraEnd)
        else -> Pair(paraStart, paraEnd)
    }
}

/**
 * Find word boundaries in text
 */
fun findWordBoundary(text: String, position: Int, direction: String): Pair<Int, Int> {
    if (text.isEmpty()) return Pair(0, 0)
    
    val normalized = position.coerceIn(0, text.length)
    
    // Find start of current word
    var wordStart = normalized
    while (wordStart > 0 && !text[wordStart - 1].isWhitespace()) {
        wordStart--
    }
    
    // Find end of current word
    var wordEnd = normalized
    while (wordEnd < text.length && !text[wordEnd].isWhitespace()) {
        wordEnd++
    }
    
    return when (direction) {
        "next" -> {
            // Move to next word
            var nextStart = wordEnd
            while (nextStart < text.length && text[nextStart].isWhitespace()) {
                nextStart++
            }
            var nextEnd = nextStart
            while (nextEnd < text.length && !text[nextEnd].isWhitespace()) {
                nextEnd++
            }
            Pair(nextStart, nextEnd)
        }
        "prev" -> Pair(wordStart, wordEnd)
        else -> Pair(wordStart, wordEnd)
    }
}

/**
 * Find character boundaries (single character)
 */
fun findCharacterBoundary(text: String, position: Int, direction: String): Pair<Int, Int> {
    val normalized = position.coerceIn(0, text.length)
    
    return when (direction) {
        "next" -> {
            val nextPos = (normalized + 1).coerceAtMost(text.length)
            Pair(normalized, nextPos)
        }
        "prev" -> {
            val prevPos = (normalized - 1).coerceAtLeast(0)
            Pair(prevPos, normalized)
        }
        else -> Pair(normalized, normalized + 1)
    }
}

/**
 * Move cursor in a direction by the current size unit
 */
fun moveCursorInDirection(
    text: String,
    cursor: CursorPosition,
    direction: String
): CursorPosition {
    val (start, end) = when (cursor.size) {
        CursorSize.PARAGRAPH -> findParagraphBoundary(text, cursor.startChar, direction)
        CursorSize.WORD -> findWordBoundary(text, cursor.startChar, direction)
        CursorSize.CHARACTER -> findCharacterBoundary(text, cursor.startChar, direction)
    }
    
    return CursorPosition(start, end, cursor.size)
}

/**
 * Validate and clamp cursor range to document bounds
 */
fun validateCursorRange(text: String, cursor: CursorPosition): CursorPosition {
    val maxPos = text.length
    return CursorPosition(
        startChar = cursor.startChar.coerceIn(0, maxPos),
        endChar = cursor.endChar.coerceIn(cursor.startChar, maxPos),
        size = cursor.size
    )
}

/**
 * Get text at cursor position
 */
fun getTextAtCursor(text: String, cursor: CursorPosition): String {
    val start = cursor.startChar.coerceIn(0, text.length)
    val end = cursor.endChar.coerceIn(start, text.length)
    return text.substring(start, end)
}

/**
 * Get cursor at document start
 */
fun getCursorAtDocStart(size: CursorSize): CursorPosition {
    return CursorPosition(0, 0, size)
}

/**
 * Get cursor at document end
 */
fun getCursorAtDocEnd(text: String, size: CursorSize): CursorPosition {
    return CursorPosition(text.length, text.length, size)
}
