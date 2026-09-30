package com.dictator.android.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.core.data.voice.VoiceSettings
import com.dictator.core.data.voice.ActivationCommand
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.android.data.AidosEngineConnection
import com.dictator.android.data.ai.AiSettingsKeys
import com.dictator.android.data.dictation.DictationEngineKind
import com.dictator.core.data.ai.ModelProvider
import fi.italeino.aidos.sdk.client.EngineAvailability
import com.dictator.core.service.SharedPreferences
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class SettingsMode {
    data object DictatorService : SettingsMode()
    data object DirectProvider : SettingsMode()
}

data class SettingsState(
    val mode: SettingsMode = SettingsMode.DirectProvider,
    val dictatorServiceUrl: String = "",
    val selectedProvider: ModelProvider = ModelProvider.AIDOS,
    val apiKey: String = "",
    val baseUrl: String = "",
    val model: String = "",
    val temperature: Double = 0.7,
    val maxTokens: Int = 2048,
    val isLoading: Boolean = false,
    val isSaved: Boolean = false,
    val errorMessage: String? = null,
    val testConnectionStatus: String? = null,
    // Voice settings
    val voiceSettings: VoiceSettings? = null,
    // Dictation
    val dictationEngine: DictationEngineKind = DictationEngineKind.SYSTEM,
    val language: String = "en-US",
    // Aidos Engine (null = not checked yet)
    val engineAvailability: EngineAvailability? = null,
    val engineChecking: Boolean = false,
    val engineLlmModels: List<String> = emptyList(),
    val engineSttModels: List<String> = emptyList(),
    val aidosModel: String = "",
    val sttModel: String = ""
)

class SettingsViewModel constructor(
    private val sharedPreferences: SharedPreferences,
    private val engine: AidosEngineConnection,
    private val voiceSettingsRepository: VoiceSettingsRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state

    init {
        loadSettings()
        refreshEngine()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            try {
                val mode = sharedPreferences.getString(AiSettingsKeys.MODE, AiSettingsKeys.MODE_DIRECT)
                val settingsMode = when (mode) {
                    "direct_provider" -> SettingsMode.DirectProvider
                    else -> SettingsMode.DictatorService
                }

                val dictatorServiceUrl = sharedPreferences.getString("dictator_service_url", "") ?: ""
                val providerType = sharedPreferences.getString(AiSettingsKeys.PROVIDER, ModelProvider.AIDOS.name) ?: ModelProvider.AIDOS.name
                val selectedProvider = try {
                    ModelProvider.valueOf(providerType)
                } catch (e: Exception) {
                    ModelProvider.AIDOS
                }
                val apiKey = sharedPreferences.getString("provider_api_key", "") ?: ""
                val baseUrl = sharedPreferences.getString("provider_base_url", "") ?: ""
                val model = sharedPreferences.getString("provider_model", getDefaultModel(selectedProvider)) ?: ""
                val temperature = (sharedPreferences.getString("provider_temperature", "0.7") ?: "0.7").toDoubleOrNull() ?: 0.7
                val maxTokens = (sharedPreferences.getString("provider_max_tokens", "2048") ?: "2048").toIntOrNull() ?: 2048

                _state.value = _state.value.copy(
                    mode = settingsMode,
                    dictatorServiceUrl = dictatorServiceUrl,
                    selectedProvider = selectedProvider,
                    apiKey = apiKey,
                    baseUrl = baseUrl,
                    model = model,
                    temperature = temperature,
                    maxTokens = maxTokens,
                    dictationEngine = DictationEngineKind.fromPref(sharedPreferences.getString(AiSettingsKeys.DICTATION_ENGINE, null)),
                    language = voiceSettingsRepository.loadVoiceSettings().language,
                    aidosModel = sharedPreferences.getString(AiSettingsKeys.AIDOS_MODEL, "") ?: "",
                    sttModel = sharedPreferences.getString(AiSettingsKeys.STT_MODEL, "") ?: ""
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
                            ModelProvider.DICTATOR, ModelProvider.AIDOS -> Unit // nothing to configure here
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
                        sharedPreferences.setString(AiSettingsKeys.MODE, AiSettingsKeys.MODE_SERVICE)
                        sharedPreferences.setString(AiSettingsKeys.SERVICE_URL, currentState.dictatorServiceUrl)
                    }
                    SettingsMode.DirectProvider -> {
                        sharedPreferences.setString(AiSettingsKeys.MODE, AiSettingsKeys.MODE_DIRECT)
                        sharedPreferences.setString(AiSettingsKeys.PROVIDER, currentState.selectedProvider.name)
                        sharedPreferences.setString(AiSettingsKeys.API_KEY, currentState.apiKey)
                        sharedPreferences.setString(AiSettingsKeys.BASE_URL, currentState.baseUrl)
                        sharedPreferences.setString(AiSettingsKeys.MODEL, currentState.model)
                        sharedPreferences.setString(AiSettingsKeys.TEMPERATURE, currentState.temperature.toString())
                        sharedPreferences.setString(AiSettingsKeys.MAX_TOKENS, currentState.maxTokens.toString())
                        sharedPreferences.setString(AiSettingsKeys.AIDOS_MODEL, currentState.aidosModel)
                    }
                }

                sharedPreferences.setString(AiSettingsKeys.DICTATION_ENGINE, currentState.dictationEngine.prefValue)
                sharedPreferences.setString(AiSettingsKeys.STT_MODEL, currentState.sttModel)
                voiceSettingsRepository.setLanguage(currentState.language)

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
            val current = _state.value
            if (current.mode == SettingsMode.DirectProvider && current.selectedProvider == ModelProvider.AIDOS) {
                _state.value = current.copy(testConnectionStatus = "Checking Aidos Engine…")
                val availability = engine.connect()
                _state.value = _state.value.copy(
                    engineAvailability = availability,
                    testConnectionStatus = (if (availability == EngineAvailability.Available) "✓ " else "✗ ") + AidosEngineConnection.explain(availability)
                )
                return@launch
            }
            // The other providers are not called from here; say only what was checked.
            val complete = when (current.mode) {
                SettingsMode.DictatorService -> current.dictatorServiceUrl.isNotBlank() && isValidUrl(current.dictatorServiceUrl)
                SettingsMode.DirectProvider -> when (current.selectedProvider) {
                    ModelProvider.CLAUDE, ModelProvider.OPENAI -> current.apiKey.isNotBlank()
                    ModelProvider.OLLAMA -> current.baseUrl.isNotBlank() && isValidUrl(current.baseUrl)
                    ModelProvider.OPENAI_COMPATIBLE -> current.baseUrl.isNotBlank() && current.apiKey.isNotBlank()
                    ModelProvider.DICTATOR -> true
                    ModelProvider.AIDOS -> true
                }
            }
            _state.value = current.copy(
                testConnectionStatus = if (complete) "✓ Settings look complete (the service itself is not contacted)" else "✗ Missing or invalid fields"
            )
        }
    }

    // ---- Aidos Engine & dictation ------------------------------------------------------------

    /** Handshake with Engine and read which models it offers. */
    fun refreshEngine() {
        viewModelScope.launch {
            _state.value = _state.value.copy(engineChecking = true)
            val availability = engine.connect()
            val models = if (availability == EngineAvailability.Available) runCatching { engine.client.capabilities().models }.getOrDefault(emptyList()) else emptyList()
            _state.value = _state.value.copy(
                engineChecking = false,
                engineAvailability = availability,
                engineLlmModels = models.filter { it.kind == "llm" }.map { it.id },
                engineSttModels = models.filter { it.kind == "stt" }.map { it.id }
            )
        }
    }

    /** Intent that opens Engine's Connected Apps screen while approval is pending. */
    fun approvalIntent() = engine.pendingApprovalIntent()

    fun setDictationEngine(kind: DictationEngineKind) {
        _state.value = _state.value.copy(dictationEngine = kind, errorMessage = null)
    }

    fun setLanguage(language: String) {
        _state.value = _state.value.copy(language = language, errorMessage = null)
    }

    fun setAidosModel(model: String) {
        _state.value = _state.value.copy(aidosModel = model)
    }

    fun setSttModel(model: String) {
        _state.value = _state.value.copy(sttModel = model)
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
            ModelProvider.DICTATOR -> ""
            ModelProvider.AIDOS -> ""
        }
    }
}
