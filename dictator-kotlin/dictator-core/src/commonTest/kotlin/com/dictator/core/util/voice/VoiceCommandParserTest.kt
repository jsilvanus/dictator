package com.dictator.core.util.voice

import kotlin.test.Test
import kotlin.test.assertEquals
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
}
