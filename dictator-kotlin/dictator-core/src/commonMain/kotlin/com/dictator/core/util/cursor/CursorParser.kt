/**
 * Cursor Command Parser for Android
 * Parses voice input for cursor navigation and selection commands
 */

package com.dictator.core.util.cursor

import com.dictator.core.domain.entity.CursorSize

/**
 * Contains cursor command parsing logic
 */
object CursorCommandParser {
    
    private val CURSOR_SIZE_KEYWORDS = mapOf(
        "big" to CursorSize.PARAGRAPH,
        "medium" to CursorSize.WORD,
        "small" to CursorSize.CHARACTER,
        "paragraph" to CursorSize.PARAGRAPH,
        "word" to CursorSize.WORD,
        "character" to CursorSize.CHARACTER,
        "large" to CursorSize.PARAGRAPH,
        "tiny" to CursorSize.CHARACTER
    )
    
    private val NAVIGATION_KEYWORDS = setOf(
        "next", "forward", "go forward", "move forward",
        "back", "previous", "go back", "move back",
        "backward", "previous line"
    )
    
    private val SELECTION_KEYWORDS = setOf(
        "select", "select start", "select all", "select end",
        "selection", "highlight"
    )
    
    private val CURSOR_KEYWORDS = CURSOR_SIZE_KEYWORDS.keys.toSet() +
            NAVIGATION_KEYWORDS + SELECTION_KEYWORDS
    
    /**
     * Check if text contains cursor-related keywords
     * Returns true if any cursor operations are detected
     */
    fun containsCursorKeywords(text: String): Boolean {
        val lowerText = text.lowercase()
        return CURSOR_KEYWORDS.any { keyword ->
            lowerText.contains(keyword)
        }
    }
    
    /**
     * Parse cursor commands from spoken text
     * Returns list of recognized commands in order
     */
    fun parseCursorCommandsFromText(text: String): List<String> {
        val lowerText = text.lowercase()
        val commands = mutableListOf<String>()
        
        // Split text into words for sequential parsing
        val words = lowerText.split("\\s+".toRegex())
        var i = 0
        
        while (i < words.size) {
            val word = words[i]
            
            // Check for two-word commands first
            if (i + 1 < words.size) {
                val twoWord = "${word} ${words[i + 1]}"
                when {
                    twoWord in NAVIGATION_KEYWORDS -> {
                        commands.add(twoWord)
                        i += 2
                        continue
                    }
                    twoWord in SELECTION_KEYWORDS -> {
                        commands.add(twoWord)
                        i += 2
                        continue
                    }
                }
            }
            
            // Check for single-word commands
            when (word) {
                in CURSOR_SIZE_KEYWORDS -> {
                    commands.add(word)
                }
                in NAVIGATION_KEYWORDS -> {
                    commands.add(word)
                }
                in SELECTION_KEYWORDS -> {
                    commands.add(word)
                }
            }
            i++
        }
        
        return commands
    }
    
    /**
     * Detect cursor size from text
     * Returns the detected size or null if none found
     */
    fun detectCursorSize(text: String): CursorSize? {
        val lowerText = text.lowercase()
        for ((keyword, size) in CURSOR_SIZE_KEYWORDS) {
            if (lowerText.contains(keyword)) {
                return size
            }
        }
        return null
    }
    
    /**
     * Detect navigation direction from text
     * Returns "next" or "prev" if found
     */
    fun detectNavigationDirection(text: String): String? {
        val lowerText = text.lowercase()
        
        val nextWords = setOf("next", "forward", "go forward", "move forward")
        val prevWords = setOf("back", "previous", "go back", "move back", "backward")
        
        return when {
            nextWords.any { lowerText.contains(it) } -> "next"
            prevWords.any { lowerText.contains(it) } -> "prev"
            else -> null
        }
    }
    
    /**
     * Check if text contains selection keywords
     */
    fun isSelectionCommand(text: String): Boolean {
        val lowerText = text.lowercase()
        return SELECTION_KEYWORDS.any { keyword ->
            lowerText.contains(keyword)
        }
    }
    
    /**
     * Extract specific selection intent from text
     */
    fun extractSelectionIntent(text: String): String? {
        val lowerText = text.lowercase()
        
        return when {
            lowerText.contains("select all") -> "selectAll"
            lowerText.contains("select start") -> "selectStart"
            lowerText.contains("select end") -> "selectEnd"
            lowerText.contains("select") -> "toggleSelect"
            lowerText.contains("highlight") -> "toggleSelect"
            else -> null
        }
    }
    
    /**
     * Full cursor intent extraction from voice text
     * Returns a map with all detected intent information
     */
    fun extractCursorIntent(text: String): Map<String, Any?> {
        return mapOf(
            "isCursorCommand" to containsCursorKeywords(text),
            "commands" to parseCursorCommandsFromText(text),
            "cursorSize" to detectCursorSize(text),
            "navigationDirection" to detectNavigationDirection(text),
            "isSelection" to isSelectionCommand(text),
            "selectionIntent" to extractSelectionIntent(text)
        )
    }
    
    /**
     * Check if multiple movement commands are present
     * Useful for "next next next" type commands
     */
    fun countMovementCommands(text: String): Int {
        val lowerText = text.lowercase()
        return ("next" to "forward").first.let {
            lowerText.split(it).size - 1
        } + ("back" to "previous").first.let {
            lowerText.split(it).size - 1
        }
    }
}
