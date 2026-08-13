package com.dictator.core.data.ai

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import io.github.aakira.napier.Napier

/**
 * Base Abstract AI Provider
 * Provides common functionality and defines required methods
 */
abstract class BaseAiProvider(
    protected val model: String = "default",
    protected val temperature: Double = 0.7,
    protected val maxTokens: Int = 2048
) : AiProvider {

    /**
     * Subclasses must implement the actual API call logic
     */
    abstract override suspend fun askInline(request: AiInlineRequest): AiResponse

    /**
     * Subclasses must implement streaming chat logic
     */
    abstract override fun chat(request: AiChatRequest): Flow<AiStreamChunk>

    /**
     * Subclasses must implement configuration check
     */
    abstract override fun isConfigured(): Boolean

    /**
     * Subclasses must implement provider type
     */
    abstract override fun getProviderType(): ModelProvider

    /**
     * Get the configured model name
     */
    override fun getModelName(): String = model

    /**
     * Helper to set configuration parameters
     */
    protected fun setConfig(temperature: Double? = null, maxTokens: Int? = null): Pair<Double, Int> {
        val finalTemp = temperature?.coerceIn(0.0, 2.0) ?: this.temperature
        val finalMaxTokens = maxTokens?.coerceAtLeast(1) ?: this.maxTokens
        return Pair(finalTemp, finalMaxTokens)
    }

    /**
     * Helper to merge request parameters with provider defaults
     */
    protected fun mergeRequestParams(request: AiInlineRequest): Pair<Double, Int> {
        val temp = request.temperature ?: temperature
        val tokens = request.maxTokens ?: maxTokens
        return Pair(temp, tokens)
    }

    /**
     * Helper to create error stream
     */
    protected fun createErrorStream(error: String): Flow<AiStreamChunk> {
        Napier.e("AI Provider Error: $error")
        return flowOf(AiStreamChunk.Error(error))
    }

    /**
     * Helper to create simple complete stream
     */
    protected fun createCompleteStream(content: String): Flow<AiStreamChunk> {
        return flowOf(
            AiStreamChunk.Delta(content),
            AiStreamChunk.Complete
        )
    }
}
