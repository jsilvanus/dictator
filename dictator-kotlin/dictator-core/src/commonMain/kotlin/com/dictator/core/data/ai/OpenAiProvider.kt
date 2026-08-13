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
 * OpenAI Provider for Kotlin
 * Implements provider interface for OpenAI's API
 */
class OpenAiProvider(
    private val httpClient: HttpClient,
    private val apiKey: String,
    model: String = "gpt-4o",
    private val baseUrl: String = "https://api.openai.com/v1"
) : BaseAiProvider(model, 0.7, 2048) {

    override fun isConfigured(): Boolean = apiKey.isNotEmpty()

    override fun getProviderType(): ModelProvider = ModelProvider.OPENAI

    override suspend fun askInline(request: AiInlineRequest): AiResponse {
        if (!isConfigured()) {
            throw IllegalStateException("OpenAI provider not configured: missing API key")
        }

        val (temperature, maxTokens) = mergeRequestParams(request)

        return try {
            val response: OpenAiResponse = httpClient.post("$baseUrl/chat/completions") {
                contentType(ContentType.Application.Json)
                header("Authorization", "******")
                setBody(
                    OpenAiRequest(
                        model = model,
                        maxTokens = maxTokens,
                        temperature = temperature,
                        messages = listOf(
                            OpenAiMessage(role = "system", content = request.context ?: "You are a helpful AI assistant."),
                            OpenAiMessage(role = "user", content = request.prompt)
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
            Napier.e("OpenAI API request failed", e)
            throw IllegalStateException("OpenAI API request failed: ${e.message}", e)
        }
    }

    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> = flow {
        if (!isConfigured()) {
            emit(AiStreamChunk.Error("OpenAI provider not configured: missing API key"))
            return@flow
        }

        val (temperature, maxTokens) = setConfig(request.temperature, request.maxTokens)

        val messages = mutableListOf<OpenAiMessage>()
        if (!request.systemPrompt.isNullOrEmpty()) {
            messages.add(OpenAiMessage(role = "system", content = request.systemPrompt))
        }
        messages.addAll(request.messages.map { OpenAiMessage(it.role, it.content) })

        try {
            @OptIn(InternalAPI::class)
            val response = httpClient.post("$baseUrl/chat/completions") {
                contentType(ContentType.Application.Json)
                header("Authorization", "******")
                setBody(
                    OpenAiStreamRequest(
                        model = model,
                        maxTokens = maxTokens,
                        temperature = temperature,
                        messages = messages,
                        stream = true
                    )
                )
            }

            if (!response.status.isSuccess()) {
                emit(AiStreamChunk.Error("OpenAI API error: ${response.status}"))
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
                        val event = Json.decodeFromString<OpenAiStreamEvent>(data)
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
            Napier.e("OpenAI chat request failed", e)
            emit(AiStreamChunk.Error("OpenAI chat request failed: ${e.message}"))
        }
    }
}

@Serializable
data class OpenAiRequest(
    val model: String,
    @SerialName("max_tokens")
    val maxTokens: Int,
    val temperature: Double,
    val messages: List<OpenAiMessage>
)

@Serializable
data class OpenAiStreamRequest(
    val model: String,
    @SerialName("max_tokens")
    val maxTokens: Int,
    val temperature: Double,
    val messages: List<OpenAiMessage>,
    val stream: Boolean = true
)

@Serializable
data class OpenAiMessage(
    val role: String,
    val content: String
)

@Serializable
data class OpenAiResponse(
    val choices: List<OpenAiChoice>,
    val usage: OpenAiUsage? = null
)

@Serializable
data class OpenAiChoice(
    val message: OpenAiMessage? = null,
    @SerialName("finish_reason")
    val finishReason: String? = null
)

@Serializable
data class OpenAiUsage(
    @SerialName("prompt_tokens")
    val promptTokens: Int,
    @SerialName("completion_tokens")
    val completionTokens: Int
)

@Serializable
data class OpenAiStreamEvent(
    val choices: List<OpenAiStreamChoice>
)

@Serializable
data class OpenAiStreamChoice(
    val delta: OpenAiStreamDelta? = null,
    @SerialName("finish_reason")
    val finishReason: String? = null
)

@Serializable
data class OpenAiStreamDelta(
    val content: String? = null
)
