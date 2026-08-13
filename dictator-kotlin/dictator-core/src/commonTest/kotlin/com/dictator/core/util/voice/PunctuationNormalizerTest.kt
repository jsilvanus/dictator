package com.dictator.core.util.voice

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Unit tests for PunctuationNormalizer.
 */
class PunctuationNormalizerTest {
    
    @Test
    fun testNormalizePeriod() {
        val input = "hello period world"
        val output = PunctuationNormalizer.normalize(input)
        assertEquals("hello. world", output)
    }
    
    @Test
    fun testNormalizeComma() {
        val input = "hello comma world"
        val output = PunctuationNormalizer.normalize(input)
        assertEquals("hello, world", output)
    }
    
    @Test
    fun testNormalizeMultiplePunctuation() {
        val input = "hello period how are you question mark"
        val output = PunctuationNormalizer.normalize(input)
        assertEquals("hello. how are you?", output)
    }
    
    @Test
    fun testNormalizeLineBreaks() {
        val input = "line one new line line two"
        val output = PunctuationNormalizer.normalizeLineBreaks(input)
        assertEquals("line one\nline two", output)
    }
    
    @Test
    fun testNormalizeQuotes() {
        val input = "quote hello world unquote"
        val output = PunctuationNormalizer.normalizeQuotes(input)
        assertEquals("\"hello world\"", output)
    }
    
    @Test
    fun testCapitalization() {
        val input = "hello world. this is a test"
        val output = PunctuationNormalizer.normalizeCapitalization(input)
        assertEquals("Hello world. This is a test", output)
    }
}
