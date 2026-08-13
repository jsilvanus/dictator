package com.dictator.core.util.voice

/**
 * Parses voice commands and triggers from spoken text.
 * Maps common voice patterns to editor commands.
 */
object VoiceCommandParser {
    
    private val commandPatterns = mapOf(
        // Navigation
        "new document" to CommandType.NEW_DOCUMENT,
        "new line" to CommandType.NEW_LINE,
        "next line" to CommandType.NEW_LINE,
        "new paragraph" to CommandType.NEW_PARAGRAPH,
        
        // Formatting
        "bold" to CommandType.BOLD,
        "make bold" to CommandType.BOLD,
        "unbold" to CommandType.UNBOLD,
        "italic" to CommandType.ITALIC,
        "make italic" to CommandType.ITALIC,
        "unitalic" to CommandType.UNITALIC,
        "underline" to CommandType.UNDERLINE,
        "make underline" to CommandType.UNDERLINE,
        "ununderline" to CommandType.UNUNDERLINE,
        
        // Text manipulation
        "undo" to CommandType.UNDO,
        "redo" to CommandType.REDO,
        "delete" to CommandType.DELETE_WORD,
        "delete last word" to CommandType.DELETE_WORD,
        "delete line" to CommandType.DELETE_LINE,
        "select all" to CommandType.SELECT_ALL,
        "copy" to CommandType.COPY,
        "paste" to CommandType.PASTE,
        
        // AI features
        "ask ai" to CommandType.ASK_AI,
        "improve this" to CommandType.AI_IMPROVE,
        "rewrite" to CommandType.AI_REWRITE,
        "check grammar" to CommandType.AI_GRAMMAR_CHECK,
        "summarize" to CommandType.AI_SUMMARIZE,
        
        // Save and sync
        "save" to CommandType.SAVE,
        "sync" to CommandType.SYNC
    )
    
    /**
     * Parses voice input and returns the matching command.
     * Returns null if no matching command is found.
     */
    fun parseCommand(voiceInput: String): ParsedCommand? {
        val normalized = voiceInput.lowercase().trim()
        
        for ((pattern, commandType) in commandPatterns) {
            if (normalized.contains(pattern)) {
                return ParsedCommand(
                    type = commandType,
                    originalInput = voiceInput,
                    matchedPattern = pattern
                )
            }
        }
        
        // If no command matched, treat as regular text input
        return null
    }
    
    /**
     * Extracts spoken numbers from voice input.
     * Converts phrases like "twenty-three" to 23.
     */
    fun extractNumber(text: String): Int? {
        val numberWords = mapOf(
            "zero" to 0, "one" to 1, "two" to 2, "three" to 3, "four" to 4,
            "five" to 5, "six" to 6, "seven" to 7, "eight" to 8, "nine" to 9,
            "ten" to 10, "eleven" to 11, "twelve" to 12, "thirteen" to 13,
            "fourteen" to 14, "fifteen" to 15, "sixteen" to 16, "seventeen" to 17,
            "eighteen" to 18, "nineteen" to 19, "twenty" to 20, "thirty" to 30,
            "forty" to 40, "fifty" to 50, "sixty" to 60, "seventy" to 70,
            "eighty" to 80, "ninety" to 90, "hundred" to 100, "thousand" to 1000
        )
        
        val normalized = text.lowercase().trim()
        return numberWords[normalized]
    }
}

/**
 * Represents a parsed voice command.
 */
data class ParsedCommand(
    val type: CommandType,
    val originalInput: String,
    val matchedPattern: String,
    val parameters: Map<String, String> = emptyMap()
)

/**
 * Enum of supported voice commands.
 */
enum class CommandType {
    // Navigation
    NEW_DOCUMENT, NEW_LINE, NEW_PARAGRAPH,
    
    // Formatting
    BOLD, UNBOLD, ITALIC, UNITALIC, UNDERLINE, UNUNDERLINE,
    
    // Text manipulation
    UNDO, REDO, DELETE_WORD, DELETE_LINE, SELECT_ALL, COPY, PASTE,
    
    // AI features
    ASK_AI, AI_IMPROVE, AI_REWRITE, AI_GRAMMAR_CHECK, AI_SUMMARIZE,
    
    // System
    SAVE, SYNC
}
