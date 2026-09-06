package com.dictator.android.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.android.ui.ai.AidosAiProvider
import com.dictator.android.ui.ai.AndroidAiProviderResolver
import com.dictator.core.data.ai.AiInlineRequest
import com.dictator.core.data.ai.AiProviderFactory
import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.data.ai.ProviderConfig
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.core.data.voice.ActivationCommand
import com.dictator.core.data.voice.VoiceSettings
import com.dictator.core.service.SharedPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import io.ktor.client.HttpClient
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class SettingsMode {
    data object DictatorService : SettingsMode()
    data object DirectProvider : SettingsMode()
}

data class SettingsState(
    val mode: SettingsMode = SettingsMode.DictatorService,
    val dictatorServiceUrl: String = AndroidAiProviderResolver.DEFAULT_DICTATOR_URL,
    val selectedProvider: ModelProvider = ModelProvider.CLAUDE,
    val apiKey: String = "",
    val baseUrl: String = "",
    val model: String = "",
    val temperature: Double = 0.7,
    val maxTokens: Int = 2048,
    val isLoading: Boolean = false,
    val isSaved: Boolean = false,
    val errorMessage: String? = null,
    val testConnectionStatus: String? = null,
    val voiceSettings: VoiceSettings? = null
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val sharedPreferences: SharedPreferences,
    private val httpClient: HttpClient
) : ViewModel() {
    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state

    init { loadSettings() }

    private fun loadSettings() {
        viewModelScope.launch {
            try {
                val mode = sharedPreferences.getString("settings_mode", "dictator_service")
                val settingsMode = if (mode == "direct_provider") SettingsMode.DirectProvider else SettingsMode.DictatorService
                val dictatorServiceUrl = sharedPreferences.getString("dictator_service_url", AndroidAiProviderResolver.DEFAULT_DICTATOR_URL)
                    ?: AndroidAiProviderResolver.DEFAULT_DICTATOR_URL
                val providerType = sharedPreferences.getString("provider_type", ModelProvider.CLAUDE.name)
                val selectedProvider = providerType?.let { runCatching { ModelProvider.valueOf(it) }.getOrNull() } ?: ModelProvider.CLAUDE
                val apiKey = sharedPreferences.getString("provider_api_key", "") ?: ""
                val baseUrl = sharedPreferences.getString("provider_base_url", "") ?: ""
                val model = sharedPreferences.getString("provider_model", null) ?: getDefaultModel(selectedProvider)
                val temperature = (sharedPreferences.getString("provider_temperature", "0.7") ?: "0.7").toDoubleOrNull() ?: 0.7
                val maxTokens = (sharedPreferences.getString("provider_max_tokens", "2048") ?: "2048").toIntOrNull() ?: 2048
                _state.value = SettingsState(settingsMode, dictatorServiceUrl, selectedProvider, apiKey, baseUrl, model, temperature, maxTokens)
            } catch (e: Exception) {
                _state.value = _state.value.copy(errorMessage = "Failed to load settings: ${e.message}")
            }
        }
    }

    fun setMode(mode: SettingsMode) { _state.value = _state.value.copy(mode = mode, errorMessage = null) }
    fun setDictatorServiceUrl(url: String) { _state.value = _state.value.copy(dictatorServiceUrl = url, errorMessage = null) }
    fun setSelectedProvider(provider: ModelProvider) {
        _state.value = _state.value.copy(selectedProvider = provider, model = getDefaultModel(provider), errorMessage = null)
    }
    fun setApiKey(key: String) { _state.value = _state.value.copy(apiKey = key, errorMessage = null) }
    fun setBaseUrl(url: String) { _state.value = _state.value.copy(baseUrl = url, errorMessage = null) }
    fun setModel(model: String) { _state.value = _state.value.copy(model = model, errorMessage = null) }
    fun setTemperature(temp: Double) { _state.value = _state.value.copy(temperature = temp, errorMessage = null) }
    fun setMaxTokens(tokens: Int) { _state.value = _state.value.copy(maxTokens = tokens, errorMessage = null) }

    fun validateAndSaveSettings() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            val currentState = _state.value
            val errors = validate(currentState)
            if (errors.isNotEmpty()) {
                _state.value = _state.value.copy(isLoading = false, errorMessage = errors.joinToString(", "))
                return@launch
            }
            try {
                when (currentState.mode) {
                    SettingsMode.DictatorService -> {
                        sharedPreferences.setString("settings_mode", "dictator_service")
                        sharedPreferences.setString("dictator_service_url", currentState.dictatorServiceUrl.trim())
                    }
                    SettingsMode.DirectProvider -> {
                        sharedPreferences.setString("settings_mode", "direct_provider")
                        sharedPreferences.setString("provider_type", currentState.selectedProvider.name)
                        sharedPreferences.setString("provider_api_key", currentState.apiKey)
                        sharedPreferences.setString("provider_base_url", currentState.baseUrl.trim())
                        sharedPreferences.setString("provider_model", currentState.model.trim())
                        sharedPreferences.setString("provider_temperature", currentState.temperature.toString())
                        sharedPreferences.setString("provider_max_tokens", currentState.maxTokens.toString())
                    }
                }
                _state.value = _state.value.copy(isLoading = false, isSaved = true, errorMessage = null)
                kotlinx.coroutines.delay(2000)
                if (_state.value.isSaved) _state.value = _state.value.copy(isSaved = false)
            } catch (e: Exception) {
                _state.value = _state.value.copy(isLoading = false, errorMessage = "Failed to save settings: ${e.message}")
            }
        }
    }

    fun testConnection() {
        viewModelScope.launch {
            val currentState = _state.value
            val errors = validate(currentState)
            if (errors.isNotEmpty()) {
                _state.value = _state.value.copy(testConnectionStatus = "✗ ${errors.joinToString(", ")}")
                return@launch
            }
            _state.value = _state.value.copy(testConnectionStatus = "Testing connection...")
            try {
                val provider = when (currentState.mode) {
                    SettingsMode.DictatorService -> AiProviderFactory.createProvider(
                        httpClient,
                        ProviderConfig(type = ModelProvider.DICTATOR, baseUrl = currentState.dictatorServiceUrl.trim(), model = "dictator-ai-default")
                    )
                    SettingsMode.DirectProvider -> if (currentState.selectedProvider == ModelProvider.AIDOS) {
                        AidosAiProvider(
                            context = getApplicationContext(),
                            model = currentState.model.trim(),
                            temperature = currentState.temperature.toFloat(),
                            maxTokens = currentState.maxTokens
                        )
                    } else {
                        AiProviderFactory.createProvider(
                            httpClient,
                            ProviderConfig(
                                type = currentState.selectedProvider,
                                apiKey = currentState.apiKey,
                                baseUrl = currentState.baseUrl.ifBlank { null },
                                model = currentState.model.ifBlank { null },
                                temperature = currentState.temperature,
                                maxTokens = currentState.maxTokens
                            )
                        )
                    }
                }
                if (!provider.isConfigured()) throw IllegalStateException("Provider is not configured")
                val response = provider.askInline(AiInlineRequest(prompt = "Reply with OK.", temperature = 0.0, maxTokens = 8))
                if (response.content.isBlank()) throw IllegalStateException("Provider returned an empty response")
                _state.value = _state.value.copy(testConnectionStatus = "✓ Connection successful (${provider.getProviderType().name} / ${provider.getModelName()})")
            } catch (e: Exception) {
                _state.value = _state.value.copy(testConnectionStatus = "✗ Connection failed: ${e.message ?: "Unknown error"}")
            }
        }
    }

    fun clearError() { _state.value = _state.value.copy(errorMessage = null) }

    private fun validate(state: SettingsState): List<String> {
        val errors = mutableListOf<String>()
        when (state.mode) {
            SettingsMode.DictatorService -> {
                if (state.dictatorServiceUrl.isBlank()) errors.add("Dictator service URL is required")
                else if (!isValidUrl(state.dictatorServiceUrl)) errors.add("Invalid Dictator service URL format")
            }
            SettingsMode.DirectProvider -> {
                when (state.selectedProvider) {
                    ModelProvider.CLAUDE -> if (state.apiKey.isBlank()) errors.add("Claude API key is required")
                    ModelProvider.OPENAI -> if (state.apiKey.isBlank()) errors.add("OpenAI API key is required")
                    ModelProvider.OLLAMA -> if (state.baseUrl.isBlank()) errors.add("Ollama base URL is required") else if (!isValidUrl(state.baseUrl)) errors.add("Invalid Ollama base URL format")
                    ModelProvider.OPENAI_COMPATIBLE -> {
                        if (state.baseUrl.isBlank()) errors.add("Base URL is required") else if (!isValidUrl(state.baseUrl)) errors.add("Invalid base URL format")
                        if (state.apiKey.isBlank()) errors.add("API key is required")
                    }
                    ModelProvider.DICTATOR, ModelProvider.AIDOS -> Unit
                }
                if (state.model.isBlank()) errors.add("Model is required")
                if (state.temperature !in 0.0..2.0) errors.add("Temperature must be between 0.0 and 2.0")
                if (state.maxTokens < 1) errors.add("Max tokens must be at least 1")
            }
        }
        return errors
    }

    private fun isValidUrl(url: String): Boolean = runCatching { java.net.URL(url) }.isSuccess

    private fun getDefaultModel(provider: ModelProvider): String = when (provider) {
        ModelProvider.CLAUDE -> "claude-sonnet-4-6"
        ModelProvider.OPENAI -> "gpt-4o"
        ModelProvider.OLLAMA -> "mistral"
        ModelProvider.OPENAI_COMPATIBLE -> "gpt-3.5-turbo"
        ModelProvider.DICTATOR -> "dictator-ai-default"
        ModelProvider.AIDOS -> AidosAiProvider.DEFAULT_MODEL
    }

    private fun getApplicationContext(): android.content.Context =
        androidx.test.core.app.ApplicationProvider.getApplicationContext()
}
