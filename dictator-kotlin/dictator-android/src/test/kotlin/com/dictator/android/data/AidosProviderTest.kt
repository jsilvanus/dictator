package com.dictator.android.data

import com.dictator.android.data.ai.AidosProvider
import com.dictator.android.testutil.FakeAidosClient
import com.dictator.core.data.ai.AiChatMessage
import com.dictator.core.data.ai.AiChatRequest
import com.dictator.core.data.ai.AiInlineRequest
import com.dictator.core.data.ai.AiStreamChunk
import fi.italeino.aidos.sdk.client.ChatChoice
import fi.italeino.aidos.sdk.client.ChatCompletionChunk
import fi.italeino.aidos.sdk.client.ChatCompletionResponse
import fi.italeino.aidos.sdk.client.ChatMessage
import fi.italeino.aidos.sdk.client.ChunkChoice
import fi.italeino.aidos.sdk.client.ChunkDelta
import fi.italeino.aidos.sdk.client.EngineAvailability
import fi.italeino.aidos.sdk.client.TokenUsage
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class AidosProviderTest {
    private fun response(text: String) = ChatCompletionResponse(
        id = "1", created = 0, model = "llm-1",
        choices = listOf(ChatChoice(0, ChatMessage("assistant", text), "stop")),
        usage = TokenUsage(3, 4, 7)
    )

    private fun chunk(text: String?) = ChatCompletionChunk("1", 0, "llm-1", listOf(ChunkChoice(0, ChunkDelta(content = text))))

    private fun provider(client: FakeAidosClient, model: String = "") =
        AidosProvider(AidosEngineConnection(client), model)

    @Test
    fun `askInline sends context as system message and picks the first llm`() = runTest {
        val client = FakeAidosClient(chat = response("Hei"))
        val answer = provider(client).askInline(AiInlineRequest(prompt = "Translate", context = "Be brief"))
        assertEquals("Hei", answer.content)
        assertEquals(7, (answer.usage?.inputTokens ?: 0) + (answer.usage?.outputTokens ?: 0))
        val sent = client.chatRequests.single()
        assertEquals("llm-1", sent.model)
        assertEquals(listOf("system", "user"), sent.messages.map { it.role })
    }

    @Test
    fun `preferred model wins over the first llm`() = runTest {
        val client = FakeAidosClient(chat = response("x"))
        provider(client, model = "llm-big").askInline(AiInlineRequest(prompt = "p"))
        assertEquals("llm-big", client.chatRequests.single().model)
    }

    @Test
    fun `unavailable engine throws an actionable message and never falls back`() = runTest {
        val client = FakeAidosClient(state = EngineAvailability.PendingApproval)
        try {
            provider(client).askInline(AiInlineRequest(prompt = "p"))
            fail("expected an exception")
        } catch (e: IllegalStateException) {
            assertTrue(e.message!!.contains("Approve Dictator"))
        }
        assertTrue(client.chatRequests.isEmpty())
    }

    @Test
    fun `no llm installed is reported`() = runTest {
        val client = FakeAidosClient(capabilities = fi.italeino.aidos.sdk.client.EngineCapabilities(emptyList(), emptyList()))
        try {
            provider(client).askInline(AiInlineRequest(prompt = "p"))
            fail("expected an exception")
        } catch (e: IllegalStateException) {
            assertTrue(e.message!!.contains("no language model"))
        }
    }

    @Test
    fun `chat maps deltas and completes`() = runTest {
        val client = FakeAidosClient(stream = listOf(chunk("Hel"), chunk(null), chunk("lo")))
        val out = provider(client).chat(AiChatRequest(listOf(AiChatMessage("user", "hi")))).toList()
        assertEquals(listOf<AiStreamChunk>(AiStreamChunk.Delta("Hel"), AiStreamChunk.Delta("lo"), AiStreamChunk.Complete), out)
    }

    @Test
    fun `empty stream is an error not a silent success`() = runTest {
        val out = provider(FakeAidosClient()).chat(AiChatRequest(listOf(AiChatMessage("user", "hi")))).toList()
        assertTrue(out.single() is AiStreamChunk.Error)
    }

    @Test
    fun `chat reports unavailability as an error chunk`() = runTest {
        val out = provider(FakeAidosClient(state = EngineAvailability.NotInstalled)).chat(AiChatRequest(listOf(AiChatMessage("user", "hi")))).toList()
        assertTrue((out.single() as AiStreamChunk.Error).error.contains("not installed"))
    }
}
