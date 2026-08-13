package com.dictator.core.data.ai

import kotlinx.coroutines.flow.Flow

/**
 * AI Provider Interface
 * Defines the contract that all AI providers must implement
 */
interface AiProvider {
    /**
     * Send an inline request to the AI provider
     */
    suspend fun askInline(request: AiInlineRequest): AiResponse

    /**
     * Send a chat request with streaming support
     */
    fun chat(request: AiChatRequest): Flow<AiStreamChunk>

    /**
     * Check if the provider is properly configured
     */
    fun isConfigured(): Boolean

    /**
     * Get the model name
     */
    fun getModelName(): String

    /**
     * Get provider type
     */
    fun getProviderType(): ModelProvider
}
