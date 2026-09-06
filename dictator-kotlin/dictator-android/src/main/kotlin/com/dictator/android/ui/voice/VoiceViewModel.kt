package com.dictator.android.ui.voice

import android.content.Context
import com.dictator.android.data.AndroidVoiceServiceImpl
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.core.data.voice.ActivationCommand
import com.dictator.core.domain.entity.CursorPosition
import com.dictator.core.domain.entity.CursorSize
import com.dictator.core.domain.entity.CursorState
import com.dictator.core.util.cursor.CursorCommandExecutor
import com.dictator.core.util.cursor.CursorCommandParser
import com.dictator.core.util.privacy.SensitiveDataDetector
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.aakira.napier.Napier
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import javax.inject.Inject

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
    val silenceDuration: Long = 0L,
    val recordingDuration: Long = 0L,
    val currentLanguage: String = "en-US",
    val activationCommands: List<ActivationCommand> = emptyList(),
    val cursorSize: CursorSize = CursorSize.WORD,
    val cursorState: CursorState? = null,
    val detectedPiiCount: Int = 0,
    val piiRiskLevel: String = "low",
    val showPiiDialog: Boolean = false
)

@HiltViewModel
class VoiceViewModel @Inject constructor(
    @ApplicationContext context: Context,
    private val voiceSettingsRepository: VoiceSettingsRepository? = null
) : ViewModel() {
    private val voiceService = AndroidVoiceServiceImpl(context)
    private val _state = MutableStateFlow(
        VoiceUiState(isPermissionGranted = voiceService.hasRecordAudioPermission())
    )
    val state: StateFlow<VoiceUiState> = _state.asStateFlow()

    private var recordingJob: Job? = null
    var onPermissionResult: ((Boolean) -> Unit)? = null

    companion object {
        private const val MAX_RECORDING_DURATION = 30000L
        private const val DEFAULT_LANGUAGE = "en-US"
    }

    init {
        voiceService.setListener(object : AndroidVoiceServiceImpl.VoiceListener {
            override fun onResults(text: String, confidence: Float) {
                recordingJob?.cancel()
                _state.value = _state.value.copy(
                    state = VoiceState.SUCCESS,
                    transcribedText = text,
                    confidence = confidence
                )
            }

            override fun onPartialResults(text: String) {
                _state.value = _state.value.copy(
                    transcribedText = text,
                    state = VoiceState.LISTENING
                )
            }

            override fun onRmsChanged(rmsdB: Float) {
                val normalized = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)
                val amplitudes = (_state.value.waveformAmplitudes + normalized).takeLast(24)
                _state.value = _state.value.copy(waveformAmplitudes = amplitudes)
            }

            override fun onError(errorCode: String, message: String) {
                recordingJob?.cancel()
                _state.value = _state.value.copy(
                    state = VoiceState.ERROR,
                    errorMessage = message
                )
            }
        })
        loadVoiceSettings()
    }

    private fun loadVoiceSettings() {
        viewModelScope.launch {
            try {
                val settings = voiceSettingsRepository?.loadVoiceSettings()
                if (settings != null) {
                    voiceService.setLanguage(settings.language)
                    _state.value = _state.value.copy(
                        currentLanguage = settings.language,
                        activationCommands = settings.activationCommands[settings.language].orEmpty()
                    )
                } else {
                    voiceService.setLanguage(DEFAULT_LANGUAGE)
                }
            } catch (e: Exception) {
                Napier.e("Error loading voice settings", e)
            }
        }
    }

    fun setLanguage(language: String) {
        viewModelScope.launch {
            try {
                voiceSettingsRepository?.setLanguage(language)
                voiceService.setLanguage(language)
                val settings = voiceSettingsRepository?.loadVoiceSettings()
                _state.value = _state.value.copy(
                    currentLanguage = language,
                    activationCommands = settings?.activationCommands?.get(language).orEmpty()
                )
            } catch (e: Exception) {
                Napier.e("Error setting language", e)
            }
        }
    }

    fun getCurrentActivationCommands(): List<ActivationCommand> = _state.value.activationCommands

    fun getActivationPhrases(type: String): List<String> = _state.value.activationCommands
        .filter { it.type == type }
        .flatMap { it.phrases }

    fun setPermissionGranted(granted: Boolean) {
        _state.value = _state.value.copy(
            isPermissionGranted = granted,
            state = if (granted && _state.value.state == VoiceState.ERROR) VoiceState.IDLE else _state.value.state,
            errorMessage = if (granted) null else "Microphone permission not granted"
        )
        onPermissionResult?.invoke(granted)
    }

    fun startListening() {
        if (!voiceService.hasRecordAudioPermission()) {
            setPermissionGranted(false)
            return
        }

        if (!voiceService.isRecognitionAvailable()) {
            onError("Speech recognition is not available on this device")
            return
        }

        _state.value = _state.value.copy(
            state = VoiceState.LISTENING,
            transcribedText = "",
            confidence = 0f,
            errorMessage = null,
            waveformAmplitudes = emptyList(),
            recordingDuration = 0L
        )
        voiceService.startListening()
        startRecordingTimeout()
    }

    fun stopListening() {
        recordingJob?.cancel()
        voiceService.stopListening()
        if (_state.value.state == VoiceState.LISTENING) {
            _state.value = _state.value.copy(state = VoiceState.PROCESSING)
        }
    }

    fun clearTranscription() {
        voiceService.cancel()
        recordingJob?.cancel()
        _state.value = _state.value.copy(
            transcribedText = "",
            confidence = 0f,
            waveformAmplitudes = emptyList(),
            state = VoiceState.IDLE,
            errorMessage = null
        )
    }

    fun retry() {
        _state.value = _state.value.copy(state = VoiceState.IDLE, errorMessage = null)
        startListening()
    }

    private fun startRecordingTimeout() {
        recordingJob?.cancel()
        recordingJob = viewModelScope.launch {
            var elapsedTime = 0L
            while (_state.value.state == VoiceState.LISTENING && elapsedTime < MAX_RECORDING_DURATION) {
                delay(100L)
                elapsedTime += 100L
                _state.value = _state.value.copy(recordingDuration = elapsedTime)
            }

            if (_state.value.state == VoiceState.LISTENING) {
                voiceService.stopListening()
                _state.value = _state.value.copy(
                    state = VoiceState.ERROR,
                    errorMessage = "Recording timeout: Maximum 30 seconds exceeded"
                )
            }
        }
    }

    fun onError(message: String) {
        voiceService.cancel()
        recordingJob?.cancel()
        _state.value = _state.value.copy(
            state = VoiceState.ERROR,
            errorMessage = message
        )
    }

    fun handleCursorCommand(text: String, documentContent: String) {
        viewModelScope.launch {
            try {
                if (!CursorCommandParser.containsCursorKeywords(text)) return@launch

                var currentCursorState = _state.value.cursorState ?: CursorState(
                    current = CursorPosition(0, 0, _state.value.cursorSize),
                    selection = null,
                    lastAction = "init"
                )

                val detectedSize = CursorCommandParser.detectCursorSize(text)
                if (detectedSize != null) {
                    _state.value = _state.value.copy(cursorSize = detectedSize)
                    currentCursorState = currentCursorState.copy(
                        current = currentCursorState.current.copy(size = detectedSize)
                    )
                }

                val result = CursorCommandExecutor.handleCursorCommand(
                    text = documentContent,
                    voiceInput = text,
                    currentState = currentCursorState,
                    userLanguage = _state.value.currentLanguage
                )

                _state.value = _state.value.copy(cursorState = result.newState)
                if (result.newState.selection?.isActive == true && result.selectedText != null) {
                    checkSelectionForPii(result.selectedText)
                }
                Napier.d("Cursor command executed: ${result.feedback}")
            } catch (e: Exception) {
                Napier.e("Error handling cursor command", e)
            }
        }
    }

    fun setCursorSize(size: CursorSize) {
        val currentState = _state.value.cursorState ?: CursorState(
            current = CursorPosition(0, 0, size),
            selection = null,
            lastAction = "init"
        )
        _state.value = _state.value.copy(
            cursorSize = size,
            cursorState = currentState.copy(current = currentState.current.copy(size = size))
        )
    }

    private fun checkSelectionForPii(selectedText: String) {
        try {
            val scanResult = SensitiveDataDetector.scanForSensitiveData(selectedText)
            _state.value = _state.value.copy(
                detectedPiiCount = scanResult.detected.size,
                piiRiskLevel = scanResult.riskLevel,
                showPiiDialog = scanResult.hasSensitiveData
            )
        } catch (e: Exception) {
            Napier.e("Error scanning for PII", e)
        }
    }

    fun dismissPiiDialog() {
        _state.value = _state.value.copy(
            showPiiDialog = false,
            detectedPiiCount = 0,
            piiRiskLevel = "low"
        )
    }

    override fun onCleared() {
        voiceService.destroy()
        recordingJob?.cancel()
        super.onCleared()
    }
}
