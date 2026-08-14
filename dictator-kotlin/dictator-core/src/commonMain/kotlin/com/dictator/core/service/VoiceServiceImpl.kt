package com.dictator.core.service

import com.dictator.core.data.error.DataException
import com.dictator.core.domain.repository.DocumentRepository
import com.dictator.core.util.voice.ParsedCommand
import com.dictator.core.util.voice.PunctuationNormalizer
import com.dictator.core.util.voice.VoiceCommandParser
import io.github.aakira.napier.Napier

/**
 * Voice service implementation.
 * Processes voice input, parses commands, and normalizes transcribed text.
 * Uses VoiceCommandParser for command detection and PunctuationNormalizer for text cleanup.
 */
class VoiceServiceImpl(
    private val voiceCommandParser: VoiceCommandParser,
    private val punctuationNormalizer: PunctuationNormalizer,
    private val documentRepository: DocumentRepository
) : VoiceService {
    
    /**
     * Processes voice input (audio bytes) into transcribed text.
     * Delegates to remote speech-to-text service.
     */
    override suspend fun processVoiceInput(audio: ByteArray): String {
        return try {
            Napier.d("Processing voice input: ${audio.size} bytes")
            
            if (audio.isEmpty()) {
                throw DataException.ValidationError("Audio data is empty")
            }
            
            // In a real implementation, this would call a speech-to-text API
            // For now, we'll simulate transcription
            val transcribedText = transcribeAudio(audio)
            
            Napier.i("Voice input transcribed: ${transcribedText.length} chars")
            transcribedText
        } catch (e: DataException) {
            Napier.e("Failed to process voice input: ${e.message}", e)
            throw e
        } catch (e: Exception) {
            Napier.e("Unexpected error processing voice input", e)
            throw DataException.ValidationError("Failed to process voice input: ${e.message}")
        }
    }
    
    /**
     * Parses voice input text into a command or returns null if no command found.
     * Uses VoiceCommandParser to match against known patterns.
     */
    override suspend fun parseCommand(text: String): ParsedCommand? {
        return try {
            Napier.d("Parsing command from text: $text")
            
            if (text.isBlank()) {
                Napier.w("Empty text provided to parseCommand")
                return null
            }
            
            val command = voiceCommandParser.parseCommand(text)
            
            if (command != null) {
                Napier.d("Command parsed: ${command.type}")
            } else {
                Napier.d("No command found in text, treating as regular input")
            }
            
            command
        } catch (e: Exception) {
            Napier.e("Error parsing command", e)
            null
        }
    }
    
    /**
     * Normalizes voice-transcribed text by:
     * - Converting spoken punctuation to actual punctuation
     * - Fixing capitalization
     * - Cleaning up spacing
     */
    override suspend fun normalizePunctuation(text: String): String {
        return try {
            Napier.d("Normalizing punctuation in text: ${text.length} chars")
            
            if (text.isBlank()) {
                return text
            }
            
            // Apply normalization pipeline
            var normalized = punctuationNormalizer.normalize(text)
            normalized = punctuationNormalizer.normalizeLineBreaks(normalized)
            normalized = punctuationNormalizer.normalizeQuotes(normalized)
            normalized = punctuationNormalizer.normalizeCapitalization(normalized)
            
            Napier.d("Normalized text: ${normalized.length} chars")
            normalized
        } catch (e: Exception) {
            Napier.e("Error normalizing punctuation", e)
            // Return original text on error
            text
        }
    }
    
    /**
     * Simulates transcribing audio to text.
     * In a production system, this would call a speech-to-text API like Google Cloud Speech or Azure Speech.
     */
    private suspend fun transcribeAudio(audio: ByteArray): String {
        // Placeholder implementation
        // Real implementation would call a speech-to-text service
        
        return "transcribed audio content"
    }
}
