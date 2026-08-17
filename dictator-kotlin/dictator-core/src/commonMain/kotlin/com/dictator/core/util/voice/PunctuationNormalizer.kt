package com.dictator.core.util.voice

/**
 * Normalizes voice-transcribed text by mapping common speech patterns to punctuation.
 * For example, "hello period world" becomes "hello. world"
 */
object PunctuationNormalizer {
    
    private val punctuationMap = mapOf(
        // Sentence endings
        "period" to ".",
        "full stop" to ".",
        "question mark" to "?",
        "exclamation mark" to "!",
        "exclamation point" to "!",
        
        // Pauses and separators
        "comma" to ",",
        "semicolon" to ";",
        "colon" to ":",
        "dash" to "-",
        "hyphen" to "-",
        "ellipsis" to "...",
        "three dots" to "...",
        
        // Brackets and quotes
        "open parenthesis" to "(",
        "close parenthesis" to ")",
        "open bracket" to "[",
        "close bracket" to "]",
        "open brace" to "{",
        "close brace" to "}",
        "open quote" to "\"",
        "close quote" to "\"",
        "single quote" to "'",
        "apostrophe" to "'",
        
        // Mathematical
        "plus" to "+",
        "minus" to "-",
        "multiply" to "*",
        "divide" to "/",
        "equals" to "=",
        "at symbol" to "@",
        "hashtag" to "#",
        "percent" to "%",
        "dollar" to "$",
        "ampersand" to "&",
        "pipe" to "|",
        "backslash" to "\\",
        "forward slash" to "/",
        "slash" to "/"
    )
    
    /**
     * Normalizes voice input by replacing spoken punctuation with actual punctuation.
     * Example: "hello period world" -> "hello. world"
     */
    fun normalize(text: String): String {
        var result = text
        
        // Replace spoken punctuation with actual punctuation
        for ((spoken, punctuation) in punctuationMap) {
            // Match word boundaries to avoid replacing partial words
            result = result.replace(Regex("\\b$spoken\\b", RegexOption.IGNORE_CASE), punctuation)
        }
        
        // Clean up spacing around punctuation
        result = result.replace(Regex("\\s+([.,!?;:])"), "$1")
        // '[' must be escaped inside a character class: Java reads a bare '[' as opening
        // a nested class, leaving the outer one unclosed.
        result = result.replace(Regex("([(\\[{])\\s+"), "$1")
        result = result.replace(Regex("\\s+([\\])}])"), "$1")
        
        return result.trim()
    }
    
    /**
     * Normalizes common speech patterns to their written equivalents.
     * Example: "new line" -> "\n"
     */
    fun normalizeLineBreaks(text: String): String {
        var result = text
        // The spoken phrase stands in for the break itself, so the whitespace that
        // surrounded it goes with it: "line one new line line two" -> "line one\nline two".
        result = result.replace(Regex("\\s*\\bnew line\\b\\s*", RegexOption.IGNORE_CASE), "\n")
        result = result.replace(Regex("\\s*\\bnew paragraph\\b\\s*", RegexOption.IGNORE_CASE), "\n\n")
        return result
    }
    
    /**
     * Normalizes quoted text from speech.
     * Handles "quote X unquote" patterns.
     */
    fun normalizeQuotes(text: String): String {
        var result = text
        result = result.replace(Regex("quote\\s+(.+?)\\s+unquote", RegexOption.IGNORE_CASE)) { match ->
            "\"${match.groupValues[1]}\""
        }
        return result
    }
    
    /**
     * Normalizes capitalization for proper nouns and sentence starts.
     */
    fun normalizeCapitalization(text: String): String {
        val sentences = text.split(Regex("[.!?]+"))
        return sentences.map { sentence ->
            val trimmed = sentence.trim()
            if (trimmed.isEmpty()) "" else trimmed.first().uppercase() + trimmed.substring(1)
        }.joinToString(". ").trim()
    }
}
