package com.dictator.android.ui.voice

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.dictator.core.data.voice.ActivationCommand
import com.dictator.core.data.voice.VoiceNotificationLight
import com.dictator.core.data.voice.getDefaultActivationCommandsForLanguage

/**
 * Screen for managing voice settings including language-specific activation commands
 * and notification light configuration
 */
@Composable
fun VoiceSettingsScreen(
    currentLanguage: String = "en-US",
    activationCommands: Map<String, List<ActivationCommand>> = emptyMap(),
    notificationLight: VoiceNotificationLight = VoiceNotificationLight(),
    onLanguageChanged: (String) -> Unit = {},
    onActivationCommandsUpdated: (String, List<ActivationCommand>) -> Unit = { _, _ -> },
    onNotificationLightUpdated: (VoiceNotificationLight) -> Unit = {}
) {
    var selectedLanguage by remember { mutableStateOf(currentLanguage) }
    var isLanguageDropdownExpanded by remember { mutableStateOf(false) }
    var currentNotificationLight by remember { mutableStateOf(notificationLight) }
    var showColorPicker by remember { mutableStateOf<String?>(null) }

    val supportedLanguages = listOf(
        "en-US" to "English",
        "fi-FI" to "Finnish",
        "sv-SE" to "Swedish"
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Language Selection
        item {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Language",
                        style = MaterialTheme.typography.titleMedium
                    )
                    
                    Box {
                        OutlinedButton(
                            onClick = { isLanguageDropdownExpanded = !isLanguageDropdownExpanded },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(supportedLanguages.find { it.first == selectedLanguage }?.second ?: selectedLanguage)
                        }
                        
                        DropdownMenu(
                            expanded = isLanguageDropdownExpanded,
                            onDismissRequest = { isLanguageDropdownExpanded = false },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            supportedLanguages.forEach { (code, name) ->
                                DropdownMenuItem(
                                    text = { Text(name) },
                                    onClick = {
                                        selectedLanguage = code
                                        isLanguageDropdownExpanded = false
                                        onLanguageChanged(code)
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Activation Commands for Current Language
        item {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Activation Commands",
                        style = MaterialTheme.typography.titleMedium
                    )
                    
                    Text(
                        text = "Configure how to activate voice features",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // Show commands for current language
                    val commands = activationCommands[selectedLanguage] 
                        ?: getDefaultActivationCommandsForLanguage(selectedLanguage)
                    
                    commands.forEach { cmd ->
                        ActivationCommandCard(
                            command = cmd,
                            onUpdate = { updatedCmd ->
                                val updated = commands.map { if (it.type == cmd.type) updatedCmd else it }
                                onActivationCommandsUpdated(selectedLanguage, updated)
                            }
                        )
                    }

                    OutlinedButton(
                        onClick = { /* Handle reset to defaults */ },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Reset to Defaults")
                    }
                }
            }
        }

        // Notification Light Settings
        item {
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Notification Light",
                        style = MaterialTheme.typography.titleMedium
                    )

                    // Enabled toggle (simplified - in real implementation would be a Switch)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Enabled")
                        Text(
                            text = if (currentNotificationLight.enabled) "On" else "Off",
                            color = if (currentNotificationLight.enabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                    }

                    Divider()

                    // Color settings
                    ColorSettingRow(
                        label = "Listening",
                        color = currentNotificationLight.listening,
                        onColorChanged = { newColor ->
                            currentNotificationLight = currentNotificationLight.copy(listening = newColor)
                            onNotificationLightUpdated(currentNotificationLight)
                        }
                    )

                    ColorSettingRow(
                        label = "Command Recognized",
                        color = currentNotificationLight.commandRecognized,
                        onColorChanged = { newColor ->
                            currentNotificationLight = currentNotificationLight.copy(commandRecognized = newColor)
                            onNotificationLightUpdated(currentNotificationLight)
                        }
                    )

                    ColorSettingRow(
                        label = "AI Recognized",
                        color = currentNotificationLight.aiRecognized,
                        onColorChanged = { newColor ->
                            currentNotificationLight = currentNotificationLight.copy(aiRecognized = newColor)
                            onNotificationLightUpdated(currentNotificationLight)
                        }
                    )

                    ColorSettingRow(
                        label = "Error",
                        color = currentNotificationLight.error,
                        onColorChanged = { newColor ->
                            currentNotificationLight = currentNotificationLight.copy(error = newColor)
                            onNotificationLightUpdated(currentNotificationLight)
                        }
                    )

                    Divider()

                    // Intensity setting
                    Text(
                        text = "Animation Intensity: ${currentNotificationLight.intensity}",
                        style = MaterialTheme.typography.labelMedium
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOf("low", "medium", "high").forEach { intensity ->
                            OutlinedButton(
                                onClick = {
                                    currentNotificationLight = currentNotificationLight.copy(intensity = intensity)
                                    onNotificationLightUpdated(currentNotificationLight)
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(intensity.capitalize())
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Card for editing an individual activation command
 */
@Composable
private fun ActivationCommandCard(
    command: ActivationCommand,
    onUpdate: (ActivationCommand) -> Unit
) {
    var isExpanded by remember { mutableStateOf(false) }
    var editedPhrases by remember { mutableStateOf(command.phrases) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { isExpanded = !isExpanded }
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = if (command.type == "command") "Dictation Trigger" else "AI Trigger",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Text(
                        text = editedPhrases.joinToString(", "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Text(if (isExpanded) "▼" else "▶")
            }

            if (isExpanded) {
                Divider()
                
                editedPhrases.forEachIndexed { index, phrase ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = phrase,
                            onValueChange = { newPhrase ->
                                editedPhrases = editedPhrases.toMutableList().apply { set(index, newPhrase) }
                                onUpdate(command.copy(phrases = editedPhrases))
                            },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        IconButton(
                            onClick = {
                                editedPhrases = editedPhrases.filterIndexed { i, _ -> i != index }
                                onUpdate(command.copy(phrases = editedPhrases))
                            }
                        ) {
                            Icon(Icons.Filled.Delete, contentDescription = "Delete phrase")
                        }
                    }
                }

                OutlinedButton(
                    onClick = {
                        editedPhrases = editedPhrases + ""
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Add Phrase")
                }
            }
        }
    }
}

/**
 * Row for color setting with color preview
 */
@Composable
private fun ColorSettingRow(
    label: String,
    color: String,
    onColorChanged: (String) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label)
        
        Row(
            modifier = Modifier
                .clickable { /* Open color picker */ }
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(
                        color = parseColorFromHex(color),
                        shape = RoundedCornerShape(4.dp)
                    )
            )
            Text(
                text = color,
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

/**
 * Parse hex color string to Color object
 */
private fun parseColorFromHex(hex: String): Color {
    return try {
        val colorInt = hex.removePrefix("#").toLong(16).toInt()
        Color(colorInt or 0xFF000000.toInt())
    } catch (e: Exception) {
        Color.Gray
    }
}

/**
 * Extension for capitalize function
 */
private fun String.capitalize(): String {
    return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
}
