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

/**
 * Ollama Provider for Kotlin
 * Implements provider interface for Ollama (self-hosted, OpenAI-compatible)
 */
class OllamaProvider(
    private val httpClient: HttpClient,
    baseUrl: String = "http://localhost:11434",
    model: String = "mistral"
) : BaseAiProvider(model, 0.7, 2048) {

    private val baseUrl = baseUrl.removeSuffix("/")

    override fun isConfigured(): Boolean = true  // No API key needed for local deployment

    override fun getProviderType(): ModelProvider = ModelProvider.OLLAMA

    override suspend fun askInline(request: AiInlineRequest): AiResponse {
        if (!isConfigured()) {
            throw IllegalStateException("Ollama provider not configured: missing base URL")
        }

        val (temperature, maxTokens) = mergeRequestParams(request)

        return try {
            val response: OllamaResponse = httpClient.post("$baseUrl/api/generate") {
                contentType(ContentType.Application.Json)
                setBody(
                    OllamaGenerateRequest(
                        model = model,
                        prompt = request.prompt,
                        system = request.context ?: "You are a helpful AI assistant.",
                        temperature = temperature,
                        numPredict = maxTokens,
                        stream = false
                    )
                )
            }.body()

            AiResponse(content = response.response)
        } catch (e: Exception) {
            Napier.e("Ollama API request failed", e)
            throw IllegalStateException("Ollama API request failed: ${e.message}", e)
        }
    }

    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> = flow {
        if (!isConfigured()) {
            emit(AiStreamChunk.Error("Ollama provider not configured: missing base URL"))
            return@flow
        }

        val (temperature, maxTokens) = setConfig(request.temperature, request.maxTokens)

        try {
            @OptIn(InternalAPI::class)
            val response = httpClient.post("$baseUrl/api/chat") {
                contentType(ContentType.Application.Json)
                setBody(
                    OllamaChatRequest(
                        model = model,
                        messages = request.messages.map { OllamaChatMessage(it.role, it.content) },
                        temperature = temperature,
                        numPredict = maxTokens,
                        stream = true
                    )
                )
            }

            if (!response.status.isSuccess()) {
                emit(AiStreamChunk.Error("Ollama API error: ${response.status}"))
                return@flow
            }

            val channel = response.bodyAsChannel()
            val decoder = channel.readRemaining().readText()

            // Parse JSON Lines stream
            decoder.split("\n").forEach { line ->
                if (line.isBlank()) return@forEach

                try {
                    val event = kotlinx.serialization.json.Json.decodeFromString<OllamaStreamEvent>(line)
                    event.message?.content?.let { content ->
                        emit(AiStreamChunk.Delta(content))
                    }

                    if (event.done == true) {
                        emit(AiStreamChunk.Complete)
                    }
                } catch (e: Exception) {
                    // Skip malformed JSON lines
                    Napier.d("Skipped malformed JSON line: $line")
                }
            }

            emit(AiStreamChunk.Complete)
        } catch (e: Exception) {
            Napier.e("Ollama chat request failed", e)
            emit(AiStreamChunk.Error("Ollama chat request failed: ${e.message}"))
        }
    }
}

@Serializable
data class OllamaGenerateRequest(
    val model: String,
    val prompt: String,
    val system: String,
    val temperature: Double,
    @SerialName("num_predict")
    val numPredict: Int,
    val stream: Boolean = false
)

@Serializable
data class OllamaResponse(
    val response: String
)

@Serializable
data class OllamaChatRequest(
    val model: String,
    val messages: List<OllamaChatMessage>,
    val temperature: Double,
    @SerialName("num_predict")
    val numPredict: Int,
    val stream: Boolean = true
)

@Serializable
data class OllamaChatMessage(
    val role: String,
    val content: String
)

@Serializable
data class OllamaStreamEvent(
    val message: OllamaStreamMessage? = null,
    val done: Boolean? = null
)

@Serializable
data class OllamaStreamMessage(
    val content: String
)
