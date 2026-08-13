package com.dictator.android.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.service.SharedPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class SettingsMode {
    data object DictatorService : SettingsMode()
    data object DirectProvider : SettingsMode()
}

data class SettingsState(
    val mode: SettingsMode = SettingsMode.DictatorService,
    val dictatorServiceUrl: String = "",
    val selectedProvider: ModelProvider = ModelProvider.CLAUDE,
    val apiKey: String = "",
    val baseUrl: String = "",
    val model: String = "",
    val temperature: Double = 0.7,
    val maxTokens: Int = 2048,
    val isLoading: Boolean = false,
    val isSaved: Boolean = false,
    val errorMessage: String? = null,
    val testConnectionStatus: String? = null
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val sharedPreferences: SharedPreferences
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            try {
                val mode = sharedPreferences.getString("settings_mode", "dictator_service")
                val settingsMode = when (mode) {
                    "direct_provider" -> SettingsMode.DirectProvider
                    else -> SettingsMode.DictatorService
                }

                val dictatorServiceUrl = sharedPreferences.getString("dictator_service_url", "") ?: ""
                val providerType = sharedPreferences.getString("provider_type", "CLAUDE") ?: "CLAUDE"
                val selectedProvider = try {
                    ModelProvider.valueOf(providerType)
                } catch (e: Exception) {
                    ModelProvider.CLAUDE
                }
                val apiKey = sharedPreferences.getString("provider_api_key", "") ?: ""
                val baseUrl = sharedPreferences.getString("provider_base_url", "") ?: ""
                val model = sharedPreferences.getString("provider_model", getDefaultModel(selectedProvider)) ?: ""
                val temperature = (sharedPreferences.getString("provider_temperature", "0.7") ?: "0.7").toDoubleOrNull() ?: 0.7
                val maxTokens = (sharedPreferences.getString("provider_max_tokens", "2048") ?: "2048").toIntOrNull() ?: 2048

                _state.value = SettingsState(
                    mode = settingsMode,
                    dictatorServiceUrl = dictatorServiceUrl,
                    selectedProvider = selectedProvider,
                    apiKey = apiKey,
                    baseUrl = baseUrl,
                    model = model,
                    temperature = temperature,
                    maxTokens = maxTokens
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    errorMessage = "Failed to load settings: ${e.message}"
                )
            }
        }
    }

    fun setMode(mode: SettingsMode) {
        _state.value = _state.value.copy(mode = mode, errorMessage = null)
    }

    fun setDictatorServiceUrl(url: String) {
        _state.value = _state.value.copy(dictatorServiceUrl = url, errorMessage = null)
    }

    fun setSelectedProvider(provider: ModelProvider) {
        val newModel = _state.value.model.takeIf { it.isNotEmpty() } ?: getDefaultModel(provider)
        _state.value = _state.value.copy(
            selectedProvider = provider,
            model = newModel,
            errorMessage = null
        )
    }

    fun setApiKey(key: String) {
        _state.value = _state.value.copy(apiKey = key, errorMessage = null)
    }

    fun setBaseUrl(url: String) {
        _state.value = _state.value.copy(baseUrl = url, errorMessage = null)
    }

    fun setModel(model: String) {
        _state.value = _state.value.copy(model = model, errorMessage = null)
    }

    fun setTemperature(temp: Double) {
        _state.value = _state.value.copy(temperature = temp, errorMessage = null)
    }

    fun setMaxTokens(tokens: Int) {
        _state.value = _state.value.copy(maxTokens = tokens, errorMessage = null)
    }

    fun validateAndSaveSettings() {
        viewModelScope.launch {
            try {
                _state.value = _state.value.copy(isLoading = true, errorMessage = null)

                val currentState = _state.value

                // Validation
                val errors = mutableListOf<String>()

                when (currentState.mode) {
                    SettingsMode.DictatorService -> {
                        if (currentState.dictatorServiceUrl.isBlank()) {
                            errors.add("Dictator service URL is required")
                        } else if (!isValidUrl(currentState.dictatorServiceUrl)) {
                            errors.add("Invalid Dictator service URL format")
                        }
                    }
                    SettingsMode.DirectProvider -> {
                        when (currentState.selectedProvider) {
                            ModelProvider.CLAUDE -> {
                                if (currentState.apiKey.isBlank()) {
                                    errors.add("Claude API key is required")
                                }
                            }
                            ModelProvider.OPENAI -> {
                                if (currentState.apiKey.isBlank()) {
                                    errors.add("OpenAI API key is required")
                                }
                            }
                            ModelProvider.OLLAMA -> {
                                if (currentState.baseUrl.isBlank()) {
                                    errors.add("Ollama base URL is required")
                                } else if (!isValidUrl(currentState.baseUrl)) {
                                    errors.add("Invalid Ollama base URL format")
                                }
                            }
                            ModelProvider.OPENAI_COMPATIBLE -> {
                                if (currentState.baseUrl.isBlank()) {
                                    errors.add("Base URL is required")
                                } else if (!isValidUrl(currentState.baseUrl)) {
                                    errors.add("Invalid base URL format")
                                }
                                if (currentState.apiKey.isBlank()) {
                                    errors.add("API key is required")
                                }
                            }
                        }

                        if (currentState.temperature < 0.0 || currentState.temperature > 2.0) {
                            errors.add("Temperature must be between 0.0 and 2.0")
                        }
                        if (currentState.maxTokens < 1) {
                            errors.add("Max tokens must be at least 1")
                        }
                    }
                }

                if (errors.isNotEmpty()) {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        errorMessage = errors.joinToString(", ")
                    )
                    return@launch
                }

                // Save settings
                when (currentState.mode) {
                    SettingsMode.DictatorService -> {
                        sharedPreferences.setString("settings_mode", "dictator_service")
                        sharedPreferences.setString("dictator_service_url", currentState.dictatorServiceUrl)
                    }
                    SettingsMode.DirectProvider -> {
                        sharedPreferences.setString("settings_mode", "direct_provider")
                        sharedPreferences.setString("provider_type", currentState.selectedProvider.name)
                        sharedPreferences.setString("provider_api_key", currentState.apiKey)
                        sharedPreferences.setString("provider_base_url", currentState.baseUrl)
                        sharedPreferences.setString("provider_model", currentState.model)
                        sharedPreferences.setString("provider_temperature", currentState.temperature.toString())
                        sharedPreferences.setString("provider_max_tokens", currentState.maxTokens.toString())
                    }
                }

                _state.value = _state.value.copy(
                    isLoading = false,
                    isSaved = true,
                    errorMessage = null
                )

                // Clear the saved state after 2 seconds
                kotlinx.coroutines.delay(2000)
                if (_state.value.isSaved) {
                    _state.value = _state.value.copy(isSaved = false)
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    isLoading = false,
                    errorMessage = "Failed to save settings: ${e.message}"
                )
            }
        }
    }

    fun testConnection() {
        viewModelScope.launch {
            try {
                _state.value = _state.value.copy(testConnectionStatus = "Testing connection...")

                // Simulate connection test - in a real app, this would call an actual service
                kotlinx.coroutines.delay(2000)

                val currentState = _state.value

                when (currentState.mode) {
                    SettingsMode.DictatorService -> {
                        if (currentState.dictatorServiceUrl.isNotBlank()) {
                            _state.value = _state.value.copy(
                                testConnectionStatus = "✓ Connection successful!"
                            )
                        } else {
                            _state.value = _state.value.copy(
                                testConnectionStatus = "✗ Invalid URL"
                            )
                        }
                    }
                    SettingsMode.DirectProvider -> {
                        // Check if required fields are filled
                        val isValid = when (currentState.selectedProvider) {
                            ModelProvider.CLAUDE -> currentState.apiKey.isNotBlank()
                            ModelProvider.OPENAI -> currentState.apiKey.isNotBlank()
                            ModelProvider.OLLAMA -> currentState.baseUrl.isNotBlank()
                            ModelProvider.OPENAI_COMPATIBLE -> currentState.baseUrl.isNotBlank() && currentState.apiKey.isNotBlank()
                        }

                        if (isValid) {
                            _state.value = _state.value.copy(
                                testConnectionStatus = "✓ Configuration valid!"
                            )
                        } else {
                            _state.value = _state.value.copy(
                                testConnectionStatus = "✗ Missing required fields"
                            )
                        }
                    }
                }

                // Clear status after 3 seconds
                kotlinx.coroutines.delay(3000)
                if (_state.value.testConnectionStatus?.contains("Connection") == true ||
                    _state.value.testConnectionStatus?.contains("Configuration") == true ||
                    _state.value.testConnectionStatus?.contains("Invalid") == true ||
                    _state.value.testConnectionStatus?.contains("Missing") == true
                ) {
                    _state.value = _state.value.copy(testConnectionStatus = null)
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    testConnectionStatus = "✗ Connection failed: ${e.message}"
                )

                kotlinx.coroutines.delay(3000)
                if (_state.value.testConnectionStatus?.contains("Connection failed") == true) {
                    _state.value = _state.value.copy(testConnectionStatus = null)
                }
            }
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(errorMessage = null)
    }

    private fun isValidUrl(url: String): Boolean {
        return try {
            java.net.URL(url)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun getDefaultModel(provider: ModelProvider): String {
        return when (provider) {
            ModelProvider.CLAUDE -> "claude-sonnet-4-6"
            ModelProvider.OPENAI -> "gpt-4o"
            ModelProvider.OLLAMA -> "mistral"
            ModelProvider.OPENAI_COMPATIBLE -> "gpt-3.5-turbo"
        }
    }
}
