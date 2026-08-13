package com.dictator.android.ui.voice

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.cancel

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
    val recordingDuration: Long = 0L
)

class VoiceViewModel : ViewModel() {
    private val _state = MutableStateFlow(VoiceUiState())
    val state: StateFlow<VoiceUiState> = _state.asStateFlow()

    private var recordingJob: Job? = null
    private var silenceDetectionJob: Job? = null

    companion object {
        // IMPROVEMENT: Timeout configuration
        private const val MAX_RECORDING_DURATION = 30000L  // 30 seconds
        private const val SILENCE_THRESHOLD = 5000L         // 5 seconds of silence = timeout
        private const val SILENCE_CHECK_INTERVAL = 500L     // Check every 500ms
    }

    fun requestMicrophonePermission() {
        // In real implementation, this would handle Android permission requests
        _state.value = _state.value.copy(isPermissionGranted = true)
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

    override fun onCleared() {
        super.onCleared()
        recordingJob?.cancel()
        silenceDetectionJob?.cancel()
    }
}
