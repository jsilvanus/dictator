package com.dictator.android.ui.ai

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class AIMessage(
    val id: String = "",
    val role: String = "user", // "user" or "assistant"
    val content: String = "",
    val timestamp: Long = System.currentTimeMillis()
)

data class AIPanelUiState(
    val messages: List<AIMessage> = emptyList(),
    val currentPrompt: String = "",
    val isStreaming: Boolean = false,
    val currentStreamingResponse: String = "",
    val errorMessage: String? = null,
    val sessions: List<String> = emptyList(),
    val currentSessionId: String = "default"
)

class AIViewModel : ViewModel() {
    private val _state = MutableStateFlow(AIPanelUiState())
    val state: StateFlow<AIPanelUiState> = _state.asStateFlow()

    init {
        loadSessions()
    }

    fun onPromptChanged(prompt: String) {
        _state.value = _state.value.copy(currentPrompt = prompt)
    }

    fun sendPrompt(prompt: String) {
        if (prompt.isBlank()) return

        val userMessage = AIMessage(
            id = System.currentTimeMillis().toString(),
            role = "user",
            content = prompt
        )

        _state.value = _state.value.copy(
            messages = _state.value.messages + userMessage,
            currentPrompt = "",
            isStreaming = true,
            currentStreamingResponse = "",
            errorMessage = null
        )

        // Simulate AI response streaming
        simulateStreaming(prompt)
    }

    fun clearConversation() {
        _state.value = _state.value.copy(
            messages = emptyList(),
            currentStreamingResponse = "",
            isStreaming = false
        )
    }

    fun copyResponse(text: String) {
        // In real implementation, copy to clipboard
        // val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        // clipboard.setPrimaryClip(ClipData.newPlainText("AI Response", text))
    }

    fun insertIntoDocument(text: String): String {
        // Return the text to be inserted
        return text
    }

    fun loadSessions() {
        // In real implementation, load from service
        _state.value = _state.value.copy(
            sessions = listOf(
                "default",
                "Session 1",
                "Session 2"
            )
        )
    }

    fun switchSession(sessionId: String) {
        _state.value = _state.value.copy(
            currentSessionId = sessionId,
            messages = emptyList(),
            currentStreamingResponse = ""
        )
    }

    private fun simulateStreaming(prompt: String) {
        // Simulate streaming response
        val responseId = System.currentTimeMillis().toString()
        var response = "This is a simulated AI response to: \"$prompt\". "
        response += "In a real implementation, this would stream from an AI service API."

        // Simulate character-by-character streaming
        var currentResponse = ""
        response.forEach { char ->
            currentResponse += char
            _state.value = _state.value.copy(currentStreamingResponse = currentResponse)
            // In real implementation, would receive streaming updates from API
        }

        // When streaming complete, add to messages
        val assistantMessage = AIMessage(
            id = responseId,
            role = "assistant",
            content = currentResponse
        )

        _state.value = _state.value.copy(
            messages = _state.value.messages + assistantMessage,
            isStreaming = false,
            currentStreamingResponse = ""
        )
    }
}
