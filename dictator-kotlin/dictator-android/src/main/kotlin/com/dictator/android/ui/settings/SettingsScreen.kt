package com.dictator.android.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.dictator.core.data.ai.ModelProvider

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Header
        TopAppBar(
            title = { Text("Settings") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.primary,
                titleContentColor = MaterialTheme.colorScheme.onPrimary,
                navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
            )
        )

        // Content
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                // Error Message
                if (state.errorMessage != null) {
                    AlertCard(
                        message = state.errorMessage!!,
                        isError = true,
                        onDismiss = { viewModel.clearError() }
                    )
                }
            }

            item {
                // Success Message
                if (state.isSaved) {
                    AlertCard(
                        message = "Settings saved successfully",
                        isError = false
                    )
                }
            }

            item {
                // Test Connection Status
                if (state.testConnectionStatus != null) {
                    AlertCard(
                        message = state.testConnectionStatus!!,
                        isError = state.testConnectionStatus?.contains("✗") == true
                    )
                }
            }

            item {
                // Mode Selection
                ModeSelector(
                    selectedMode = state.mode,
                    onModeSelected = { viewModel.setMode(it) }
                )
            }

            item {
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }

            // Conditional content based on mode
            if (state.mode == SettingsMode.DictatorService) {
                item {
                    DictatorServiceConfig(
                        url = state.dictatorServiceUrl,
                        onUrlChange = { viewModel.setDictatorServiceUrl(it) }
                    )
                }
            } else {
                item {
                    DirectProviderConfig(
                        selectedProvider = state.selectedProvider,
                        onProviderChange = { viewModel.setSelectedProvider(it) },
                        apiKey = state.apiKey,
                        onApiKeyChange = { viewModel.setApiKey(it) },
                        baseUrl = state.baseUrl,
                        onBaseUrlChange = { viewModel.setBaseUrl(it) },
                        model = state.model,
                        onModelChange = { viewModel.setModel(it) },
                        temperature = state.temperature,
                        onTemperatureChange = { viewModel.setTemperature(it) },
                        maxTokens = state.maxTokens,
                        onMaxTokensChange = { viewModel.setMaxTokens(it) }
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Action Buttons
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { viewModel.testConnection() },
                        modifier = Modifier.weight(1f),
                        enabled = !state.isLoading,
                        colors = ButtonDefaults.outlinedButtonColors()
                    ) {
                        Text("Test Connection")
                    }

                    Button(
                        onClick = { viewModel.validateAndSaveSettings() },
                        modifier = Modifier.weight(1f),
                        enabled = !state.isLoading,
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Save Settings")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AlertCard(
    message: String,
    isError: Boolean,
    onDismiss: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isError) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = if (isError) Icons.Default.Close else Icons.Default.Check,
                contentDescription = null,
                tint = if (isError) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.primary
                },
                modifier = Modifier.size(24.dp)
            )
            Text(
                message,
                modifier = Modifier.weight(1f),
                color = if (isError) {
                    MaterialTheme.colorScheme.onErrorContainer
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                style = MaterialTheme.typography.bodySmall
            )
            if (onDismiss != null) {
                IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Dismiss")
                }
            }
        }
    }
}

@Composable
private fun ModeSelector(
    selectedMode: SettingsMode,
    onModeSelected: (SettingsMode) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "AI Provider Mode",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ModeOptionCard(
                    title = "Dictator Service",
                    description = "Use the remote Dictator web service",
                    isSelected = selectedMode == SettingsMode.DictatorService,
                    onClick = { onModeSelected(SettingsMode.DictatorService) }
                )

                ModeOptionCard(
                    title = "Direct Provider",
                    description = "Configure AI provider directly on device",
                    isSelected = selectedMode == SettingsMode.DirectProvider,
                    onClick = { onModeSelected(SettingsMode.DirectProvider) }
                )
            }
        }
    }
}

@Composable
private fun ModeOptionCard(
    title: String,
    description: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            RadioButton(
                selected = isSelected,
                onClick = onClick
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleSmall
                )
                Text(
                    description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun DictatorServiceConfig(
    url: String,
    onUrlChange: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Dictator Service Configuration",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            TextField(
                value = url,
                onValueChange = onUrlChange,
                label = { Text("Service URL") },
                placeholder = { Text("https://example.com") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Uri,
                    imeAction = ImeAction.Done
                ),
                singleLine = true
            )

            Text(
                "Example: http://localhost:3000 or https://dictator.example.com",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun DirectProviderConfig(
    selectedProvider: ModelProvider,
    onProviderChange: (ModelProvider) -> Unit,
    apiKey: String,
    onApiKeyChange: (String) -> Unit,
    baseUrl: String,
    onBaseUrlChange: (String) -> Unit,
    model: String,
    onModelChange: (String) -> Unit,
    temperature: Double,
    onTemperatureChange: (Double) -> Unit,
    maxTokens: Int,
    onMaxTokensChange: (Int) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Direct Provider Configuration",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 12.dp)
            )

            // Provider selector
            ProviderSelector(
                selectedProvider = selectedProvider,
                onProviderChange = onProviderChange
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Provider-specific fields
            when (selectedProvider) {
                ModelProvider.CLAUDE -> {
                    ClaudeProviderConfig(
                        apiKey = apiKey,
                        onApiKeyChange = onApiKeyChange,
                        model = model,
                        onModelChange = onModelChange,
                        temperature = temperature,
                        onTemperatureChange = onTemperatureChange,
                        maxTokens = maxTokens,
                        onMaxTokensChange = onMaxTokensChange
                    )
                }
                ModelProvider.OPENAI -> {
                    OpenAiProviderConfig(
                        apiKey = apiKey,
                        onApiKeyChange = onApiKeyChange,
                        model = model,
                        onModelChange = onModelChange,
                        temperature = temperature,
                        onTemperatureChange = onTemperatureChange,
                        maxTokens = maxTokens,
                        onMaxTokensChange = onMaxTokensChange
                    )
                }
                ModelProvider.OLLAMA -> {
                    OllamaProviderConfig(
                        baseUrl = baseUrl,
                        onBaseUrlChange = onBaseUrlChange,
                        model = model,
                        onModelChange = onModelChange,
                        temperature = temperature,
                        onTemperatureChange = onTemperatureChange,
                        maxTokens = maxTokens,
                        onMaxTokensChange = onMaxTokensChange
                    )
                }
                ModelProvider.OPENAI_COMPATIBLE -> {
                    GenericOpenAiProviderConfig(
                        baseUrl = baseUrl,
                        onBaseUrlChange = onBaseUrlChange,
                        apiKey = apiKey,
                        onApiKeyChange = onApiKeyChange,
                        model = model,
                        onModelChange = onModelChange,
                        temperature = temperature,
                        onTemperatureChange = onTemperatureChange,
                        maxTokens = maxTokens,
                        onMaxTokensChange = onMaxTokensChange
                    )
                }
                ModelProvider.DICTATOR -> {
                    DictatorProviderConfig()
                }
            }
        }
    }
}

@Composable
private fun ProviderSelector(
    selectedProvider: ModelProvider,
    onProviderChange: (ModelProvider) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it }
    ) {
        TextField(
            value = selectedProvider.name.replace("_", " "),
            onValueChange = {},
            readOnly = true,
            label = { Text("AI Provider") },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(),
            trailingIcon = {
                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
            }
        )

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            ModelProvider.values().forEach { provider ->
                DropdownMenuItem(
                    text = { Text(provider.name.replace("_", " ")) },
                    onClick = {
                        onProviderChange(provider)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun ClaudeProviderConfig(
    apiKey: String,
    onApiKeyChange: (String) -> Unit,
    model: String,
    onModelChange: (String) -> Unit,
    temperature: Double,
    onTemperatureChange: (Double) -> Unit,
    maxTokens: Int,
    onMaxTokensChange: (Int) -> Unit
) {
    var isPasswordVisible by remember { mutableStateOf(false) }

    TextField(
        value = apiKey,
        onValueChange = onApiKeyChange,
        label = { Text("API Key") },
        placeholder = { Text("sk-ant-...") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        visualTransformation = if (isPasswordVisible) {
            VisualTransformation.None
        } else {
            PasswordVisualTransformation()
        },
        trailingIcon = {
            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                Text(if (isPasswordVisible) "Hide" else "Show", style = MaterialTheme.typography.labelSmall)
            }
        },
        singleLine = true
    )

    TextField(
        value = model,
        onValueChange = onModelChange,
        label = { Text("Model") },
        placeholder = { Text("claude-sonnet-4-6") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        singleLine = true
    )

    TemperatureSlider(value = temperature, onValueChange = onTemperatureChange)
    MaxTokensInput(value = maxTokens, onValueChange = onMaxTokensChange)
}

@Composable
private fun OpenAiProviderConfig(
    apiKey: String,
    onApiKeyChange: (String) -> Unit,
    model: String,
    onModelChange: (String) -> Unit,
    temperature: Double,
    onTemperatureChange: (Double) -> Unit,
    maxTokens: Int,
    onMaxTokensChange: (Int) -> Unit
) {
    var isPasswordVisible by remember { mutableStateOf(false) }

    TextField(
        value = apiKey,
        onValueChange = onApiKeyChange,
        label = { Text("API Key") },
        placeholder = { Text("sk-proj-...") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        visualTransformation = if (isPasswordVisible) {
            VisualTransformation.None
        } else {
            PasswordVisualTransformation()
        },
        trailingIcon = {
            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                Text(if (isPasswordVisible) "Hide" else "Show", style = MaterialTheme.typography.labelSmall)
            }
        },
        singleLine = true
    )

    TextField(
        value = model,
        onValueChange = onModelChange,
        label = { Text("Model") },
        placeholder = { Text("gpt-4o") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        singleLine = true
    )

    TemperatureSlider(value = temperature, onValueChange = onTemperatureChange)
    MaxTokensInput(value = maxTokens, onValueChange = onMaxTokensChange)
}

@Composable
private fun OllamaProviderConfig(
    baseUrl: String,
    onBaseUrlChange: (String) -> Unit,
    model: String,
    onModelChange: (String) -> Unit,
    temperature: Double,
    onTemperatureChange: (Double) -> Unit,
    maxTokens: Int,
    onMaxTokensChange: (Int) -> Unit
) {
    TextField(
        value = baseUrl,
        onValueChange = onBaseUrlChange,
        label = { Text("Base URL") },
        placeholder = { Text("http://localhost:11434") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Uri,
            imeAction = ImeAction.Done
        ),
        singleLine = true
    )

    TextField(
        value = model,
        onValueChange = onModelChange,
        label = { Text("Model") },
        placeholder = { Text("mistral") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        singleLine = true
    )

    TemperatureSlider(value = temperature, onValueChange = onTemperatureChange)
    MaxTokensInput(value = maxTokens, onValueChange = onMaxTokensChange)
}

@Composable
private fun GenericOpenAiProviderConfig(
    baseUrl: String,
    onBaseUrlChange: (String) -> Unit,
    apiKey: String,
    onApiKeyChange: (String) -> Unit,
    model: String,
    onModelChange: (String) -> Unit,
    temperature: Double,
    onTemperatureChange: (Double) -> Unit,
    maxTokens: Int,
    onMaxTokensChange: (Int) -> Unit
) {
    var isPasswordVisible by remember { mutableStateOf(false) }

    TextField(
        value = baseUrl,
        onValueChange = onBaseUrlChange,
        label = { Text("Base URL") },
        placeholder = { Text("https://api.example.com/v1") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Uri,
            imeAction = ImeAction.Done
        ),
        singleLine = true
    )

    TextField(
        value = apiKey,
        onValueChange = onApiKeyChange,
        label = { Text("API Key") },
        placeholder = { Text("sk-...") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        visualTransformation = if (isPasswordVisible) {
            VisualTransformation.None
        } else {
            PasswordVisualTransformation()
        },
        trailingIcon = {
            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                Text(if (isPasswordVisible) "Hide" else "Show", style = MaterialTheme.typography.labelSmall)
            }
        },
        singleLine = true
    )

    TextField(
        value = model,
        onValueChange = onModelChange,
        label = { Text("Model") },
        placeholder = { Text("gpt-3.5-turbo") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        singleLine = true
    )

    TemperatureSlider(value = temperature, onValueChange = onTemperatureChange)
    MaxTokensInput(value = maxTokens, onValueChange = onMaxTokensChange)
}

@Composable
private fun TemperatureSlider(
    value: Double,
    onValueChange: (Double) -> Unit
) {
    Column(modifier = Modifier.padding(bottom = 12.dp)) {
        Text(
            "Temperature: ${String.format("%.2f", value)}",
            style = MaterialTheme.typography.labelMedium
        )
        Slider(
            value = value.toFloat(),
            onValueChange = { onValueChange(it.toDouble()) },
            valueRange = 0f..2f,
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            "Lower = more deterministic, Higher = more creative",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun MaxTokensInput(
    value: Int,
    onValueChange: (Int) -> Unit
) {
    TextField(
        value = value.toString(),
        onValueChange = { input ->
            val intValue = input.toIntOrNull()
            if (intValue != null && intValue >= 0) {
                onValueChange(intValue)
            } else if (input.isEmpty()) {
                onValueChange(0)
            }
        },
        label = { Text("Max Tokens") },
        placeholder = { Text("2048") },
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done
        ),
        singleLine = true
    )
}

@Composable
private fun DictatorProviderConfig() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp)
    ) {
        Text(
            "Dictator Service Configuration",
            style = MaterialTheme.typography.labelMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            "Using Dictator Service - no additional configuration needed. This is the Dictator-hosted AI service.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(8.dp)
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    "✓ Zero-configuration AI service",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    "✓ No API keys required",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    "✓ Hosted by Dictator team",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
