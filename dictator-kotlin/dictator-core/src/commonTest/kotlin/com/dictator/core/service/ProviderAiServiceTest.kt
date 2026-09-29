package com.dictator.core.service

import com.dictator.core.data.ai.AiChatRequest
import com.dictator.core.data.ai.AiInlineRequest
import com.dictator.core.data.ai.AiProvider
import com.dictator.core.data.ai.AiResponse
import com.dictator.core.data.ai.AiStreamChunk
import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.data.error.DataException
import com.dictator.core.domain.entity.AiSession
import com.dictator.core.domain.repository.AiSessionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

private class FakeProvider(private val chunks: List<AiStreamChunk> = listOf(AiStreamChunk.Delta("Hel"), AiStreamChunk.Delta("lo"), AiStreamChunk.Complete)) : AiProvider {
    var lastInline: AiInlineRequest? = null
    var lastChat: AiChatRequest? = null
    override suspend fun askInline(request: AiInlineRequest): AiResponse { lastInline = request; return AiResponse("answer") }
    override fun chat(request: AiChatRequest): Flow<AiStreamChunk> { lastChat = request; return flowOf(*chunks.toTypedArray()) }
    override fun isConfigured() = true
    override fun getModelName() = "fake"
    override fun getProviderType() = ModelProvider.AIDOS
}

private class FakeSessions : AiSessionRepository {
    val store = mutableMapOf<String, AiSession>()
    override suspend fun getSessionById(id: String) = store[id]
    override suspend fun getSessionsByUserId(userId: String) = store.values.filter { it.userId == userId }
    override suspend fun createSession(session: AiSession): AiSession { store[session.id] = session; return session }
    override suspend fun updateSession(session: AiSession): AiSession { store[session.id] = session; return session }
    override suspend fun deleteSession(id: String) = store.remove(id) != null
    override suspend fun deleteByUserId(userId: String) = true
    override fun observeSession(id: String): Flow<AiSession?> = MutableStateFlow(store[id])
}

class ProviderAiServiceTest {
    @Test
    fun `askInline uses the selected provider and passes context as system prompt`() = runTest {
        val provider = FakeProvider()
        val service = ProviderAiService({ provider }, FakeSessions())
        assertEquals("answer", service.askInline("improve", "selected text"))
        assertEquals("improve", provider.lastInline?.prompt)
        assertEquals("selected text", provider.lastInline?.context)
    }

    @Test
    fun `blank prompt is a validation error`() = runTest {
        val service = ProviderAiService({ FakeProvider() }, FakeSessions())
        assertFailsWith<DataException.ValidationError> { service.askInline(" ", "") }
    }

    @Test
    fun `addTurn sends history and stores the streamed reply`() = runTest {
        val provider = FakeProvider()
        val sessions = FakeSessions()
        val service = ProviderAiService({ provider }, sessions)
        val session = service.startSession("panel", null)
        val updated = service.addTurn(session.id, "user", "hi")
        assertEquals(listOf("user", "assistant"), updated.turns.map { it.role })
        assertEquals("Hello", updated.turns.last().content)
        assertEquals(1, provider.lastChat?.messages?.size)
    }

    @Test
    fun `stream error becomes a data exception`() = runTest {
        val provider = FakeProvider(listOf(AiStreamChunk.Error("engine gone")))
        val service = ProviderAiService({ provider }, FakeSessions())
        val session = service.startSession("panel", null)
        assertFailsWith<DataException.NetworkError> { service.addTurn(session.id, "user", "hi") }
    }

    @Test
    fun `provider lookup failure is wrapped`() = runTest {
        val service = ProviderAiService({ error("Aidos Engine unavailable") }, FakeSessions())
        assertFailsWith<DataException.NetworkError> { service.askInline("x", "") }
    }
}
