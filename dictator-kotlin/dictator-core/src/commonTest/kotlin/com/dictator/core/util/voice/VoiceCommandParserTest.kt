package com.dictator.core.util.voice

import com.dictator.core.data.voice.ActivationCommand
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/**
 * Unit tests for VoiceCommandParser.
 * Tests regex-based voice parsing for parity with web platform.
 */
class VoiceCommandParserTest {
    
    @Test
    fun testParseNewDocumentCommand() {
        val result = VoiceCommandParser.parseCommand("new document")
        assertEquals(CommandType.NEW_DOCUMENT, result?.type)
        assertEquals("new document", result?.matchedPattern)
    }
    
    @Test
    fun testParseBoldCommand() {
        val result = VoiceCommandParser.parseCommand("bold")
        assertEquals(CommandType.BOLD, result?.type)
    }
    
    @Test
    fun testParseCaseInsensitive() {
        val result = VoiceCommandParser.parseCommand("BOLD")
        assertEquals(CommandType.BOLD, result?.type)
    }
    
    @Test
    fun testParseCommandWithExtra() {
        val result = VoiceCommandParser.parseCommand("please make this text bold")
        assertEquals(CommandType.BOLD, result?.type)
    }
    
    @Test
    fun testParseCommandNotFound() {
        val result = VoiceCommandParser.parseCommand("this is just regular text")
        assertNull(result)
    }
    
    @Test
    fun testExtractNumber() {
        val one = VoiceCommandParser.extractNumber("one")
        assertEquals(1, one)
        
        val twenty = VoiceCommandParser.extractNumber("twenty")
        assertEquals(20, twenty)
        
        val invalid = VoiceCommandParser.extractNumber("not a number")
        assertNull(invalid)
    }
    
    // ===== NEW TESTS FOR REGEX PATTERN MATCHING =====
    
    @Test
    fun testParseCommandWithPunctuation() {
        // Test that punctuation doesn't break pattern matching
        val result1 = VoiceCommandParser.parseCommand("bold,")
        assertNotNull(result1)
        assertEquals(CommandType.BOLD, result1.type)
        
        val result2 = VoiceCommandParser.parseCommand("bold:")
        assertNotNull(result2)
        assertEquals(CommandType.BOLD, result2.type)
        
        val result3 = VoiceCommandParser.parseCommand("bold-")
        assertNotNull(result3)
        assertEquals(CommandType.BOLD, result3.type)
    }
    
    @Test
    fun testParseCommandWithSpacingVariations() {
        // Test that extra spacing doesn't break pattern matching
        val result1 = VoiceCommandParser.parseCommand("  bold  ")
        assertNotNull(result1)
        assertEquals(CommandType.BOLD, result1.type)
        
        val result2 = VoiceCommandParser.parseCommand("bold     ")
        assertNotNull(result2)
        assertEquals(CommandType.BOLD, result2.type)
        
        val result3 = VoiceCommandParser.parseCommand("     bold")
        assertNotNull(result3)
        assertEquals(CommandType.BOLD, result3.type)
    }
    
    @Test
    fun testParseMultiWordCommandWithPunctuation() {
        // Test multi-word commands with punctuation
        val result1 = VoiceCommandParser.parseCommand("new document,")
        assertNotNull(result1)
        assertEquals(CommandType.NEW_DOCUMENT, result1.type)
        
        val result2 = VoiceCommandParser.parseCommand("new document:")
        assertNotNull(result2)
        assertEquals(CommandType.NEW_DOCUMENT, result2.type)
    }
    
    @Test
    fun testParseCommandWordBoundaryPrecision() {
        // Test that word boundaries prevent false matches
        // "boldface" should NOT match "bold"
        val result = VoiceCommandParser.parseCommand("boldface")
        assertNull(result)  // Should not match "bold" in "boldface"
    }
    
    @Test
    fun testParseCommandWithMixedPunctuationAndSpacing() {
        // Test complex punctuation and spacing combinations
        val result = VoiceCommandParser.parseCommand("bold , make it bold")
        assertNotNull(result)
        assertEquals(CommandType.BOLD, result.type)
        assertEquals("regex", result.parameters["parsingMethod"])
    }
    
    // ===== LANGUAGE-SPECIFIC ACTIVATION COMMAND TESTS =====
    
    @Test
    fun testParseActivationCommandEnglish() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer"), "Start dictation"),
            ActivationCommand("ai", listOf("Assistant"), "Start AI mode")
        )
        
        val result = VoiceCommandParser.parseCommand("Computer", commands, "en-US")
        assertNotNull(result)
        assertEquals(CommandType.ACTIVATE_DICTATION, result.type)
        assertEquals("command", result.parameters["commandType"])
        assertEquals("regex", result.parameters["parsingMethod"])
    }
    
    @Test
    fun testParseActivationCommandAI() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer"), "Start dictation"),
            ActivationCommand("ai", listOf("Assistant"), "Start AI mode")
        )
        
        val result = VoiceCommandParser.parseCommand("Assistant", commands, "en-US")
        assertNotNull(result)
        assertEquals(CommandType.ACTIVATE_AI, result.type)
        assertEquals("ai", result.parameters["commandType"])
    }
    
    @Test
    fun testParseActivationCommandFinnish() {
        val commands = listOf(
            ActivationCommand("command", listOf("Tietokone"), "Aktivoi sanelutila"),
            ActivationCommand("ai", listOf("Avustaja"), "Aktivoi AI-tila")
        )
        
        val result = VoiceCommandParser.parseCommand("Tietokone", commands, "fi-FI")
        assertNotNull(result)
        assertEquals(CommandType.ACTIVATE_DICTATION, result.type)
        assertEquals("fi-FI", result.parameters["language"])
    }
    
    @Test
    fun testParseActivationCommandWithMultiplePhrases() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer", "Start", "Begin"), "Start dictation")
        )
        
        val result1 = VoiceCommandParser.parseCommand("Computer", commands, "en-US")
        assertNotNull(result1)
        assertEquals(CommandType.ACTIVATE_DICTATION, result1.type)
        
        val result2 = VoiceCommandParser.parseCommand("Start", commands, "en-US")
        assertNotNull(result2)
        assertEquals(CommandType.ACTIVATE_DICTATION, result2.type)
    }
    
    @Test
    fun testParseActivationCommandCaseInsensitive() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer"), "Start dictation")
        )
        
        val result = VoiceCommandParser.parseCommand("computer", commands, "en-US")
        assertNotNull(result)
        assertEquals(CommandType.ACTIVATE_DICTATION, result.type)
    }
    
    @Test
    fun testParseActivationCommandWithPunctuation() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer"), "Start dictation")
        )
        
        val result = VoiceCommandParser.parseCommand("Computer,", commands, "en-US")
        assertNotNull(result)
        assertEquals(CommandType.ACTIVATE_DICTATION, result.type)
    }
    
    @Test
    fun testParseActivationCommandFallsBackToStandardCommands() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer"), "Start dictation")
        )
        
        // "bold" is a standard command, not an activation command
        val result = VoiceCommandParser.parseCommand("make bold", commands, "en-US")
        assertNotNull(result)
        assertEquals(CommandType.BOLD, result.type)
    }
    
    @Test
    fun testEmptyInput() {
        val result = VoiceCommandParser.parseCommand("")
        assertNull(result)
    }
    
    @Test
    fun testWhitespaceOnlyInput() {
        val result = VoiceCommandParser.parseCommand("   ")
        assertNull(result)
    }
    
    @Test
    fun testSaveCommand() {
        val result = VoiceCommandParser.parseCommand("save")
        assertNotNull(result)
        assertEquals(CommandType.SAVE, result.type)
    }
    
    @Test
    fun testSyncCommand() {
        val result = VoiceCommandParser.parseCommand("sync")
        assertNotNull(result)
        assertEquals(CommandType.SYNC, result.type)
    }
    
    @Test
    fun testParsingMethodTracking() {
        // Verify that parsing method is tracked as "regex"
        val result = VoiceCommandParser.parseCommand("bold")
        assertNotNull(result)
        assertEquals("regex", result.parameters["parsingMethod"])
    }
}
