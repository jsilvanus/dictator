package com.dictator.android.ui.ai

import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

class AIViewModelTest {
    private lateinit var viewModel: AIViewModel

    @Before
    fun setup() {
        viewModel = AIViewModel()
    }

    @Test
    fun testInitialState() {
        val state = viewModel.state.value
        assertTrue(state.messages.isEmpty())
        assertEquals("", state.currentPrompt)
        assertFalse(state.isStreaming)
        assertTrue(state.sessions.isNotEmpty())
    }

    @Test
    fun testOnPromptChanged() {
        viewModel.onPromptChanged("What is AI?")
        assertEquals("What is AI?", viewModel.state.value.currentPrompt)
    }

    @Test
    fun testSendPrompt() {
        viewModel.sendPrompt("What is AI?")
        val state = viewModel.state.value
        
        // Prompt should be cleared
        assertEquals("", state.currentPrompt)
        
        // User message should be added
        assertTrue(state.messages.any { it.role == "user" })
        
        // Streaming should start
        assertTrue(state.isStreaming)
    }

    @Test
    fun testSendPromptWithEmptyText() {
        val initialMessageCount = viewModel.state.value.messages.size
        viewModel.sendPrompt("")
        viewModel.sendPrompt("   ")
        
        // Should not add any messages
        assertEquals(initialMessageCount, viewModel.state.value.messages.size)
    }

    @Test
    fun testClearConversation() {
        viewModel.sendPrompt("Hello")
        assertTrue(viewModel.state.value.messages.isNotEmpty())
        
        viewModel.clearConversation()
        assertTrue(viewModel.state.value.messages.isEmpty())
        assertEquals("", viewModel.state.value.currentStreamingResponse)
        assertFalse(viewModel.state.value.isStreaming)
    }

    @Test
    fun testCopyResponse() {
        val response = "This is a response"
        // Should not throw exception
        viewModel.copyResponse(response)
    }

    @Test
    fun testInsertIntoDocument() {
        val text = "Some AI generated text"
        val result = viewModel.insertIntoDocument(text)
        assertEquals(text, result)
    }

    @Test
    fun testLoadSessions() {
        val state = viewModel.state.value
        assertTrue(state.sessions.isNotEmpty())
        assertTrue(state.sessions.contains("default"))
    }

    @Test
    fun testSwitchSession() {
        val messagesBefore = viewModel.state.value.messages.size
        viewModel.sendPrompt("Test")
        assertTrue(viewModel.state.value.messages.isNotEmpty())
        
        viewModel.switchSession("Session 1")
        val state = viewModel.state.value
        assertEquals("Session 1", state.currentSessionId)
        assertTrue(state.messages.isEmpty())
    }

    @Test
    fun testMultipleMessages() {
        viewModel.sendPrompt("First question")
        viewModel.sendPrompt("Second question")
        
        val state = viewModel.state.value
        assertTrue(state.messages.any { it.content.contains("First") })
        assertTrue(state.messages.any { it.content.contains("Second") })
    }

    @Test
    fun testMessageRoles() {
        viewModel.sendPrompt("User question")
        val state = viewModel.state.value
        
        val userMessages = state.messages.filter { it.role == "user" }
        assertTrue(userMessages.isNotEmpty())
        assertTrue(userMessages.any { it.content.contains("User question") })
    }
}
