/**
 * Cursor Command Parser for Android
 * Parses voice input for cursor navigation and selection commands using regex-based patterns.
 * This implementation maintains parity with web platform voice parsing.
 * 
 * REGEX APPROACH (Parity with web):
 * - Matches patterns with word boundaries: \b(pattern)\b
 * - Supports punctuation and spacing variations: [,:-]?\s*
 * - Case-insensitive matching
 */

package com.dictator.core.util.cursor

import com.dictator.core.domain.entity.CursorSize

/**
 * Contains cursor command parsing logic with regex-based pattern matching
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
     * Escapes special regex characters in a string.
     * Used to safely embed literal strings in regex patterns.
     */
    private fun escapeRegex(value: String): String {
        return value.replace(Regex("""[.*+?^${'$'}(){}|\[\]\\]"""), "\\$0")
    }
    
    /**
     * Builds a regex pattern for cursor command matching with word boundaries.
     * Pattern format: \b(cmd1|cmd2|cmd3)\b\s*[,:-]?\s*
     * This matches commands with optional punctuation/spacing, maintaining parity with web.
     */
    private fun buildCursorCommandPattern(triggers: Set<String>): Regex {
        if (triggers.isEmpty()) {
            return Regex("^$")
        }
        
        val escapedTriggers = triggers
            .sortedByDescending { it.length }  // Longer patterns first for precedence
            .map { escapeRegex(it.trim()) }
            .joinToString("|")
        
        // Pattern: word boundary + (triggers) + word boundary + optional punctuation + whitespace
        val pattern = "\\b($escapedTriggers)\\b\\s*[,:-]?\\s*"
        return Regex(pattern, RegexOption.IGNORE_CASE)
    }
    
    /**
     * Check if text contains cursor-related keywords using regex patterns.
     * Returns true if any cursor operations are detected.
     * More robust than simple contains() - handles punctuation and spacing variations.
     */
    fun containsCursorKeywords(text: String): Boolean {
        val lowerText = text.lowercase()
        
        // Build pattern from all cursor keywords
        val pattern = buildCursorCommandPattern(CURSOR_KEYWORDS)
        return pattern.containsMatchIn(lowerText)
    }
    
    /**
     * Parse cursor commands from spoken text using regex patterns.
     * Returns list of recognized commands in order.
     * Uses regex to handle punctuation and spacing variations.
     */
    fun parseCursorCommandsFromText(text: String): List<String> {
        val lowerText = text.lowercase()
        val commands = mutableListOf<String>()
        
        // Parse cursor size keywords
        val sizePattern = buildCursorCommandPattern(CURSOR_SIZE_KEYWORDS.keys)
        sizePattern.findAll(lowerText).forEach { match ->
            val keyword = match.groupValues[1]
            commands.add(keyword)
        }
        
        // Parse navigation keywords
        val navPattern = buildCursorCommandPattern(NAVIGATION_KEYWORDS)
        navPattern.findAll(lowerText).forEach { match ->
            val keyword = match.groupValues[1]
            commands.add(keyword)
        }
        
        // Parse selection keywords
        val selectionPattern = buildCursorCommandPattern(SELECTION_KEYWORDS)
        selectionPattern.findAll(lowerText).forEach { match ->
            val keyword = match.groupValues[1]
            commands.add(keyword)
        }
        
        return commands
    }
    
    /**
     * Detect cursor size from text using regex patterns.
     * Returns the detected size or null if none found.
     * Prioritizes longer matches (e.g., "paragraph" over "para").
     */
    fun detectCursorSize(text: String): CursorSize? {
        val lowerText = text.lowercase()
        
        // Sort by length descending to match longest patterns first
        return CURSOR_SIZE_KEYWORDS.entries
            .sortedByDescending { it.key.length }
            .firstOrNull { entry ->
                val pattern = Regex("\\b${escapeRegex(entry.key)}\\b", RegexOption.IGNORE_CASE)
                pattern.containsMatchIn(lowerText)
            }
            ?.value
    }
    
    /**
     * Detect navigation direction from text using regex patterns.
     * Returns "next" or "prev" if found.
     */
    fun detectNavigationDirection(text: String): String? {
        val lowerText = text.lowercase()
        
        val nextWords = setOf("next", "forward", "go forward", "move forward")
        val prevWords = setOf("back", "previous", "go back", "move back", "backward")
        
        // Check with word boundaries for more precise matching
        val nextPattern = buildCursorCommandPattern(nextWords)
        val prevPattern = buildCursorCommandPattern(prevWords)
        
        return when {
            nextPattern.containsMatchIn(lowerText) -> "next"
            prevPattern.containsMatchIn(lowerText) -> "prev"
            else -> null
        }
    }
    
    /**
     * Check if text contains selection keywords using regex patterns.
     */
    fun isSelectionCommand(text: String): Boolean {
        val lowerText = text.lowercase()
        val pattern = buildCursorCommandPattern(SELECTION_KEYWORDS)
        return pattern.containsMatchIn(lowerText)
    }
    
    /**
     * Extract specific selection intent from text using regex patterns.
     * More precise than substring matching.
     */
    fun extractSelectionIntent(text: String): String? {
        val lowerText = text.lowercase()
        
        // Use word boundaries for more precise matching
        return when {
            Regex("\\bselect\\s+all\\b", RegexOption.IGNORE_CASE).containsMatchIn(lowerText) -> "selectAll"
            Regex("\\bselect\\s+start\\b", RegexOption.IGNORE_CASE).containsMatchIn(lowerText) -> "selectStart"
            Regex("\\bselect\\s+end\\b", RegexOption.IGNORE_CASE).containsMatchIn(lowerText) -> "selectEnd"
            Regex("\\bselect\\b", RegexOption.IGNORE_CASE).containsMatchIn(lowerText) -> "toggleSelect"
            Regex("\\bhighlight\\b", RegexOption.IGNORE_CASE).containsMatchIn(lowerText) -> "toggleSelect"
            else -> null
        }
    }
    
    /**
     * Full cursor intent extraction from voice text using regex patterns.
     * Returns a map with all detected intent information.
     */
    fun extractCursorIntent(text: String): Map<String, Any?> {
        return mapOf(
            "isCursorCommand" to containsCursorKeywords(text),
            "commands" to parseCursorCommandsFromText(text),
            "cursorSize" to detectCursorSize(text),
            "navigationDirection" to detectNavigationDirection(text),
            "isSelection" to isSelectionCommand(text),
            "selectionIntent" to extractSelectionIntent(text),
            "parsingMethod" to "regex"  // Track that regex parsing was used
        )
    }
    
    /**
     * Check if multiple movement commands are present.
     * Useful for "next next next" type commands.
     * Uses word boundaries for precise matching.
     */
    fun countMovementCommands(text: String): Int {
        val lowerText = text.lowercase()
        
        val nextMatches = Regex("\\bnext\\b|\\bforward\\b", RegexOption.IGNORE_CASE)
            .findAll(lowerText).count()
        
        val prevMatches = Regex("\\bback\\b|\\bprevious\\b", RegexOption.IGNORE_CASE)
            .findAll(lowerText).count()
        
        return nextMatches + prevMatches
    }
}
