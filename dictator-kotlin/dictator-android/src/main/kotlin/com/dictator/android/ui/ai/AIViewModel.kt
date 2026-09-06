package com.dictator.android.ui.ai

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.core.data.ai.AiChatMessage
import com.dictator.core.data.ai.AiChatRequest
import com.dictator.core.data.ai.AiStreamChunk
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

data class AIMessage(
    val id: String = "",
    val role: String = "user",
    val content: String = "",
    val timestamp: Long = System.currentTimeMillis()
)

data class AIPanelUiState(
    val messages: List<AIMessage> = emptyList(),
    val currentPrompt: String = "",
    val isStreaming: Boolean = false,
    val currentStreamingResponse: String = "",
    val errorMessage: String? = null,
    val sessions: List<String> = listOf("default"),
    val currentSessionId: String = "default",
    val retryCount: Int = 0,
    val canRetry: Boolean = false,
    val providerName: String = "",
    val modelName: String = ""
)

@HiltViewModel
class AIViewModel @Inject constructor(
    private val providerResolver: AndroidAiProviderResolver,
    @ApplicationContext private val context: Context
) : ViewModel() {
    private val _state = MutableStateFlow(AIPanelUiState())
    val state: StateFlow<AIPanelUiState> = _state.asStateFlow()

    private val maxRetries = 3
    private var lastFailedPrompt: String? = null
    private var streamJob: Job? = null

    init {
        refreshProviderInfo()
    }

    fun onPromptChanged(prompt: String) {
        _state.value = _state.value.copy(currentPrompt = prompt)
    }

    fun sendPrompt(prompt: String) {
        if (prompt.isBlank() || _state.value.isStreaming) return

        val trimmedPrompt = prompt.trim()
        val userMessage = AIMessage(
            id = System.currentTimeMillis().toString(),
            role = "user",
            content = trimmedPrompt
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
        lastFailedPrompt = trimmedPrompt
        startStreaming()
    }

    fun retryLastPrompt() {
        if (lastFailedPrompt == null || _state.value.isStreaming) return

        val nextRetry = _state.value.retryCount + 1
        if (nextRetry > maxRetries) {
            _state.value = _state.value.copy(
                errorMessage = "Maximum retries exceeded. Please try again later.",
                canRetry = false
            )
            return
        }

        _state.value = _state.value.copy(
            isStreaming = true,
            currentStreamingResponse = "",
            errorMessage = null,
            retryCount = nextRetry,
            canRetry = false
        )
        startStreaming()
    }

    fun clearConversation() {
        streamJob?.cancel()
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
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        clipboard?.setPrimaryClip(ClipData.newPlainText("AI Response", text))
    }

    fun insertIntoDocument(text: String): String = text

    fun loadSessions() {
        _state.value = _state.value.copy(sessions = listOf("default"))
    }

    fun switchSession(sessionId: String) {
        streamJob?.cancel()
        _state.value = _state.value.copy(
            currentSessionId = sessionId,
            messages = emptyList(),
            currentStreamingResponse = "",
            isStreaming = false,
            errorMessage = null,
            canRetry = false
        )
        lastFailedPrompt = null
    }

    private fun refreshProviderInfo() {
        runCatching { providerResolver.resolve() }
            .onSuccess { provider ->
                _state.value = _state.value.copy(
                    providerName = provider.getProviderType().name,
                    modelName = provider.getModelName()
                )
            }
            .onFailure { error ->
                _state.value = _state.value.copy(
                    errorMessage = error.message ?: "Unable to configure AI provider"
                )
            }
    }

    private fun startStreaming() {
        streamJob?.cancel()
        streamJob = viewModelScope.launch {
            val provider = try {
                providerResolver.resolve()
            } catch (error: Exception) {
                handleFailure(error.message ?: "Unable to create AI provider")
                return@launch
            }

            if (!provider.isConfigured()) {
                handleFailure("${provider.getProviderType().name} is not configured. Open Settings to configure an AI provider.")
                return@launch
            }

            _state.value = _state.value.copy(
                providerName = provider.getProviderType().name,
                modelName = provider.getModelName()
            )

            val messages = _state.value.messages.map {
                AiChatMessage(role = it.role, content = it.content)
            }
            val request = AiChatRequest(
                messages = messages,
                systemPrompt = "You are Dictator, a helpful writing assistant. Answer clearly and concisely.",
                stream = true
            )

            var response = ""
            var finalized = false
            try {
                provider.chat(request).collect { chunk ->
                    when (chunk) {
                        is AiStreamChunk.Delta -> {
                            response += chunk.content
                            _state.value = _state.value.copy(currentStreamingResponse = response)
                        }
                        is AiStreamChunk.ThinkingDelta -> Unit
                        AiStreamChunk.ThinkingComplete -> Unit
                        AiStreamChunk.Complete -> {
                            if (!finalized) {
                                finalized = true
                                if (response.isNotEmpty()) {
                                    completeResponse(response)
                                } else if (_state.value.isStreaming) {
                                    handleFailure("AI provider returned an empty response")
                                }
                            }
                        }
                        is AiStreamChunk.Error -> {
                            if (!finalized) {
                                finalized = true
                                handleFailure(chunk.error)
                            }
                        }
                    }
                }

                if (!finalized && _state.value.isStreaming) {
                    if (response.isNotEmpty()) completeResponse(response)
                    else handleFailure("AI provider ended without a response")
                }
            } catch (error: Exception) {
                if (!finalized) handleFailure(error.message ?: "AI request failed")
            }
        }
    }

    private fun completeResponse(response: String) {
        _state.value = _state.value.copy(
            messages = _state.value.messages + AIMessage(
                id = System.currentTimeMillis().toString(),
                role = "assistant",
                content = response
            ),
            currentStreamingResponse = "",
            isStreaming = false,
            errorMessage = null,
            canRetry = false
        )
        lastFailedPrompt = null
    }

    private fun handleFailure(message: String) {
        _state.value = _state.value.copy(
            isStreaming = false,
            currentStreamingResponse = "",
            errorMessage = message,
            canRetry = lastFailedPrompt != null && _state.value.retryCount < maxRetries
        )
    }

    override fun onCleared() {
        streamJob?.cancel()
        super.onCleared()
    }
}
