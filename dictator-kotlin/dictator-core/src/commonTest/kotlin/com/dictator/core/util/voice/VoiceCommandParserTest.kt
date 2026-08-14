package com.dictator.core.util.voice

import com.dictator.core.data.voice.ActivationCommand
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/**
 * Unit tests for VoiceCommandParser.
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
    
    // New tests for language-specific activation commands
    
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
    fun testParseActivationCommandFallsBackToStandardCommands() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer"), "Start dictation")
        )
        
        // "bold" is a standard command, not an activation command
        val result = VoiceCommandParser.parseCommand("make bold", commands, "en-US")
        assertNotNull(result)
        assertEquals(CommandType.BOLD, result.type)
    }
}
