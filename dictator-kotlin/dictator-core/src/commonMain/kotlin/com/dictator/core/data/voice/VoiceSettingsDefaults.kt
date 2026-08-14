package com.dictator.core.data.voice

/**
 * Default voice settings and activation commands for supported languages
 * Mirrors the web version from lib/data/default-settings.ts
 */

// English activation commands
val DEFAULT_ENGLISH_ACTIVATION_COMMANDS = listOf(
    ActivationCommand(
        type = "command",
        phrases = listOf("Computer"),
        description = "Activate dictation mode"
    ),
    ActivationCommand(
        type = "ai",
        phrases = listOf("Assistant"),
        description = "Activate AI mode"
    )
)

// Finnish activation commands
val DEFAULT_FINNISH_ACTIVATION_COMMANDS = listOf(
    ActivationCommand(
        type = "command",
        phrases = listOf("Tietokone"),
        description = "Aktivoi sanelutila"
    ),
    ActivationCommand(
        type = "ai",
        phrases = listOf("Avustaja"),
        description = "Aktivoi AI-tila"
    )
)

// Swedish activation commands
val DEFAULT_SWEDISH_ACTIVATION_COMMANDS = listOf(
    ActivationCommand(
        type = "command",
        phrases = listOf("Dator"),
        description = "Aktivera dikteringsläge"
    ),
    ActivationCommand(
        type = "ai",
        phrases = listOf("Assistent"),
        description = "Aktivera AI-läge"
    )
)

// Default notification light settings
val DEFAULT_VOICE_NOTIFICATION_LIGHT = VoiceNotificationLight(
    enabled = true,
    listening = "#0066FF",      // Blue
    commandRecognized = "#00CC00", // Green
    aiRecognized = "#FFAA00",   // Orange
    error = "#FF0000",          // Red
    intensity = "medium"
)

// Default voice settings
val DEFAULT_VOICE_SETTINGS = VoiceSettings(
    language = "en-US",
    activationCommands = mapOf(
        "en-US" to DEFAULT_ENGLISH_ACTIVATION_COMMANDS,
        "fi-FI" to DEFAULT_FINNISH_ACTIVATION_COMMANDS,
        "sv-SE" to DEFAULT_SWEDISH_ACTIVATION_COMMANDS
    ),
    notificationLight = DEFAULT_VOICE_NOTIFICATION_LIGHT
)

/**
 * Get the default activation commands for a given language
 */
fun getDefaultActivationCommandsForLanguage(language: String): List<ActivationCommand> {
    return when (language) {
        "fi-FI" -> DEFAULT_FINNISH_ACTIVATION_COMMANDS
        "sv-SE" -> DEFAULT_SWEDISH_ACTIVATION_COMMANDS
        "en-US", else -> DEFAULT_ENGLISH_ACTIVATION_COMMANDS
    }
}

/**
 * Get the activation command for a specific language and type.
 * Returns the first phrase from the matching activation command, or a default value if not found.
 * 
 * @param language The language code (e.g., "en-US")
 * @param type The command type ("command" or "ai")
 * @param activationCommands Optional map of custom activation commands
 * @return The first phrase from the matching activation command, or default
 */
fun getActivationCommandForLanguage(
    language: String,
    type: String,
    activationCommands: Map<String, List<ActivationCommand>>? = null
): String {
    val commands = activationCommands?.get(language) ?: getDefaultActivationCommandsForLanguage(language)
    val cmd = commands.find { it.type == type }
    return cmd?.phrases?.firstOrNull() ?: if (type == "command") "Computer" else "Assistant"
}

/**
 * Get all activation phrases for a given language and type.
 * This is useful for voice recognition matching where multiple phrases should trigger the same action.
 */
fun getActivationPhrasesForLanguage(
    language: String,
    type: String,
    activationCommands: Map<String, List<ActivationCommand>>? = null
): List<String> {
    val commands = activationCommands?.get(language) ?: getDefaultActivationCommandsForLanguage(language)
    val cmd = commands.find { it.type == type }
    return cmd?.phrases ?: emptyList()
}

/**
 * Create a new VoiceSettings with optional overrides for backward compatibility
 * If legacyCommandTrigger or legacyAiTrigger are provided, they are stored for fallback purposes
 */
fun createVoiceSettingsWithLegacy(
    language: String = "en-US",
    activationCommands: Map<String, List<ActivationCommand>>? = null,
    notificationLight: VoiceNotificationLight? = null,
    legacyCommandTrigger: String? = null,
    legacyAiTrigger: String? = null
): VoiceSettings {
    return VoiceSettings(
        language = language,
        activationCommands = activationCommands ?: DEFAULT_VOICE_SETTINGS.activationCommands,
        notificationLight = notificationLight ?: DEFAULT_VOICE_NOTIFICATION_LIGHT,
        legacyCommandTrigger = legacyCommandTrigger,
        legacyAiTrigger = legacyAiTrigger
    )
}
