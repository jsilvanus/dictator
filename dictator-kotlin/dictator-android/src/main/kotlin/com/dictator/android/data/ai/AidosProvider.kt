package com.dictator.android.data.ai

import com.dictator.android.data.AidosEngineConnection
import com.dictator.core.data.ai.AiChatRequest
import com.dictator.core.data.ai.AiInlineRequest
import com.dictator.core.data.ai.AiResponse
import com.dictator.core.data.ai.AiStreamChunk
import com.dictator.core.data.ai.AiUsage
import com.dictator.core.data.ai.BaseAiProvider
import com.dictator.core.data.ai.ModelProvider
import fi.italeino.aidos.sdk.client.ChatCompletionRequest
import fi.italeino.aidos.sdk.client.ChatMessage
import fi.italeino.aidos.sdk.client.EngineAvailability
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * On-device AI through Aidos Engine (docs/AIDOS_SDK_INTEGRATION_PLAN.md, D1). Implements
 * dictator-core's [com.dictator.core.data.ai.AiProvider] on top of the Aidos SDK, which dictator-core
 * cannot depend on (the SDK is Android-only).
 *
 * There is deliberately no automatic fallback to a cloud provider when Engine is unavailable: a user
 * who chose on-device processing must not have a document silently sent to a third party because
 * Engine was not running. The failure names what to do instead ([AidosEngineConnection.explain]).
 *
 * @param preferredModel Engine model id, or blank to use the first LLM Engine reports.
 */
class AidosProvider(
    private val connection: AidosEngineConnection,
    private val preferredModel: String = "",
    temperature: Double = 0.7,
    maxTokens: Int = 2048
) : BaseAiProvider(preferredModel.ifBlank { "engine-default" }, temperature, maxTokens) {

    override fun isConfigured(): Boolean = true

    override fun getProviderType(): ModelProvider = ModelProvider.AIDOS

    private suspend fun requireEngine(): String {
        val availability = connection.ensureAvailable()
        if (availability != EngineAvailability.Available) {
            throw IllegalStateException(AidosEngineConnection.explain(availability))
        }
        if (preferredModel.isNotBlank()) return preferredModel
        return connection.client.capabilities().models.firstOrNull { it.kind == "llm" }?.id
            ?: throw IllegalStateException("Aidos Engine has no language model installed. Add one in Aidos Engine.")
    }

    override suspend fun askInline(request: AiInlineRequest): AiResponse {
        val modelId = requireEngine()
        val (temp, tokens) = mergeRequestParams(request)
        val messages = buildList {
            request.context?.takeIf { it.isNotBlank() }?.let { add(ChatMessage("system", it)) }
            add(ChatMessage("user", request.prompt))
        }
        val response = connection.client.chatCompletion(
            ChatCompletionRequest(model = modelId, messages = messages, temperature = temp.toFloat(), max_tokens = tokens)
        ) ?: throw IllegalStateException("Aidos Engine did not return a response.")
        val text = response.choices.firstOrNull()?.message?.content.orEmpty()
        return AiResponse(
            content = text,
            stopReason = response.choices.firstOrNull()?.finish_reason,
            usage = AiUsage(response.usage.prompt_tokens, response.usage.completion_tokens)
        )
    }

    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> = flow {
        val modelId = try {
            requireEngine()
        } catch (e: IllegalStateException) {
            emit(AiStreamChunk.Error(e.message ?: "Aidos Engine unavailable"))
            return@flow
        }
        val messages = buildList {
            request.systemPrompt?.takeIf { it.isNotBlank() }?.let { add(ChatMessage("system", it)) }
            request.messages.forEach { add(ChatMessage(it.role, it.content)) }
        }
        var produced = false
        connection.client.streamChatCompletion(
            ChatCompletionRequest(
                model = modelId,
                messages = messages,
                temperature = (request.temperature ?: temperature).toFloat(),
                max_tokens = request.maxTokens ?: maxTokens,
                stream = true
            )
        ).collect { chunk ->
            chunk.choices.firstOrNull()?.delta?.content?.takeIf { it.isNotEmpty() }?.let {
                produced = true
                emit(AiStreamChunk.Delta(it))
            }
        }
        // The SDK's stream is silent on failure (it just completes), so no output means no answer.
        if (produced) emit(AiStreamChunk.Complete) else emit(AiStreamChunk.Error("Aidos Engine returned no output."))
    }
}
