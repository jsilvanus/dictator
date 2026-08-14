package com.dictator.android.ui.voice

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.core.data.voice.ActivationCommand
import com.dictator.core.data.voice.VoiceSettings
import com.dictator.core.data.local.VoiceSettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.aakira.napier.Napier
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.cancel
import javax.inject.Inject
import com.dictator.core.domain.entity.CursorSize
import com.dictator.core.domain.entity.CursorState
import com.dictator.core.domain.entity.CursorPosition
import com.dictator.core.util.cursor.CursorCommandParser
import com.dictator.core.util.cursor.CursorCommandExecutor
import com.dictator.core.util.privacy.SensitiveDataDetector

enum class VoiceState {
    IDLE, LISTENING, PROCESSING, ERROR, SUCCESS
}

data class VoiceUiState(
    val state: VoiceState = VoiceState.IDLE,
    val transcribedText: String = "",
    val confidence: Float = 0f,
    val isPermissionGranted: Boolean = false,
    val errorMessage: String? = null,
    val waveformAmplitudes: List<Float> = emptyList(),
    // IMPROVEMENT: Silence detection and timeout tracking
    val silenceDuration: Long = 0L,
    val recordingDuration: Long = 0L,
    // Language-specific activation commands
    val currentLanguage: String = "en-US",
    val activationCommands: List<ActivationCommand> = emptyList(),
    // Cursor state tracking
    val cursorSize: CursorSize = CursorSize.WORD,
    val cursorState: CursorState? = null,
    // PII detection state
    val detectedPiiCount: Int = 0,
    val piiRiskLevel: String = "low",
    val showPiiDialog: Boolean = false
)

@HiltViewModel
class VoiceViewModel @Inject constructor(
    private val voiceSettingsRepository: VoiceSettingsRepository? = null
) : ViewModel() {
    private val _state = MutableStateFlow(VoiceUiState())
    val state: StateFlow<VoiceUiState> = _state.asStateFlow()

    private var recordingJob: Job? = null
    private var silenceDetectionJob: Job? = null
    
    // Callback for permission request results from the UI
    var onPermissionResult: ((Boolean) -> Unit)? = null

    companion object {
        // IMPROVEMENT: Timeout configuration
        private const val MAX_RECORDING_DURATION = 30000L  // 30 seconds
        private const val SILENCE_THRESHOLD = 5000L         // 5 seconds of silence = timeout
        private const val SILENCE_CHECK_INTERVAL = 500L     // Check every 500ms
    }

    init {
        loadVoiceSettings()
    }

    /**
     * Load voice settings and update current language and activation commands
     */
    private fun loadVoiceSettings() {
        viewModelScope.launch {
            try {
                val settings = voiceSettingsRepository?.loadVoiceSettings()
                if (settings != null) {
                    val commands = settings.activationCommands[settings.language] ?: emptyList()
                    _state.value = _state.value.copy(
                        currentLanguage = settings.language,
                        activationCommands = commands
                    )
                }
            } catch (e: Exception) {
                // Log error but don't crash
                Napier.e("Error loading voice settings", e)
            }
        }
    }

    /**
     * Update the language and load new activation commands
     */
    fun setLanguage(language: String) {
        viewModelScope.launch {
            try {
                voiceSettingsRepository?.setLanguage(language)
                val settings = voiceSettingsRepository?.loadVoiceSettings()
                if (settings != null) {
                    val commands = settings.activationCommands[language] ?: emptyList()
                    _state.value = _state.value.copy(
                        currentLanguage = language,
                        activationCommands = commands
                    )
                }
            } catch (e: Exception) {
                Napier.e("Error setting language", e)
            }
        }
    }

    /**
     * Get current activation commands for the active language
     */
    fun getCurrentActivationCommands(): List<ActivationCommand> {
        return _state.value.activationCommands
    }

    /**
     * Get activation phrases for a specific type (command or ai)
     */
    fun getActivationPhrases(type: String): List<String> {
        return _state.value.activationCommands
            .filter { it.type == type }
            .flatMap { it.phrases }
    }

    /**
     * Request microphone permission from the user.
     * The UI should use rememberLauncherForActivityResult to call this
     * and then call setPermissionGranted() when the result comes back.
     */
    fun requestMicrophonePermission() {
        // The UI layer (Compose) is responsible for launching the permission request
        // This ViewModel just tracks the result when permission is granted/denied
        Napier.d("Permission request initiated - waiting for user response")
    }
    
    /**
     * Called by the UI layer after permission request completes
     */
    fun setPermissionGranted(granted: Boolean) {
        _state.value = _state.value.copy(isPermissionGranted = granted)
        Napier.d("Microphone permission result: $granted")
        onPermissionResult?.invoke(granted)
    }

    fun startListening() {
        if (!_state.value.isPermissionGranted) {
            _state.value = _state.value.copy(
                state = VoiceState.ERROR,
                errorMessage = "Microphone permission not granted"
            )
            return
        }

        _state.value = _state.value.copy(
            state = VoiceState.LISTENING,
            transcribedText = "",
            errorMessage = null,
            waveformAmplitudes = emptyList(),
            silenceDuration = 0L,
            recordingDuration = 0L
        )

        // In real implementation, start SpeechRecognizer
        recordingJob = viewModelScope.launch {
            simulateListening()
        }

        // IMPROVEMENT: Start silence detection and timeout
        startSilenceDetection()
        startRecordingTimeout()
    }

    fun stopListening() {
        recordingJob?.cancel()
        silenceDetectionJob?.cancel()
        _state.value = _state.value.copy(state = VoiceState.PROCESSING)
        // In real implementation, stop SpeechRecognizer
    }

    fun clearTranscription() {
        _state.value = _state.value.copy(
            transcribedText = "",
            confidence = 0f,
            state = VoiceState.IDLE
        )
    }

    fun retry() {
        startListening()
    }

    // IMPROVEMENT: Silence detection implementation
    private fun startSilenceDetection() {
        silenceDetectionJob = viewModelScope.launch {
            var lastAudioLevel = 0f
            while (_state.value.state == VoiceState.LISTENING) {
                delay(SILENCE_CHECK_INTERVAL)
                
                // Simulate audio level detection
                val currentAudioLevel = (0..100).random().toFloat() / 100f
                
                if (currentAudioLevel < 0.1f) {
                    // Silence detected
                    val newSilenceDuration = _state.value.silenceDuration + SILENCE_CHECK_INTERVAL
                    _state.value = _state.value.copy(silenceDuration = newSilenceDuration)
                    
                    // Auto-stop after threshold reached
                    if (newSilenceDuration >= SILENCE_THRESHOLD) {
                        stopListening()
                        _state.value = _state.value.copy(
                            state = VoiceState.SUCCESS,
                            transcribedText = "Recording stopped due to silence",
                            confidence = 0.85f
                        )
                    }
                } else {
                    // User is speaking - reset silence counter
                    _state.value = _state.value.copy(silenceDuration = 0L)
                }
            }
        }
    }

    // IMPROVEMENT: Recording timeout implementation
    private fun startRecordingTimeout() {
        viewModelScope.launch {
            var elapsedTime = 0L
            while (_state.value.state == VoiceState.LISTENING && elapsedTime < MAX_RECORDING_DURATION) {
                delay(100L)
                elapsedTime += 100L
                _state.value = _state.value.copy(recordingDuration = elapsedTime)
            }
            
            // Auto-stop if max duration reached
            if (_state.value.state == VoiceState.LISTENING) {
                stopListening()
                _state.value = _state.value.copy(
                    state = VoiceState.ERROR,
                    errorMessage = "Recording timeout: Maximum 30 seconds exceeded"
                )
            }
        }
    }

    private suspend fun simulateListening() {
        // Simulate receiving voice input
        // In real implementation, this would be handled by SpeechRecognizer callback
        delay(2000L)  // Simulate 2 seconds of recording
        if (_state.value.state == VoiceState.LISTENING) {
            _state.value = _state.value.copy(
                state = VoiceState.SUCCESS,
                transcribedText = "This is a sample transcribed text",
                confidence = 0.95f
            )
        }
    }

    fun onError(message: String) {
        recordingJob?.cancel()
        silenceDetectionJob?.cancel()
        _state.value = _state.value.copy(
            state = VoiceState.ERROR,
            errorMessage = message
        )
    }

    /**
     * Handle cursor command from voice input
     * Parses and executes cursor commands, handles PII detection if needed
     */
    fun handleCursorCommand(text: String, documentContent: String) {
        viewModelScope.launch {
            try {
                // Check if text contains cursor commands
                if (!CursorCommandParser.containsCursorKeywords(text)) {
                    return@launch
                }

                // Get or initialize cursor state
                var currentCursorState = _state.value.cursorState ?: CursorState(
                    current = CursorPosition(0, 0, _state.value.cursorSize),
                    selection = null,
                    lastAction = "init"
                )

                // Update cursor size if detected in input
                val detectedSize = CursorCommandParser.detectCursorSize(text)
                if (detectedSize != null) {
                    _state.value = _state.value.copy(cursorSize = detectedSize)
                    currentCursorState = currentCursorState.copy(
                        current = currentCursorState.current.copy(size = detectedSize)
                    )
                }

                // Execute cursor commands
                val result = CursorCommandExecutor.handleCursorCommand(
                    text = documentContent,
                    voiceInput = text,
                    currentState = currentCursorState,
                    userLanguage = _state.value.currentLanguage
                )

                // Update cursor state
                _state.value = _state.value.copy(
                    cursorState = result.newState
                )

                // Check for PII if selection is active
                if (result.newState.selection?.isActive == true && result.selectedText != null) {
                    checkSelectionForPii(result.selectedText)
                }

                Napier.d("Cursor command executed: ${result.feedback}")
            } catch (e: Exception) {
                Napier.e("Error handling cursor command", e)
            }
        }
    }

    /**
     * Set cursor size from UI
     */
    fun setCursorSize(size: CursorSize) {
        val currentState = _state.value.cursorState ?: CursorState(
            current = CursorPosition(0, 0, size),
            selection = null,
            lastAction = "init"
        )
        
        _state.value = _state.value.copy(
            cursorSize = size,
            cursorState = currentState.copy(
                current = currentState.current.copy(size = size)
            )
        )
    }

    /**
     * Check selected text for PII before sending to AI
     */
    private fun checkSelectionForPii(selectedText: String) {
        try {
            val scanResult = SensitiveDataDetector.scanForSensitiveData(selectedText)
            
            _state.value = _state.value.copy(
                detectedPiiCount = scanResult.detected.size,
                piiRiskLevel = scanResult.riskLevel,
                showPiiDialog = scanResult.hasSensitiveData
            )

            Napier.d("PII scan result: ${scanResult.detected.size} items found, risk: ${scanResult.riskLevel}")
        } catch (e: Exception) {
            Napier.e("Error scanning for PII", e)
        }
    }

    /**
     * Clear PII dialog
     */
    fun dismissPiiDialog() {
        _state.value = _state.value.copy(
            showPiiDialog = false,
            detectedPiiCount = 0,
            piiRiskLevel = "low"
        )
    }

    override fun onCleared() {
        super.onCleared()
        recordingJob?.cancel()
        silenceDetectionJob?.cancel()
    }
