package com.dictator.android.ui.editor

import com.dictator.android.data.ai.AiProviderSelection
import com.dictator.android.data.dictation.DictationEngineKind
import com.dictator.android.testutil.FakeDictationEngine
import com.dictator.android.testutil.FakeEngines
import com.dictator.android.testutil.FakePrefs
import com.dictator.android.testutil.inMemoryStore
import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.core.data.privacy.ProviderPolicyManager
import com.dictator.core.domain.entity.AiSession
import com.dictator.core.service.AiService
import com.dictator.core.service.LocalDocumentStore
import com.dictator.core.service.PrivacyService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.mock

@OptIn(ExperimentalCoroutinesApi::class)
class EditorViewModelTest {
    private class FakeAi(var answer: String = "AI answer") : AiService {
        val prompts = mutableListOf<String>()
        val contexts = mutableListOf<String>()
        override suspend fun askInline(prompt: String, context: String): String { prompts += prompt; contexts += context; return answer }
        override suspend fun startSession(mode: String, userId: String?): AiSession = error("unused")
        override suspend fun addTurn(sessionId: String, role: String, content: String): AiSession = error("unused")
    }

    private lateinit var store: LocalDocumentStore
    private lateinit var engine: FakeDictationEngine
    private lateinit var ai: FakeAi
    private lateinit var prefs: FakePrefs
    private var provider = ModelProvider.AIDOS
    private var personalData = false
    private lateinit var docId: String

    @Before
    fun setUp() = runTest {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        store = inMemoryStore()
        engine = FakeDictationEngine()
        ai = FakeAi()
        prefs = FakePrefs()
        provider = ModelProvider.AIDOS
        personalData = false
        docId = store.create("Draft").id
    }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    private fun viewModel(engines: FakeEngines = FakeEngines(engine)): EditorViewModel {
        val privacy = mock<PrivacyService> { onBlocking { containsSensitiveData(any()) } doReturn personalData }
        val vm = EditorViewModel(
            store = store, aiService = ai,
            aiResolver = object : AiProviderSelection { override fun selectedType() = provider },
            policies = ProviderPolicyManager(), privacy = privacy,
            voiceSettings = VoiceSettingsRepository(prefs), prefs = prefs, engines = engines,
            saveDispatcher = UnconfinedTestDispatcher()
        )
        vm.loadDocument(docId)
        return vm
    }

    @Test
    fun `loads the saved text and title`() = runTest {
        store.save(docId, "Sermon", "Grace.")
        val vm = viewModel()
        assertEquals("Sermon", vm.state.value.title)
        assertEquals("Grace.", vm.state.value.content)
        assertEquals(6, vm.state.value.selStart)
        assertFalse(vm.state.value.isLoading)
    }

    @Test
    fun `typing then saving persists to the store`() = runTest {
        val vm = viewModel()
        vm.onTitleChanged("New title")
        vm.onTextChanged("Hello world", 11, 11)
        assertEquals(SaveStatus.UNSAVED, vm.state.value.saveStatus)
        assertEquals(2, vm.state.value.wordCount)
        vm.saveNow()
        assertEquals(SaveStatus.SAVED, vm.state.value.saveStatus)
        val loaded = store.load(docId)!!
        assertEquals("Hello world", loaded.content)
        assertEquals("New title", loaded.document.title)
    }

    @Test
    fun `undo and redo step through edits`() = runTest {
        val vm = viewModel()
        vm.onTextChanged("one", 3, 3)
        // A pause between edits starts a new undo step.
        Thread.sleep(900)
        vm.onTextChanged("one two", 7, 7)
        vm.undo()
        assertEquals("one", vm.state.value.content)
        vm.redo()
        assertEquals("one two", vm.state.value.content)
    }

    @Test
    fun `dictation inserts at the cursor with spacing and capitalisation`() = runTest {
        val vm = viewModel()
        vm.toggleDictation()
        assertEquals(DictationPhase.LISTENING, vm.state.value.dictation)
        engine.say("hello world")
        engine.say("this is the second phrase")
        assertEquals("Hello world this is the second phrase", vm.state.value.content)
        engine.say("full stop")
        assertTrue(vm.state.value.content.endsWith("phrase."))
        engine.say("new sentence starts here")
        // Capitalised because the text before the cursor ended a sentence.
        assertTrue(vm.state.value.content.endsWith("phrase. New sentence starts here"))
    }

    @Test
    fun `dictation lands at the cursor, not the end`() = runTest {
        val vm = viewModel()
        vm.onTextChanged("Start End", 6, 6)
        vm.toggleDictation()
        engine.say("middle")
        assertEquals("Start middle End", vm.state.value.content)
    }

    @Test
    fun `a command word inside prose is dictated as text`() = runTest {
        val vm = viewModel()
        vm.toggleDictation()
        engine.say("please save the date")
        assertEquals("Please save the date", vm.state.value.content)
    }

    @Test
    fun `activation word runs a command`() = runTest {
        val vm = viewModel()
        vm.toggleDictation()
        engine.say("first paragraph")
        engine.say("Computer new paragraph")
        engine.say("second paragraph")
        assertEquals("First paragraph\n\nSecond paragraph", vm.state.value.content)
        engine.say("Computer undo")
        assertEquals("First paragraph\n\n", vm.state.value.content)
    }

    @Test
    fun `unknown command is reported, not inserted`() = runTest {
        val vm = viewModel()
        vm.toggleDictation()
        engine.say("Computer make me a sandwich")
        assertEquals("", vm.state.value.content)
        assertNotNull(vm.state.value.notice)
    }

    @Test
    fun `delete last word command`() = runTest {
        val vm = viewModel()
        vm.onTextChanged("one two three", 13, 13)
        vm.toggleDictation()
        engine.say("computer delete last word")
        assertEquals("one two ", vm.state.value.content)
    }

    @Test
    fun `unavailable engine stops with its reason and does not start`() = runTest {
        val bad = FakeDictationEngine(unavailable = "Approve Dictator in Aidos Engine (Connected Apps), then try again.")
        val vm = viewModel(FakeEngines(bad, DictationEngineKind.AIDOS))
        vm.toggleDictation()
        assertEquals(DictationPhase.IDLE, vm.state.value.dictation)
        assertTrue(vm.state.value.errorMessage!!.contains("Approve Dictator"))
        assertNull(bad.listener)
    }

    @Test
    fun `engine error returns to idle with the message`() = runTest {
        val vm = viewModel()
        vm.toggleDictation()
        engine.listener!!.onError("Microphone permission is missing.")
        assertEquals(DictationPhase.IDLE, vm.state.value.dictation)
        assertEquals("Microphone permission is missing.", vm.state.value.errorMessage)
    }

    @Test
    fun `stopping delivers the pending phrase then idles`() = runTest {
        val vm = viewModel()
        vm.toggleDictation()
        vm.toggleDictation()
        assertTrue(engine.stopped)
        assertEquals(DictationPhase.IDLE, vm.state.value.dictation)
    }

    @Test
    fun `on-device AI runs without a consent prompt`() = runTest {
        val vm = viewModel()
        vm.onTextChanged("some text", 9, 9)
        vm.openAi("Improve this")
        assertTrue(vm.state.value.ai.providerIsLocal)
        vm.runAi()
        assertNull(vm.state.value.ai.consentNeeded)
        assertEquals("AI answer", vm.state.value.ai.result)
        assertTrue(ai.prompts.single().endsWith("---\nsome text"))
    }

    @Test
    fun `cloud AI asks first, and personal data is called out`() = runTest {
        provider = ModelProvider.CLAUDE
        personalData = true
        val vm = viewModel()
        vm.onTextChanged("Matti Meikäläinen, 010101-123A", 30, 30)
        vm.openAi("Summarize")
        assertFalse(vm.state.value.ai.providerIsLocal)
        vm.runAi()
        val consent = vm.state.value.ai.consentNeeded
        assertNotNull(consent)
        assertTrue(consent!!.containsPersonalData)
        assertTrue(ai.prompts.isEmpty())
        vm.answerConsent(false)
        assertTrue(ai.prompts.isEmpty())
        vm.runAi()
        vm.answerConsent(true)
        assertEquals(1, ai.prompts.size)
        assertEquals("yes", prefs.getString("ai_consent_CLAUDE"))
    }

    @Test
    fun `cloud AI after first consent skips the prompt when there is no personal data`() = runTest {
        provider = ModelProvider.CLAUDE
        prefs.setString("ai_consent_CLAUDE", "yes")
        val vm = viewModel()
        vm.onTextChanged("plain text", 10, 10)
        vm.openAi("Fix grammar")
        vm.runAi()
        assertNull(vm.state.value.ai.consentNeeded)
        assertEquals("AI answer", vm.state.value.ai.result)
    }

    @Test
    fun `AI result replaces the selection`() = runTest {
        val vm = viewModel()
        vm.onTextChanged("keep THIS keep", 5, 9)
        vm.openAi("Lowercase it")
        assertEquals(AiScope.SELECTION, vm.state.value.ai.scope)
        ai.answer = "this"
        vm.runAi()
        vm.applyAiResult()
        assertEquals("keep this keep", vm.state.value.content)
        assertFalse(vm.state.value.ai.visible)
    }

    @Test
    fun `AI failure surfaces the message`() = runTest {
        val failing = object : AiService {
            override suspend fun askInline(prompt: String, context: String): String = error("Aidos Engine is not installed")
            override suspend fun startSession(mode: String, userId: String?): AiSession = error("unused")
            override suspend fun addTurn(sessionId: String, role: String, content: String): AiSession = error("unused")
        }
        val privacy = mock<PrivacyService>()
        val vm = EditorViewModel(
            store, failing, object : AiProviderSelection { override fun selectedType() = ModelProvider.AIDOS },
            ProviderPolicyManager(), privacy, VoiceSettingsRepository(prefs), prefs, FakeEngines(engine),
            UnconfinedTestDispatcher()
        )
        vm.loadDocument(docId)
        vm.openAi("hello")
        vm.runAi()
        assertEquals("Aidos Engine is not installed", vm.state.value.ai.error)
        assertFalse(vm.state.value.ai.running)
    }

    @Test
    fun `spoken AI request opens the sheet and runs`() = runTest {
        val vm = viewModel()
        vm.onTextChanged("draft", 5, 5)
        vm.toggleDictation()
        engine.say("Assistant summarize this")
        assertTrue(vm.state.value.ai.visible)
        assertEquals("AI answer", vm.state.value.ai.result)
        assertEquals("draft", vm.state.value.content)
    }
}
