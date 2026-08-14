package com.dictator.core.data.voice

import kotlinx.serialization.Serializable

/**
 * Represents an activation command (e.g., "Computer" for command trigger, "Assistant" for AI trigger)
 * 
 * @param type The type of activation: 'command' for dictation, 'ai' for AI mode
 * @param phrases List of phrases that trigger this command (e.g., ["Computer", "Hey Computer"])
 * @param description Optional description of what this command does
 */
@Serializable
data class ActivationCommand(
    val type: String, // "command" or "ai"
    val phrases: List<String>,
    val description: String? = null
)

/**
 * Represents voice notification light settings
 * Controls visual feedback during voice recognition
 */
@Serializable
data class VoiceNotificationLight(
    val enabled: Boolean = true,
    val listening: String = "#0066FF",      // Blue
    val commandRecognized: String = "#00CC00", // Green
    val aiRecognized: String = "#FFAA00",   // Orange
    val error: String = "#FF0000",          // Red
    val intensity: String = "medium"         // "low", "medium", "high"
)

/**
 * Complete voice settings including activation commands and notification light
 * Supports multiple languages with language-specific commands
 */
@Serializable
data class VoiceSettings(
    val language: String = "en-US",
    val activationCommands: Map<String, List<ActivationCommand>> = emptyMap(),
    val notificationLight: VoiceNotificationLight = VoiceNotificationLight(),
    val legacyCommandTrigger: String? = null, // For backward compatibility
    val legacyAiTrigger: String? = null       // For backward compatibility
)

/**
 * Enum for voice recognition states
 */
enum class VoiceRecognitionState {
    IDLE,
    LISTENING,
    COMMAND_RECOGNIZED,
    AI_RECOGNIZED,
    ERROR
}
