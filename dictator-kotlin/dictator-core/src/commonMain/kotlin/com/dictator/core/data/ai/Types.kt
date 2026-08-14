package com.dictator.core.data.ai

/**
 * AI Model Provider Types
 */
enum class ModelProvider {
    CLAUDE,
    OPENAI,
    OLLAMA,
    OPENAI_COMPATIBLE,
    DICTATOR
}

/**
 * AI Inline Request
 */
data class AiInlineRequest(
    val prompt: String,
    val context: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null,
    val thinkingBudgetTokens: Int? = null
)

/**
 * AI Chat Message
 */
data class AiChatMessage(
    val role: String,
    val content: String
)

/**
 * AI Chat Request
 */
data class AiChatRequest(
    val messages: List<AiChatMessage>,
    val systemPrompt: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null,
    val stream: Boolean = false,
    val thinkingBudgetTokens: Int? = null
)

/**
 * AI Response
 */
data class AiResponse(
    val content: String,
    val stopReason: String? = null,
    val usage: AiUsage? = null,
    val thinking: String? = null
)

/**
 * AI Token Usage
 */
data class AiUsage(
    val inputTokens: Int = 0,
    val outputTokens: Int = 0
)

/**
 * AI Stream Chunk
 */
sealed class AiStreamChunk {
    data class Delta(val content: String) : AiStreamChunk()
    data class ThinkingDelta(val content: String) : AiStreamChunk()
    object ThinkingComplete : AiStreamChunk()
    object Complete : AiStreamChunk()
    data class Error(val error: String) : AiStreamChunk()
}

/**
 * User AI Preferences
 */
data class UserAiPreferences(
    val userId: String,
    val preferredProvider: ModelProvider,
    val preferredModel: String? = null,
    val customTemperature: Double? = null,
    val customMaxTokens: Int? = null,
    val ollamaUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Provider Configuration
 */
data class ProviderConfig(
    val type: ModelProvider,
    val apiKey: String? = null,
    val baseUrl: String? = null,
    val model: String? = null,
    val temperature: Double? = null,
    val maxTokens: Int? = null
)
