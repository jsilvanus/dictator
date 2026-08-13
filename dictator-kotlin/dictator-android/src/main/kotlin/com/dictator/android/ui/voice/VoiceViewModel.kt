package com.dictator.android.ui.voice

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class VoiceState {
    IDLE, LISTENING, PROCESSING, ERROR, SUCCESS
}

data class VoiceUiState(
    val state: VoiceState = VoiceState.IDLE,
    val transcribedText: String = "",
    val confidence: Float = 0f,
    val isPermissionGranted: Boolean = false,
    val errorMessage: String? = null,
    val waveformAmplitudes: List<Float> = emptyList()
)

class VoiceViewModel : ViewModel() {
    private val _state = MutableStateFlow(VoiceUiState())
    val state: StateFlow<VoiceUiState> = _state.asStateFlow()

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
            waveformAmplitudes = emptyList()
        )

        // In real implementation, start SpeechRecognizer
        simulateListening()
    }

    fun stopListening() {
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

    private fun simulateListening() {
        // Simulate receiving voice input
        // In real implementation, this would be handled by SpeechRecognizer callback
        _state.value = _state.value.copy(
            state = VoiceState.SUCCESS,
            transcribedText = "This is a sample transcribed text",
            confidence = 0.95f
        )
    }

    fun onError(message: String) {
        _state.value = _state.value.copy(
            state = VoiceState.ERROR,
            errorMessage = message
        )
    }
}
