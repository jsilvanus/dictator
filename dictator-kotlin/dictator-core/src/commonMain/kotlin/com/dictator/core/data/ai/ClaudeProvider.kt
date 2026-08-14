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
 * Claude/Anthropic AI Provider for Kotlin
 * Implements provider interface for Anthropic's Claude API
 */
class ClaudeProvider(
    private val httpClient: HttpClient,
    private val apiKey: String,
    model: String = "claude-sonnet-4-6"
) : BaseAiProvider(model, 0.2, 800) {

    override fun isConfigured(): Boolean = apiKey.isNotEmpty()

    override fun getProviderType(): ModelProvider = ModelProvider.CLAUDE

    override suspend fun askInline(request: AiInlineRequest): AiResponse {
        if (!isConfigured()) {
            throw IllegalStateException("Claude provider not configured: missing API key")
        }

        val (temperature, maxTokens) = mergeRequestParams(request)

        return try {
            val response: ClaudeResponse = httpClient.post("https://api.anthropic.com/v1/messages") {
                contentType(ContentType.Application.Json)
                header("x-api-key", apiKey)
                header("anthropic-version", "2023-06-01")
                setBody(
                    ClaudeRequest(
                        model = model,
                        maxTokens = maxTokens,
                        temperature = temperature,
                        system = request.context ?: "You are a helpful AI assistant.",
                        messages = listOf(
                            ClaudeMessage(role = "user", content = request.prompt)
                        ),
                        thinking = request.thinkingBudgetTokens?.let {
                            ClaudeThinking(budgetTokens = it)
                        }
                    )
                )
            }.body()

            val textContent = response.content
                .filter { it.type == "text" }
                .firstOrNull()?.text ?: ""
            
            val thinkingContent = response.content
                .filter { it.type == "thinking" }
                .firstOrNull()?.thinking

            AiResponse(
                content = textContent,
                thinking = thinkingContent,
                usage = response.usage?.let {
                    AiUsage(
                        inputTokens = it.inputTokens,
                        outputTokens = it.outputTokens
                    )
                }
            )
        } catch (e: Exception) {
            Napier.e("Claude API request failed", e)
            throw IllegalStateException("Claude API request failed: ${e.message}", e)
        }
    }

    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> = flow {
        if (!isConfigured()) {
            emit(AiStreamChunk.Error("Claude provider not configured: missing API key"))
            return@flow
        }

        val (temperature, maxTokens) = setConfig(request.temperature, request.maxTokens)

        try {
            @OptIn(InternalAPI::class)
            val response = httpClient.post("https://api.anthropic.com/v1/messages") {
                contentType(ContentType.Application.Json)
                header("x-api-key", apiKey)
                header("anthropic-version", "2023-06-01")
                setBody(
                    ClaudeStreamRequest(
                        model = model,
                        maxTokens = maxTokens,
                        temperature = temperature,
                        system = request.systemPrompt,
                        messages = request.messages.map { ClaudeMessage(it.role, it.content) },
                        stream = true,
                        thinking = request.thinkingBudgetTokens?.let {
                            ClaudeThinking(budgetTokens = it)
                        }
                    )
                )
            }

            if (!response.status.isSuccess()) {
                emit(AiStreamChunk.Error("Claude API error: ${response.status}"))
                return@flow
            }

            val channel = response.bodyAsChannel()
            val decoder = channel.readRemaining().readText()

            // Parse SSE stream
            decoder.split("\n").forEach { line ->
                if (line.startsWith("data: ")) {
                    val data = line.substring(6)
                    if (data == "[DONE]") return@forEach

                    try {
                        val event = Json.decodeFromString<ClaudeStreamEvent>(data)
                        if (event.type == "content_block_delta" && event.delta?.type == "text_delta") {
                            emit(AiStreamChunk.Delta(event.delta.text ?: ""))
                        } else if (event.type == "content_block_delta" && event.delta?.type == "thinking_delta") {
                            emit(AiStreamChunk.ThinkingDelta(event.delta.thinking ?: ""))
                        }
                    } catch (e: Exception) {
                        // Skip malformed SSE events
                        Napier.d("Skipped malformed SSE event: $line")
                    }
                }
            }

            emit(AiStreamChunk.Complete)
        } catch (e: Exception) {
            Napier.e("Claude chat request failed", e)
            emit(AiStreamChunk.Error("Claude chat request failed: ${e.message}"))
        }
    }
}

@Serializable
data class ClaudeRequest(
    val model: String,
    @SerialName("max_tokens")
    val maxTokens: Int,
    val temperature: Double,
    val system: String,
    val messages: List<ClaudeMessage>,
    val thinking: ClaudeThinking? = null
)

@Serializable
data class ClaudeStreamRequest(
    val model: String,
    @SerialName("max_tokens")
    val maxTokens: Int,
    val temperature: Double,
    val system: String? = null,
    val messages: List<ClaudeMessage>,
    val stream: Boolean = true,
    val thinking: ClaudeThinking? = null
)

@Serializable
data class ClaudeThinking(
    val type: String = "enabled",
    @SerialName("budget_tokens")
    val budgetTokens: Int
)

@Serializable
data class ClaudeMessage(
    val role: String,
    val content: String
)

@Serializable
data class ClaudeResponse(
    val content: List<ClaudeContent>,
    val usage: ClaudeUsage? = null
)

@Serializable
data class ClaudeContent(
    val type: String,
    val text: String? = null,
    val thinking: String? = null
)

@Serializable
data class ClaudeUsage(
    @SerialName("input_tokens")
    val inputTokens: Int,
    @SerialName("output_tokens")
    val outputTokens: Int
)

@Serializable
data class ClaudeStreamEvent(
    val type: String,
    val delta: ClaudeStreamDelta? = null
)

@Serializable
data class ClaudeStreamDelta(
    val type: String,
    val text: String? = null,
    val thinking: String? = null
)
