package com.dictator.android.ui.ai

import android.content.Context
import com.dictator.core.data.ai.AiChatRequest
import com.dictator.core.data.ai.AiInlineRequest
import com.dictator.core.data.ai.AiProvider
import com.dictator.core.data.ai.AiResponse
import com.dictator.core.data.ai.AiStreamChunk
import com.dictator.core.data.ai.ModelProvider
import fi.italeino.aidos.sdk.client.AidosEngineClient
import fi.italeino.aidos.sdk.client.AndroidAidosEngineClientFactory
import fi.italeino.aidos.sdk.client.ChatCompletionRequest
import fi.italeino.aidos.sdk.client.ChatMessage
import fi.italeino.aidos.sdk.client.EngineAvailability
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.flow

/**
 * Dictator's native Aidos provider. The Aidos SDK owns Binder, approval, authentication,
 * localhost transport and SSE; this class only maps Dictator's AiProvider contract to that SDK.
 */
class AidosAiProvider(
    context: Context,
    private val model: String = DEFAULT_MODEL,
    private val temperature: Float = 0.7f,
    private val maxTokens: Int? = null
) : AiProvider {
    private val client: AidosEngineClient = AndroidAidosEngineClientFactory.createClient(context)

    override suspend fun askInline(request: AiInlineRequest): AiResponse {
        ensureAvailable()
        val messages = buildList {
            request.context?.takeIf { it.isNotBlank() }?.let { add(ChatMessage("system", it)) }
            add(ChatMessage("user", request.prompt))
        }
        val response = client.chatCompletion(
            ChatCompletionRequest(
                model = model,
                messages = messages,
                temperature = request.temperature?.toFloat() ?: temperature,
                max_tokens = request.maxTokens ?: maxTokens
            )
        ) ?: throw IllegalStateException(availabilityMessage())

        val choice = response.choices.firstOrNull()
            ?: throw IllegalStateException("Aidos Engine returned no choices")
        val content = choice.message.content.orEmpty()
        if (content.isBlank()) throw IllegalStateException("Aidos Engine returned an empty response")

        return AiResponse(
            content = content,
            stopReason = choice.finish_reason,
            usage = response.usage.let {
                com.dictator.core.data.ai.AiUsage(it.prompt_tokens, it.completion_tokens)
            }
        )
    }

    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> = flow {
        try {
            ensureAvailable()
            client.streamChatCompletion(
                ChatCompletionRequest(
                    model = model,
                    messages = buildList {
                        request.systemPrompt?.takeIf { it.isNotBlank() }?.let { add(ChatMessage("system", it)) }
                        request.messages.forEach { add(ChatMessage(it.role, it.content)) }
                    },
                    temperature = request.temperature?.toFloat() ?: temperature,
                    max_tokens = request.maxTokens ?: maxTokens,
                    stream = true
                )
            ).collect { chunk ->
                chunk.choices.forEach { choice ->
                    choice.delta.content?.takeIf { it.isNotEmpty() }?.let { emit(AiStreamChunk.Delta(it)) }
                }
            }
            emit(AiStreamChunk.Complete)
        } catch (error: Exception) {
            emit(AiStreamChunk.Error(error.message ?: "Aidos request failed"))
        }
    }

    override fun isConfigured(): Boolean = true

    override fun getModelName(): String = model

    override fun getProviderType(): ModelProvider = ModelProvider.AIDOS

    fun availability(): EngineAvailability = client.availability()

    fun close() = client.close()

    private suspend fun ensureAvailable() {
        if (!client.isAvailable() && !client.initialize()) {
            throw IllegalStateException(availabilityMessage())
        }
    }

    private fun availabilityMessage(): String = when (client.availability()) {
        EngineAvailability.NotInstalled -> "Aidos Engine is not installed."
        EngineAvailability.PendingApproval -> "Aidos Engine is waiting for approval. Open Aidos Engine and approve Dictator."
        EngineAvailability.Denied -> "Aidos Engine access was denied."
        EngineAvailability.IncompatibleVersion -> "Aidos Engine API version is incompatible."
        EngineAvailability.HandshakeFailed -> "Could not connect to Aidos Engine."
        EngineAvailability.Available -> "Aidos Engine request failed."
    }

    companion object {
        const val DEFAULT_MODEL = "qwen2.5-3b-q4"
    }
}
