package com.dictator.core.data.local

import com.dictator.core.data.voice.ActivationCommand
import com.dictator.core.data.voice.VoiceNotificationLight
import com.dictator.core.data.voice.VoiceSettings
import com.dictator.core.data.voice.createVoiceSettingsWithLegacy
import com.dictator.core.data.voice.getDefaultActivationCommandsForLanguage
import com.dictator.core.service.SharedPreferences
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString

/**
 * Repository for managing voice settings persistence
 * Handles loading, saving, and backward compatibility with legacy settings
 */
class VoiceSettingsRepository(
    private val sharedPreferences: SharedPreferences
) {
    companion object {
        private const val KEY_VOICE_SETTINGS = "voice_settings"
        private const val KEY_ACTIVATION_COMMANDS = "activation_commands"
        private const val KEY_NOTIFICATION_LIGHT = "voice_notification_light"
        private const val KEY_LANGUAGE = "voice_language"
        
        // Legacy keys for backward compatibility
        private const val KEY_LEGACY_COMMAND_TRIGGER = "command_trigger"
        private const val KEY_LEGACY_AI_TRIGGER = "ai_trigger"
    }
    
    private val json = Json { ignoreUnknownKeys = true }
    
    /**
     * Load voice settings from preferences
     * Implements backward compatibility with legacy settings
     */
    fun loadVoiceSettings(): VoiceSettings {
        // Try to load new format first
        val settingsJson = sharedPreferences.getString(KEY_VOICE_SETTINGS)
        if (settingsJson != null) {
            return try {
                json.decodeFromString<VoiceSettings>(settingsJson)
            } catch (e: Exception) {
                VoiceSettings() // Return default on parse error
            }
        }
        
        // Fall back to loading individual settings for backward compatibility
        val language = sharedPreferences.getString(KEY_LANGUAGE, "en-US") ?: "en-US"
        val legacyCommandTrigger = sharedPreferences.getString(KEY_LEGACY_COMMAND_TRIGGER)
        val legacyAiTrigger = sharedPreferences.getString(KEY_LEGACY_AI_TRIGGER)
        
        // Load activation commands if stored separately
        val activationCommandsJson = sharedPreferences.getString(KEY_ACTIVATION_COMMANDS)
        val activationCommands = if (activationCommandsJson != null) {
            try {
                json.decodeFromString<Map<String, List<ActivationCommand>>>(activationCommandsJson)
            } catch (e: Exception) {
                mapOf()
            }
        } else {
            mapOf()
        }
        
        // Load notification light settings
        val notificationLightJson = sharedPreferences.getString(KEY_NOTIFICATION_LIGHT)
        val notificationLight = if (notificationLightJson != null) {
            try {
                json.decodeFromString<VoiceNotificationLight>(notificationLightJson)
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }
        
        // Create settings with appropriate defaults
        val settings = createVoiceSettingsWithLegacy(
            language = language,
            activationCommands = if (activationCommands.isNotEmpty()) activationCommands else null,
            notificationLight = notificationLight,
            legacyCommandTrigger = legacyCommandTrigger,
            legacyAiTrigger = legacyAiTrigger
        )
        
        // Save in new format for next time
        saveVoiceSettings(settings)
        
        return settings
    }
    
    /**
     * Save voice settings to preferences
     */
    fun saveVoiceSettings(settings: VoiceSettings) {
        try {
            val settingsJson = json.encodeToString(settings)
            sharedPreferences.setString(KEY_VOICE_SETTINGS, settingsJson)
        } catch (e: Exception) {
            // Log error but don't crash
            e.printStackTrace()
        }
    }
    
    /**
     * Update language setting
     */
    fun setLanguage(language: String) {
        val currentSettings = loadVoiceSettings()
        val updated = currentSettings.copy(language = language)
        saveVoiceSettings(updated)
        sharedPreferences.setString(KEY_LANGUAGE, language)
    }
    
    /**
     * Update activation commands for a specific language
     */
    fun setActivationCommandsForLanguage(language: String, commands: List<ActivationCommand>) {
        val currentSettings = loadVoiceSettings()
        val updatedCommands = currentSettings.activationCommands.toMutableMap()
        updatedCommands[language] = commands
        val updated = currentSettings.copy(activationCommands = updatedCommands)
        saveVoiceSettings(updated)
    }
    
    /**
     * Update notification light settings
     */
    fun setNotificationLight(light: VoiceNotificationLight) {
        val currentSettings = loadVoiceSettings()
        val updated = currentSettings.copy(notificationLight = light)
        saveVoiceSettings(updated)
    }
    
    /**
     * Get activation commands for a specific language
     */
    fun getActivationCommandsForLanguage(language: String): List<ActivationCommand> {
        val settings = loadVoiceSettings()
        return settings.activationCommands[language] ?: getDefaultActivationCommandsForLanguage(language)
    }
    
    /**
     * Get the primary activation phrase for a language and type
     * Returns the first phrase or falls back to legacy settings
     */
    fun getActivationPhrase(language: String, type: String): String {
        val settings = loadVoiceSettings()
        
        // Try to get from new format
        val commands = settings.activationCommands[language]
        val cmd = commands?.find { it.type == type }
        cmd?.phrases?.firstOrNull()?.let { return it }
        
        // Fall back to legacy settings
        if (type == "command" && settings.legacyCommandTrigger != null) {
            return settings.legacyCommandTrigger
        }
        if (type == "ai" && settings.legacyAiTrigger != null) {
            return settings.legacyAiTrigger
        }
        
        // Fall back to language defaults
        return getDefaultActivationCommandsForLanguage(language)
            .find { it.type == type }
            ?.phrases?.firstOrNull() ?: if (type == "command") "Computer" else "Assistant"
    }
    
    /**
     * Get all activation phrases for a language and type
     */
    fun getActivationPhrases(language: String, type: String): List<String> {
        val settings = loadVoiceSettings()
        val commands = settings.activationCommands[language] ?: getDefaultActivationCommandsForLanguage(language)
        return commands.find { it.type == type }?.phrases ?: emptyList()
    }
    
    /**
     * Clear all voice settings
     */
    fun clearVoiceSettings() {
        sharedPreferences.remove(KEY_VOICE_SETTINGS)
        sharedPreferences.remove(KEY_ACTIVATION_COMMANDS)
        sharedPreferences.remove(KEY_NOTIFICATION_LIGHT)
        sharedPreferences.remove(KEY_LANGUAGE)
    }
}
