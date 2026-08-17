package com.dictator.core.util.voice

import com.dictator.core.data.voice.ActivationCommand

/**
 * Parses voice commands and triggers from spoken text using regex-based pattern matching.
 * This implementation maintains parity with web platform voice parsing.
 * 
 * REGEX APPROACH (Parity with web):
 * - Matches patterns with word boundaries: \b(pattern)\b
 * - Supports punctuation and spacing variations: [,:-]?\s*
 * - Case-insensitive matching
 * 
 * Maps common voice patterns to editor commands.
 * Supports language-specific activation commands.
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
     * Escapes special regex characters in a string.
     * Used to safely embed literal strings in regex patterns.
     */
    private fun escapeRegex(value: String): String {
        return value.replace(Regex("""[.*+?^${'$'}(){}|\[\]\\]"""), "\\$0")
    }
    
    /**
     * Builds a regex pattern for command matching with word boundaries.
     * Pattern format: \b(cmd1|cmd2|cmd3)\b\s*[,:-]?\s*
     * This matches commands with optional punctuation/spacing, maintaining parity with web.
     */
    private fun buildCommandPattern(triggers: List<String>): Regex {
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
     * Parses voice input and returns the matching command.
     * Uses regex-based pattern matching for consistency with web platform.
     * Returns null if no matching command is found.
     * 
     * @param voiceInput The spoken text to parse
     * @param activationCommands Optional language-specific activation commands for trigger detection
     * @param language Optional language code for multi-language support
     */
    fun parseCommand(
        voiceInput: String,
        activationCommands: List<ActivationCommand>? = null,
        language: String? = null
    ): ParsedCommand? {
        val normalized = voiceInput.lowercase().trim()
        
        if (normalized.isEmpty()) {
            return null
        }
        
        // Check activation commands first if provided
        if (activationCommands != null && activationCommands.isNotEmpty()) {
            // Extract activation phrases and build regex pattern
            val phrases = activationCommands.flatMap { it.phrases }
            if (phrases.isNotEmpty()) {
                val pattern = buildCommandPattern(phrases)
                val match = pattern.find(normalized)
                
                if (match != null) {
                    val matchedPhrase = match.groupValues[1]
                    val cmd = activationCommands.find { activationCmd ->
                        activationCmd.phrases.any { it.lowercase() == matchedPhrase.lowercase() }
                    }
                    
                    if (cmd != null) {
                        // Map activation command type to trigger
                        val commandType = when (cmd.type) {
                            "command" -> CommandType.ACTIVATE_DICTATION
                            "ai" -> CommandType.ACTIVATE_AI
                            else -> null
                        }
                        
                        if (commandType != null) {
                            return ParsedCommand(
                                type = commandType,
                                originalInput = voiceInput,
                                matchedPattern = matchedPhrase,
                                parameters = mapOf(
                                    "commandType" to cmd.type,
                                    "language" to (language ?: "unknown"),
                                    "parsingMethod" to "regex"
                                )
                            )
                        }
                    }
                }
            }
        }
        
        // Then check standard command patterns using regex
        val patternKeys = commandPatterns.keys.toList()
        if (patternKeys.isNotEmpty()) {
            val pattern = buildCommandPattern(patternKeys)
            val match = pattern.find(normalized)
            
            if (match != null) {
                val matchedPattern = match.groupValues[1]
                // Find the original command that was matched
                val commandType = patternKeys
                    .sortedByDescending { it.length }
                    .firstOrNull { it.lowercase() == matchedPattern.lowercase() }
                    ?.let { commandPatterns[it] }
                
                if (commandType != null) {
                    return ParsedCommand(
                        type = commandType,
                        originalInput = voiceInput,
                        matchedPattern = matchedPattern,
                        parameters = mapOf(
                            "parsingMethod" to "regex"
                        )
                    )
                }
            }
        }
        
        // If no command matched, treat as regular text input
        return null
    }
    
    /**
     * Legacy parseCommand for backward compatibility
     */
    fun parseCommand(voiceInput: String): ParsedCommand? {
        return parseCommand(voiceInput, null, null)
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
    
    // Activation triggers
    ACTIVATE_DICTATION, ACTIVATE_AI,
    
    // System
    SAVE, SYNC
}
