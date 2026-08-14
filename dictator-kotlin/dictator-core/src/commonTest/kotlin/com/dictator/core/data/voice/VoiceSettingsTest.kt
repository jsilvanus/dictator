package com.dictator.core.data.voice

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertNotNull

/**
 * Unit tests for voice settings defaults and helper functions
 */
class VoiceSettingsDefaultsTest {
    
    @Test
    fun testDefaultEnglishActivationCommands() {
        val commands = DEFAULT_ENGLISH_ACTIVATION_COMMANDS
        assertEquals(2, commands.size)
        
        val commandTrigger = commands.find { it.type == "command" }
        assertNotNull(commandTrigger)
        assertEquals(listOf("Computer"), commandTrigger.phrases)
        
        val aiTrigger = commands.find { it.type == "ai" }
        assertNotNull(aiTrigger)
        assertEquals(listOf("Assistant"), aiTrigger.phrases)
    }
    
    @Test
    fun testDefaultFinnishActivationCommands() {
        val commands = DEFAULT_FINNISH_ACTIVATION_COMMANDS
        assertEquals(2, commands.size)
        
        val commandTrigger = commands.find { it.type == "command" }
        assertNotNull(commandTrigger)
        assertEquals(listOf("Tietokone"), commandTrigger.phrases)
        
        val aiTrigger = commands.find { it.type == "ai" }
        assertNotNull(aiTrigger)
        assertEquals(listOf("Avustaja"), aiTrigger.phrases)
    }
    
    @Test
    fun testDefaultSwedishActivationCommands() {
        val commands = DEFAULT_SWEDISH_ACTIVATION_COMMANDS
        assertEquals(2, commands.size)
        
        val commandTrigger = commands.find { it.type == "command" }
        assertNotNull(commandTrigger)
        assertEquals(listOf("Dator"), commandTrigger.phrases)
        
        val aiTrigger = commands.find { it.type == "ai" }
        assertNotNull(aiTrigger)
        assertEquals(listOf("Assistent"), aiTrigger.phrases)
    }
    
    @Test
    fun testGetDefaultActivationCommandsForEnglish() {
        val commands = getDefaultActivationCommandsForLanguage("en-US")
        assertEquals(DEFAULT_ENGLISH_ACTIVATION_COMMANDS, commands)
    }
    
    @Test
    fun testGetDefaultActivationCommandsForFinnish() {
        val commands = getDefaultActivationCommandsForLanguage("fi-FI")
        assertEquals(DEFAULT_FINNISH_ACTIVATION_COMMANDS, commands)
    }
    
    @Test
    fun testGetDefaultActivationCommandsForSwedish() {
        val commands = getDefaultActivationCommandsForLanguage("sv-SE")
        assertEquals(DEFAULT_SWEDISH_ACTIVATION_COMMANDS, commands)
    }
    
    @Test
    fun testGetDefaultActivationCommandsForUnsupported() {
        // Should return English as default for unsupported languages
        val commands = getDefaultActivationCommandsForLanguage("es-ES")
        assertEquals(DEFAULT_ENGLISH_ACTIVATION_COMMANDS, commands)
    }
    
    @Test
    fun testGetActivationCommandForLanguageCommandType() {
        val phrase = getActivationCommandForLanguage("en-US", "command")
        assertEquals("Computer", phrase)
    }
    
    @Test
    fun testGetActivationCommandForLanguageAiType() {
        val phrase = getActivationCommandForLanguage("en-US", "ai")
        assertEquals("Assistant", phrase)
    }
    
    @Test
    fun testGetActivationCommandForLanguageFinnish() {
        val phrase = getActivationCommandForLanguage("fi-FI", "command")
        assertEquals("Tietokone", phrase)
    }
    
    @Test
    fun testGetActivationCommandWithCustomCommands() {
        val customCommands = mapOf(
            "en-US" to listOf(
                ActivationCommand("command", listOf("Start"), "Custom command"),
                ActivationCommand("ai", listOf("Help"), "Custom AI")
            )
        )
        
        val phrase = getActivationCommandForLanguage("en-US", "command", customCommands)
        assertEquals("Start", phrase)
    }
    
    @Test
    fun testGetActivationPhrasesForLanguage() {
        val phrases = getActivationPhrasesForLanguage("en-US", "command")
        assertEquals(listOf("Computer"), phrases)
    }
    
    @Test
    fun testGetActivationPhrasesForLanguageMultiple() {
        val commands = listOf(
            ActivationCommand("command", listOf("Computer", "Start", "Hey"), "Multiple phrases")
        )
        val customCommands = mapOf("en-US" to commands)
        
        val phrases = getActivationPhrasesForLanguage("en-US", "command", customCommands)
        assertEquals(listOf("Computer", "Start", "Hey"), phrases)
    }
    
    @Test
    fun testDefaultNotificationLight() {
        val light = DEFAULT_VOICE_NOTIFICATION_LIGHT
        assertTrue(light.enabled)
        assertEquals("#0066FF", light.listening)
        assertEquals("#00CC00", light.commandRecognized)
        assertEquals("#FFAA00", light.aiRecognized)
        assertEquals("#FF0000", light.error)
        assertEquals("medium", light.intensity)
    }
    
    @Test
    fun testDefaultVoiceSettings() {
        val settings = DEFAULT_VOICE_SETTINGS
        assertEquals("en-US", settings.language)
        assertTrue(settings.activationCommands.isNotEmpty())
        assertTrue(settings.notificationLight.enabled)
    }
    
    @Test
    fun testCreateVoiceSettingsWithLegacy() {
        val settings = createVoiceSettingsWithLegacy(
            language = "fi-FI",
            legacyCommandTrigger = "OldCommand",
            legacyAiTrigger = "OldAI"
        )
        
        assertEquals("fi-FI", settings.language)
        assertEquals("OldCommand", settings.legacyCommandTrigger)
        assertEquals("OldAI", settings.legacyAiTrigger)
    }
}

/**
 * Unit tests for VoiceSettings data class
 */
class VoiceSettingsTypesTest {
    
    @Test
    fun testActivationCommandCreation() {
        val cmd = ActivationCommand(
            type = "command",
            phrases = listOf("Computer", "Start"),
            description = "Activate dictation"
        )
        
        assertEquals("command", cmd.type)
        assertEquals(2, cmd.phrases.size)
        assertEquals("Computer", cmd.phrases[0])
    }
    
    @Test
    fun testVoiceNotificationLightCreation() {
        val light = VoiceNotificationLight(
            enabled = true,
            listening = "#0066FF",
            commandRecognized = "#00CC00",
            aiRecognized = "#FFAA00",
            error = "#FF0000",
            intensity = "high"
        )
        
        assertTrue(light.enabled)
        assertEquals("high", light.intensity)
    }
    
    @Test
    fun testVoiceSettingsCreation() {
        val commands = mapOf(
            "en-US" to DEFAULT_ENGLISH_ACTIVATION_COMMANDS
        )
        
        val settings = VoiceSettings(
            language = "en-US",
            activationCommands = commands,
            notificationLight = DEFAULT_VOICE_NOTIFICATION_LIGHT
        )
        
        assertEquals("en-US", settings.language)
        assertTrue(settings.activationCommands.containsKey("en-US"))
    }
}
