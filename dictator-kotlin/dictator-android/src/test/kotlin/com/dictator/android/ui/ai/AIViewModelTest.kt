package com.dictator.android.ui.ai

import android.content.Context
import com.dictator.core.data.ai.AiChatRequest
import com.dictator.core.data.ai.AiInlineRequest
import com.dictator.core.data.ai.AiResponse
import com.dictator.core.data.ai.AiStreamChunk
import com.dictator.core.data.ai.ModelProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.mock

class AIViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private lateinit var viewModel: AIViewModel
    private lateinit var provider: FakeAiProvider

    @Before
    fun setup() {
        Dispatchers.setMain(dispatcher)
        provider = FakeAiProvider()
        viewModel = AIViewModel(
            providerResolver = object : AiProviderResolver {
                override fun resolve() = provider
            },
            context = mock<Context>()
        )
    }

    @After
    fun tearDown() {
        viewModel.clearConversation()
        Dispatchers.resetMain()
    }

    @Test
    fun initialStateUsesResolvedProvider() {
        assertEquals("DICTATOR", viewModel.state.value.providerName)
        assertEquals("test-model", viewModel.state.value.modelName)
        assertTrue(viewModel.state.value.messages.isEmpty())
    }

    @Test
    fun promptIsSentToProviderAndStreamIsRendered() = runTest(dispatcher) {
        viewModel.sendPrompt("What is AI?")
        advanceUntilIdle()

        assertEquals(1, provider.requests.size)
        assertEquals("What is AI?", provider.requests.single().messages.last().content)
        assertEquals(2, viewModel.state.value.messages.size)
        assertEquals("Hello from the test provider.", viewModel.state.value.messages.last().content)
        assertFalse(viewModel.state.value.isStreaming)
        assertEquals("", viewModel.state.value.currentStreamingResponse)
    }

    @Test
    fun blankPromptIsIgnored() = runTest(dispatcher) {
        viewModel.sendPrompt("   ")
        advanceUntilIdle()

        assertTrue(provider.requests.isEmpty())
        assertTrue(viewModel.state.value.messages.isEmpty())
    }

    @Test
    fun providerErrorEnablesRetry() = runTest(dispatcher) {
        provider.stream = flowOf(AiStreamChunk.Error("network failure"))

        viewModel.sendPrompt("Try this")
        advanceUntilIdle()

        assertFalse(viewModel.state.value.isStreaming)
        assertEquals("network failure", viewModel.state.value.errorMessage)
        assertTrue(viewModel.state.value.canRetry)
    }

    @Test
    fun retrySendsTheSameConversationAgain() = runTest(dispatcher) {
        provider.stream = flowOf(AiStreamChunk.Error("network failure"))
        viewModel.sendPrompt("Try again")
        advanceUntilIdle()
        assertTrue(viewModel.state.value.canRetry)

        provider.stream = flowOf(
            AiStreamChunk.Delta("Recovered"),
            AiStreamChunk.Complete
        )
        viewModel.retryLastPrompt()
        advanceUntilIdle()

        assertEquals(2, provider.requests.size)
        assertEquals("Recovered", viewModel.state.value.messages.last().content)
        assertFalse(viewModel.state.value.canRetry)
    }

    @Test
    fun clearConversationCancelsAndClearsState() = runTest(dispatcher) {
        viewModel.sendPrompt("Hello")
        advanceUntilIdle()
        viewModel.clearConversation()

        assertTrue(viewModel.state.value.messages.isEmpty())
        assertEquals("", viewModel.state.value.currentStreamingResponse)
        assertFalse(viewModel.state.value.isStreaming)
    }

    private class FakeAiProvider : com.dictator.core.data.ai.AiProvider {
        val requests = mutableListOf<AiChatRequest>()
        var stream: Flow<AiStreamChunk> = flowOf(
            AiStreamChunk.Delta("Hello "),
            AiStreamChunk.Delta("from the test provider."),
            AiStreamChunk.Complete
        )

        override suspend fun askInline(request: AiInlineRequest): AiResponse =
            AiResponse(content = "OK")

        override fun chat(request: AiChatRequest): Flow<AiStreamChunk> {
            requests += request
            return stream
        }

        override fun isConfigured(): Boolean = true
        override fun getModelName(): String = "test-model"
        override fun getProviderType(): ModelProvider = ModelProvider.DICTATOR
    }
}
