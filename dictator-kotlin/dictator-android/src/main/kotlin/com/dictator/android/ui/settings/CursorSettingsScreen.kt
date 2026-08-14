/**
 * Cursor Settings Screen for Android
 * Allows users to configure cursor navigation preferences
 */

package com.dictator.android.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.OutlinedTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dictator.android.ui.voice.CursorSizeButtons
import com.dictator.core.domain.entity.CursorSize

/**
 * Settings section for cursor navigation configuration
 */
@Composable
fun CursorSettingsSection(
    onSave: (CursorSize) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var selectedSize by remember { mutableStateOf(CursorSize.WORD) }
    var showHelp by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(8.dp)
            )
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        Text(
            text = "Cursor Navigation",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = "Configure how the cursor moves through your document. Choose between paragraph, word, or character-level navigation.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Divider()

        // Default cursor size selection
        Text(
            text = "Default Cursor Size",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium
        )

        CursorSizeButtons(
            currentSize = selectedSize,
            onSizeChanged = { selectedSize = it }
        )

        // Help text
        if (showHelp) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(6.dp)
                    )
                    .padding(12.dp)
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "How Cursor Sizes Work",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    
                    CursorSizeHelp("¶ Paragraph", "Navigate by paragraphs (text separated by blank lines)")
                    CursorSizeHelp("W Word", "Navigate by words")
                    CursorSizeHelp("C Character", "Navigate by individual characters")
                    
                    Text(
                        text = "Say 'select' to start selection, then 'next' or 'back' to expand.",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }

        // Help toggle
        OutlinedButton(
            onClick = { showHelp = !showHelp },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (showHelp) "Hide Help" else "Show Help")
        }

        Divider()

        // Voice Commands Reference
        CursorCommandsReference()

        Divider()

        // Save button
        Button(
            onClick = { onSave(selectedSize) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Save Cursor Settings")
        }
    }
}

/**
 * Helper for displaying cursor size descriptions
 */
@Composable
private fun CursorSizeHelp(title: String, description: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "•",
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            Text(
                text = description,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

/**
 * Reference for available cursor voice commands
 */
@Composable
private fun CursorCommandsReference() {
    var expanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        OutlinedButton(
            onClick = { expanded = !expanded },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (expanded) "Hide Voice Commands" else "Show Voice Commands")
        }

        if (expanded) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.background,
                        shape = RoundedCornerShape(6.dp)
                    )
                    .padding(12.dp)
            ) {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        CommandGroup("Navigation", listOf(
                            "next / forward - Move to next unit",
                            "back / previous - Move to previous unit"
                        ))
                    }
                    item {
                        CommandGroup("Selection", listOf(
                            "select - Start/stop selection",
                            "select all - Select entire document",
                            "select start - Set selection to beginning",
                            "select end - Set selection to end"
                        ))
                    }
                    item {
                        CommandGroup("Size Control", listOf(
                            "big / paragraph - Switch to paragraph mode",
                            "medium / word - Switch to word mode",
                            "small / character - Switch to character mode"
                        ))
                    }
                }
            }
        }
    }
}

/**
 * Helper for displaying command groups
 */
@Composable
private fun CommandGroup(title: String, commands: List<String>) {
    Column(
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        commands.forEach { command ->
            Text(
                text = "• $command",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(start = 8.dp)
            )
        }
    }
}

/**
 * Custom command aliases configuration
 */
@Composable
fun CursorAliasesSection(
    modifier: Modifier = Modifier
) {
    var aliasInput by remember { mutableStateOf("") }
    var customAliases by remember { mutableStateOf(listOf<Pair<String, String>>()) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = RoundedCornerShape(8.dp)
            )
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Custom Voice Aliases",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold
        )

        Text(
            text = "Create shortcuts for commands. For example, say 'go' instead of 'next'.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        OutlinedTextField(
            value = aliasInput,
            onValueChange = { aliasInput = it },
            label = { Text("New Alias") },
            placeholder = { Text("e.g., 'go' for 'next'") },
            modifier = Modifier.fillMaxWidth()
        )

        Button(
            onClick = {
                if (aliasInput.isNotBlank()) {
                    // Add alias to list (would save to database in real implementation)
                    customAliases = customAliases + (aliasInput to "next")
                    aliasInput = ""
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Add Alias")
        }

        if (customAliases.isNotEmpty()) {
            Divider()
            Text(
                text = "Your Aliases",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium
            )

            customAliases.forEach { (alias, command) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = MaterialTheme.colorScheme.background,
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "'$alias' → '$command'",
                        style = MaterialTheme.typography.labelSmall
                    )
                    OutlinedButton(
                        onClick = { customAliases = customAliases.filter { it.first != alias } }
                    ) {
                        Text("Remove", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}
