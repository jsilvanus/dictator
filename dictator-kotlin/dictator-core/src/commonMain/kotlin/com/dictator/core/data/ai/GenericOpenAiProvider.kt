package com.dictator.core.data.ai

import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.util.InternalAPI
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Generic OpenAI-Compatible Provider for Kotlin
 * Implements provider interface for any service that follows OpenAI's API format
 */
class GenericOpenAiProvider(
    private val httpClient: HttpClient,
    baseUrl: String,
    private val apiKey: String,
    model: String = "gpt-3.5-turbo"
) : BaseAiProvider(model, 0.7, 2048) {

    private val baseUrl = baseUrl.removeSuffix("/")

    override fun isConfigured(): Boolean = baseUrl.isNotEmpty() && apiKey.isNotEmpty()

    override fun getProviderType(): ModelProvider = ModelProvider.OPENAI_COMPATIBLE

    override suspend fun askInline(request: AiInlineRequest): AiResponse {
        if (!isConfigured()) {
            throw IllegalStateException("Generic OpenAI provider not configured: missing base URL or API key")
        }

        val (temperature, maxTokens) = mergeRequestParams(request)

        return try {
            val response: GenericOpenAiResponse = httpClient.post("$baseUrl/chat/completions") {
                contentType(ContentType.Application.Json)
                header("Authorization", "******")
                setBody(
                    GenericOpenAiRequest(
                        model = model,
                        maxTokens = maxTokens,
                        temperature = temperature,
                        messages = listOf(
                            GenericOpenAiMessage(role = "system", content = request.context ?: "You are a helpful AI assistant."),
                            GenericOpenAiMessage(role = "user", content = request.prompt)
                        )
                    )
                )
            }.body()

            val content = response.choices.firstOrNull()?.message?.content ?: ""

            AiResponse(
                content = content,
                usage = response.usage?.let {
                    AiUsage(
                        inputTokens = it.promptTokens,
                        outputTokens = it.completionTokens
                    )
                }
            )
        } catch (e: Exception) {
            Napier.e("Generic OpenAI API request failed", e)
            throw IllegalStateException("Generic OpenAI API request failed: ${e.message}", e)
        }
    }

    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> = flow {
        if (!isConfigured()) {
            emit(AiStreamChunk.Error("Generic OpenAI provider not configured: missing base URL or API key"))
            return@flow
        }

        val (temperature, maxTokens) = setConfig(request.temperature, request.maxTokens)

        val messages = mutableListOf<GenericOpenAiMessage>()
        if (!request.systemPrompt.isNullOrEmpty()) {
            messages.add(GenericOpenAiMessage(role = "system", content = request.systemPrompt))
        }
        messages.addAll(request.messages.map { GenericOpenAiMessage(it.role, it.content) })

        try {
            @OptIn(InternalAPI::class)
            val response = httpClient.post("$baseUrl/chat/completions") {
                contentType(ContentType.Application.Json)
                header("Authorization", "******")
                setBody(
                    GenericOpenAiStreamRequest(
                        model = model,
                        maxTokens = maxTokens,
                        temperature = temperature,
                        messages = messages,
                        stream = true
                    )
                )
            }

            if (!response.status.isSuccess()) {
                emit(AiStreamChunk.Error("Generic OpenAI API error: ${response.status}"))
                return@flow
            }

            val channel = response.bodyAsChannel()
            val decoder = channel.readRemaining().readText()

            // Parse SSE stream
            decoder.split("\n").forEach { line ->
                if (line.startsWith("data: ")) {
                    val data = line.substring(6)
                    if (data == "[DONE]" || data.isEmpty()) return@forEach

                    try {
                        val event = Json.decodeFromString<GenericOpenAiStreamEvent>(data)
                        event.choices.firstOrNull()?.delta?.content?.let { content ->
                            emit(AiStreamChunk.Delta(content))
                        }

                        if (event.choices.firstOrNull()?.finishReason != null) {
                            emit(AiStreamChunk.Complete)
                        }
                    } catch (e: Exception) {
                        // Skip malformed SSE events
                        Napier.d("Skipped malformed SSE event: $line")
                    }
                }
            }

            emit(AiStreamChunk.Complete)
        } catch (e: Exception) {
            Napier.e("Generic OpenAI chat request failed", e)
            emit(AiStreamChunk.Error("Generic OpenAI chat request failed: ${e.message}"))
        }
    }
}

@Serializable
data class GenericOpenAiRequest(
    val model: String,
    @SerialName("max_tokens")
    val maxTokens: Int,
    val temperature: Double,
    val messages: List<GenericOpenAiMessage>
)

@Serializable
data class GenericOpenAiStreamRequest(
    val model: String,
    @SerialName("max_tokens")
    val maxTokens: Int,
    val temperature: Double,
    val messages: List<GenericOpenAiMessage>,
    val stream: Boolean = true
)

@Serializable
data class GenericOpenAiMessage(
    val role: String,
    val content: String
)

@Serializable
data class GenericOpenAiResponse(
    val choices: List<GenericOpenAiChoice>,
    val usage: GenericOpenAiUsage? = null
)

@Serializable
data class GenericOpenAiChoice(
    val message: GenericOpenAiMessage? = null,
    @SerialName("finish_reason")
    val finishReason: String? = null
)

@Serializable
data class GenericOpenAiUsage(
    @SerialName("prompt_tokens")
    val promptTokens: Int,
    @SerialName("completion_tokens")
    val completionTokens: Int
)

@Serializable
data class GenericOpenAiStreamEvent(
    val choices: List<GenericOpenAiStreamChoice>
)

@Serializable
data class GenericOpenAiStreamChoice(
    val delta: GenericOpenAiStreamDelta? = null,
    @SerialName("finish_reason")
    val finishReason: String? = null
)

@Serializable
data class GenericOpenAiStreamDelta(
    val content: String? = null
)
