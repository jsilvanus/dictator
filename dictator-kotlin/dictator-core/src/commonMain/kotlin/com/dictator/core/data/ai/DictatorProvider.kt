package com.dictator.core.data.ai

import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray

/**
 * Dictator Service AI Provider
 * Connects to the Dictator-hosted AI service backend
 */
class DictatorProvider(
    private val httpClient: HttpClient,
    private val baseUrl: String = "https://ai.dictator.dev",
    private val model: String = "dictator-ai-default"
) : AiProvider {

    override suspend fun askInline(request: AiInlineRequest): AiResponse {
        return try {
            val payload = buildJsonObject {
                put("prompt", request.prompt)
                if (request.context != null) put("context", request.context)
                put("temperature", request.temperature ?: 0.7)
                put("maxTokens", request.maxTokens ?: 2048)
                put("model", model)
            }

            val response = httpClient.post("$baseUrl/v1/inline") {
                contentType(ContentType.Application.Json)
                setBody(payload.toString())
            }

            if (response.status.value in 200..299) {
                val responseBody = response.bodyAsText()
                val jsonResponse = Json.parseToJsonElement(responseBody) as? JsonObject
                AiResponse(
                    content = jsonResponse?.get("content")?.toString()?.trim('"') ?: "",
                    stopReason = jsonResponse?.get("stopReason")?.toString()?.trim('"')
                )
            } else {
                throw Exception("Dictator AI error: ${response.status}")
            }
        } catch (e: Exception) {
            Napier.e("Dictator provider error", e)
            throw Exception("Dictator provider error: ${e.message}")
        }
    }

    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> = flow {
        try {
            val messagesArray = buildJsonArray {
                request.messages.forEach { msg ->
                    add(buildJsonObject {
                        put("role", msg.role)
                        put("content", msg.content)
                    })
                }
            }

            val payload = buildJsonObject {
                put("messages", messagesArray)
                if (request.systemPrompt != null) put("systemPrompt", request.systemPrompt)
                put("temperature", request.temperature ?: 0.7)
                put("maxTokens", request.maxTokens ?: 2048)
                put("model", model)
                put("stream", true)
            }

            val response = httpClient.post("$baseUrl/v1/chat") {
                contentType(ContentType.Application.Json)
                setBody(payload.toString())
            }

            if (response.status.value in 200..299) {
                val responseBody = response.bodyAsText()
                val lines = responseBody.split("\n")
                
                for (line in lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            val data = Json.parseToJsonElement(line.substring(6)) as? JsonObject
                            val content = data?.get("content")?.toString()?.trim('"')
                            if (!content.isNullOrEmpty()) {
                                emit(AiStreamChunk.Delta(content))
                            }
                        } catch (e: Exception) {
                            Napier.d("Failed to parse stream chunk", e)
                        }
                    }
                }
                emit(AiStreamChunk.Complete)
            } else {
                emit(AiStreamChunk.Error("Dictator AI error: ${response.status}"))
            }
        } catch (e: Exception) {
            Napier.e("Dictator chat error", e)
            emit(AiStreamChunk.Error("Dictator provider error: ${e.message}"))
        }
    }

    override fun isConfigured(): Boolean {
        // Dictator provider is always configured as it uses a public service
        return true
    }

    override fun getModelName(): String = model

    override fun getProviderType(): ModelProvider = ModelProvider.DICTATOR
}
