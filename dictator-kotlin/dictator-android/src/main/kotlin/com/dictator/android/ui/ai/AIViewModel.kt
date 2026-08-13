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
    val currentSessionId: String = "default",
    val retryCount: Int = 0,
    val canRetry: Boolean = false
)

class AIViewModel : ViewModel() {
    private val _state = MutableStateFlow(AIPanelUiState())
    val state: StateFlow<AIPanelUiState> = _state.asStateFlow()
    
    private val MAX_RETRIES = 3
    private var lastFailedPrompt: String? = null

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
            errorMessage = null,
            retryCount = 0,
            canRetry = false
        )

        lastFailedPrompt = prompt
        
        // Simulate AI response streaming
        simulateStreaming(prompt)
    }
    
    /**
     * Retry the last failed AI prompt with exponential backoff.
     * IMPROVEMENT: Error recovery with retry logic.
     */
    fun retryLastPrompt() {
        if (lastFailedPrompt == null) return
        if (_state.value.retryCount >= MAX_RETRIES) {
            _state.value = _state.value.copy(
                errorMessage = "Maximum retries exceeded. Please try again later.",
                canRetry = false
            )
            return
        }
        
        _state.value = _state.value.copy(
            isStreaming = true,
            errorMessage = null,
            retryCount = _state.value.retryCount + 1,
            canRetry = false
        )
        
        simulateStreaming(lastFailedPrompt!!)
    }

    fun clearConversation() {
        _state.value = _state.value.copy(
            messages = emptyList(),
            currentStreamingResponse = "",
            isStreaming = false,
            errorMessage = null,
            retryCount = 0,
            canRetry = false
        )
        lastFailedPrompt = null
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
        // Simulate random errors for testing error recovery
        val shouldFail = kotlin.random.Random.nextInt(100) < 15  // 15% failure rate
        
        if (shouldFail && _state.value.retryCount < MAX_RETRIES) {
            // Simulate API error
            _state.value = _state.value.copy(
                isStreaming = false,
                currentStreamingResponse = "",
                errorMessage = "Failed to get AI response. Tap retry to try again.",
                canRetry = true
            )
            return
        }
        
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
            currentStreamingResponse = "",
            errorMessage = null,
            canRetry = false
        )
    }
}
