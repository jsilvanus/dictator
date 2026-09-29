package com.dictator.android.ui.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.android.data.ai.AiProviderResolver
import com.dictator.android.data.dictation.DictationEngine
import com.dictator.android.data.dictation.DictationEngineFactory
import com.dictator.android.data.dictation.DictationEngineKind
import com.dictator.android.data.dictation.DictationListener
import com.dictator.core.data.local.VoiceSettingsRepository
import com.dictator.core.data.privacy.ProviderPolicyManager
import com.dictator.core.service.AiService
import com.dictator.core.service.LocalDocumentStore
import com.dictator.core.service.PrivacyService
import com.dictator.core.service.SharedPreferences
import com.dictator.core.util.voice.CommandType
import com.dictator.core.util.voice.DictationAction
import com.dictator.core.util.voice.DictationInterpreter
import io.github.aakira.napier.Napier
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class SaveStatus { SAVED, SAVING, UNSAVED, ERROR }
enum class DictationPhase { IDLE, STARTING, LISTENING, STOPPING }

/** What an AI request will read: the highlighted text if there is any, else the whole document. */
enum class AiScope { SELECTION, DOCUMENT }

data class AiSheetState(
    val visible: Boolean = false,
    val prompt: String = "",
    val running: Boolean = false,
    val result: String? = null,
    val error: String? = null,
    val scope: AiScope = AiScope.DOCUMENT,
    /** Where the text goes: "On this device (Aidos Engine)" or "Anthropic Claude" … */
    val providerLabel: String = "",
    val providerIsLocal: Boolean = true,
    /** Set when the request would leave the device and needs the user's OK first. */
    val consentNeeded: ConsentRequest? = null
)

data class ConsentRequest(val providerLabel: String, val containsPersonalData: Boolean, val firstUse: Boolean)

data class EditorUiState(
    val documentId: String = "",
    val title: String = "",
    val content: String = "",
    val selStart: Int = 0,
    val selEnd: Int = 0,
    val wordCount: Int = 0,
    val saveStatus: SaveStatus = SaveStatus.SAVED,
    val isLoading: Boolean = true,
    val errorMessage: String? = null,
    val notice: String? = null,
    val canUndo: Boolean = false,
    val canRedo: Boolean = false,
    val dictation: DictationPhase = DictationPhase.IDLE,
    val dictationEngine: DictationEngineKind = DictationEngineKind.SYSTEM,
    val level: Float = 0f,
    val partial: String = "",
    val language: String = "en-US",
    val ai: AiSheetState = AiSheetState()
)

class EditorViewModel constructor(
    private val store: LocalDocumentStore,
    private val aiService: AiService,
    private val aiResolver: AiProviderResolver,
    private val policies: ProviderPolicyManager,
    private val privacy: PrivacyService,
    private val voiceSettings: VoiceSettingsRepository,
    private val prefs: SharedPreferences,
    private val engines: DictationEngineFactory
) : ViewModel() {
    private val _state = MutableStateFlow(EditorUiState())
    val state: StateFlow<EditorUiState> = _state.asStateFlow()

    private val undoStack = ArrayDeque<String>()
    private val redoStack = ArrayDeque<String>()
    private var lastUndoPush = 0L
    private var saveJob: Job? = null
    private var engine: DictationEngine? = null

    // A final save must outlive the ViewModel's own scope, which is cancelled in onCleared().
    private val saveScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // ---- loading & saving -------------------------------------------------------------------

    fun loadDocument(documentId: String) {
        if (_state.value.documentId == documentId && !_state.value.isLoading) return
        _state.value = _state.value.copy(isLoading = true, documentId = documentId, errorMessage = null)
        viewModelScope.launch {
            try {
                val loaded = store.load(documentId)
                if (loaded == null) {
                    _state.value = _state.value.copy(isLoading = false, errorMessage = "Document not found")
                    return@launch
                }
                val settings = voiceSettings.loadVoiceSettings()
                undoStack.clear(); redoStack.clear()
                _state.value = _state.value.copy(
                    title = loaded.document.title,
                    content = loaded.content,
                    selStart = loaded.content.length,
                    selEnd = loaded.content.length,
                    wordCount = countWords(loaded.content),
                    isLoading = false,
                    saveStatus = SaveStatus.SAVED,
                    language = settings.language,
                    dictationEngine = engines.selectedKind(),
                    canUndo = false, canRedo = false
                )
            } catch (e: Exception) {
                Napier.e("Failed to load document", e)
                _state.value = _state.value.copy(isLoading = false, errorMessage = e.message ?: "Failed to load document")
            }
        }
    }

    fun onTitleChanged(title: String) {
        _state.value = _state.value.copy(title = title, saveStatus = SaveStatus.UNSAVED)
        scheduleSave()
    }

    /** Typing, pasting or moving the cursor in the text field. */
    fun onTextChanged(text: String, selStart: Int, selEnd: Int) {
        val current = _state.value
        if (text == current.content) {
            if (selStart != current.selStart || selEnd != current.selEnd) {
                _state.value = current.copy(selStart = selStart, selEnd = selEnd)
            }
            return
        }
        pushUndo(current.content, force = false)
        applyContent(text, selStart, selEnd)
    }

    private fun applyContent(text: String, selStart: Int, selEnd: Int) {
        _state.value = _state.value.copy(
            content = text,
            selStart = selStart.coerceIn(0, text.length),
            selEnd = selEnd.coerceIn(0, text.length),
            wordCount = countWords(text),
            saveStatus = SaveStatus.UNSAVED,
            canUndo = undoStack.isNotEmpty(),
            canRedo = redoStack.isNotEmpty()
        )
        scheduleSave()
    }

    private fun pushUndo(previous: String, force: Boolean) {
        val now = System.currentTimeMillis()
        // Typing coalesces into one undo step per pause; dictation and AI edits are always their own step.
        if (force || now - lastUndoPush > 800 || undoStack.isEmpty()) {
            undoStack.addLast(previous)
            while (undoStack.size > 50) undoStack.removeFirst()
        }
        lastUndoPush = now
        redoStack.clear()
    }

    fun undo() {
        val previous = undoStack.removeLastOrNull() ?: return
        redoStack.addLast(_state.value.content)
        applyContent(previous, previous.length, previous.length)
    }

    fun redo() {
        val next = redoStack.removeLastOrNull() ?: return
        undoStack.addLast(_state.value.content)
        applyContent(next, next.length, next.length)
    }

    private fun scheduleSave() {
        saveJob?.cancel()
        saveJob = viewModelScope.launch {
            delay(1500)
            saveNow()
        }
    }

    fun saveNow() {
        val s = _state.value
        if (s.documentId.isEmpty() || s.isLoading || s.saveStatus == SaveStatus.SAVED) return
        saveJob?.cancel()
        _state.value = s.copy(saveStatus = SaveStatus.SAVING)
        saveScope.launch {
            try {
                store.save(s.documentId, s.title, s.content)
                // Only mark saved if nothing changed while the write was in flight.
                _state.value = _state.value.let {
                    if (it.content == s.content && it.title == s.title) it.copy(saveStatus = SaveStatus.SAVED) else it.copy(saveStatus = SaveStatus.UNSAVED)
                }
            } catch (e: Exception) {
                Napier.e("Save failed", e)
                _state.value = _state.value.copy(saveStatus = SaveStatus.ERROR, errorMessage = "Could not save: ${e.message}")
            }
        }
    }

    fun clearMessages() {
        _state.value = _state.value.copy(errorMessage = null, notice = null)
    }

    // ---- editing helpers (used by dictation, voice commands and AI) -------------------------

    private fun insertAtCursor(text: String, spaced: Boolean) {
        val s = _state.value
        val start = minOf(s.selStart, s.selEnd)
        val end = maxOf(s.selStart, s.selEnd)
        val before = s.content.substring(0, start)
        val piece = if (spaced) DictationInterpreter.joinWithSpace(before, text) else text
        pushUndo(s.content, force = true)
        val newContent = before + piece + s.content.substring(end)
        val cursor = before.length + piece.length
        applyContent(newContent, cursor, cursor)
    }

    private fun replaceRange(start: Int, end: Int, replacement: String) {
        val s = _state.value
        pushUndo(s.content, force = true)
        val newContent = s.content.substring(0, start) + replacement + s.content.substring(end)
        val cursor = start + replacement.length
        applyContent(newContent, cursor, cursor)
    }

    private fun selectedRange(): IntRange? {
        val s = _state.value
        val a = minOf(s.selStart, s.selEnd)
        val b = maxOf(s.selStart, s.selEnd)
        return if (a != b) a until b else null
    }

    private fun deleteLastWord() {
        val s = _state.value
        val cursor = minOf(s.selStart, s.selEnd)
        val before = s.content.substring(0, cursor).trimEnd()
        val cut = before.lastIndexOfAny(charArrayOf(' ', '\n', '\t')) + 1
        replaceRange(cut, cursor, "")
    }

    private fun deleteCurrentLine() {
        val s = _state.value
        val cursor = minOf(s.selStart, s.selEnd)
        val lineStart = s.content.lastIndexOf('\n', cursor - 1) + 1
        val nl = s.content.indexOf('\n', cursor)
        val lineEnd = if (nl == -1) s.content.length else nl + 1
        replaceRange(lineStart, lineEnd, "")
    }

    private fun wrapSelection(marker: String) {
        val range = selectedRange()
        if (range == null) {
            notice("Select some text first, then say the command.")
            return
        }
        val s = _state.value
        replaceRange(range.first, range.last + 1, marker + s.content.substring(range.first, range.last + 1) + marker)
    }

    private fun notice(message: String) {
        _state.value = _state.value.copy(notice = message)
    }

    // ---- dictation --------------------------------------------------------------------------

    fun toggleDictation() {
        when (_state.value.dictation) {
            DictationPhase.IDLE -> startDictation()
            DictationPhase.LISTENING -> stopDictation()
            else -> Unit
        }
    }

    /** The caller has already obtained the microphone permission. */
    private fun startDictation() {
        val kind = engines.selectedKind()
        val e = engines.create()
        engine = e
        _state.value = _state.value.copy(dictation = DictationPhase.STARTING, dictationEngine = kind, partial = "", level = 0f, errorMessage = null)
        viewModelScope.launch {
            val reason = e.unavailableReason()
            if (reason != null) {
                engine = null
                _state.value = _state.value.copy(dictation = DictationPhase.IDLE, errorMessage = reason)
                return@launch
            }
            val settings = voiceSettings.loadVoiceSettings()
            val language = settings.language
            _state.value = _state.value.copy(language = language)
            e.start(language, object : DictationListener {
                override fun onListening() {
                    _state.value = _state.value.copy(dictation = DictationPhase.LISTENING)
                }
                override fun onLevel(level: Float) {
                    _state.value = _state.value.copy(level = level)
                }
                override fun onPartial(text: String) {
                    _state.value = _state.value.copy(partial = text)
                }
                override fun onFinal(text: String) {
                    _state.value = _state.value.copy(partial = "")
                    handleUtterance(text, language)
                }
                override fun onError(message: String) {
                    engine = null
                    _state.value = _state.value.copy(dictation = DictationPhase.IDLE, partial = "", level = 0f, errorMessage = message)
                }
                override fun onStopped() {
                    engine = null
                    _state.value = _state.value.copy(dictation = DictationPhase.IDLE, partial = "", level = 0f)
                }
            })
        }
    }

    fun stopDictation() {
        if (_state.value.dictation != DictationPhase.LISTENING) return
        _state.value = _state.value.copy(dictation = DictationPhase.STOPPING)
        engine?.stop()
    }

    private fun handleUtterance(text: String, language: String) {
        val s = _state.value
        val commands = voiceSettings.getActivationCommandsForLanguage(language)
        val before = s.content.substring(0, minOf(s.selStart, s.selEnd))
        when (val action = DictationInterpreter.interpret(text, language, commands, before)) {
            is DictationAction.Insert -> if (action.text.isNotEmpty()) insertAtCursor(action.text, spaced = true)
            is DictationAction.AskAi -> openAi(action.prompt, run = true)
            is DictationAction.UnknownCommand -> notice("Did not understand the command: \"${action.spoken}\"")
            is DictationAction.Command -> runCommand(action.type, action.spoken)
        }
    }

    private fun runCommand(type: CommandType, spoken: String) {
        when (type) {
            CommandType.NEW_LINE -> insertAtCursor("\n", spaced = false)
            CommandType.NEW_PARAGRAPH -> insertAtCursor("\n\n", spaced = false)
            CommandType.UNDO -> undo()
            CommandType.REDO -> redo()
            CommandType.DELETE_WORD -> deleteLastWord()
            CommandType.DELETE_LINE -> deleteCurrentLine()
            CommandType.SELECT_ALL -> _state.value = _state.value.copy(selStart = 0, selEnd = _state.value.content.length)
            CommandType.SAVE -> saveNow()
            CommandType.BOLD -> wrapSelection("**")
            CommandType.ITALIC -> wrapSelection("*")
            CommandType.ASK_AI -> openAi("", run = false)
            CommandType.AI_IMPROVE -> openAi(PRESET_IMPROVE, run = true)
            CommandType.AI_REWRITE -> openAi(PRESET_REWRITE, run = true)
            CommandType.AI_GRAMMAR_CHECK -> openAi(PRESET_GRAMMAR, run = true)
            CommandType.AI_SUMMARIZE -> openAi(PRESET_SUMMARIZE, run = true)
            else -> notice("\"$spoken\" is not supported yet.")
        }
    }

    // ---- AI ---------------------------------------------------------------------------------

    fun openAi(prompt: String = "", run: Boolean = false) {
        val type = aiResolver.selectedType()
        val policyKey = type.name.lowercase()
        val local = policies.isLocalProvider(policyKey)
        val label = policies.getPolicy(policyKey)?.displayName ?: type.name
        val scope = if (selectedRange() != null) AiScope.SELECTION else AiScope.DOCUMENT
        _state.value = _state.value.copy(
            ai = AiSheetState(visible = true, prompt = prompt, scope = scope, providerLabel = label, providerIsLocal = local)
        )
        if (run && prompt.isNotBlank()) runAi()
    }

    fun closeAi() {
        _state.value = _state.value.copy(ai = AiSheetState())
    }

    fun onAiPromptChanged(prompt: String) {
        _state.value = _state.value.copy(ai = _state.value.ai.copy(prompt = prompt, error = null))
    }

    fun setAiScope(scope: AiScope) {
        _state.value = _state.value.copy(ai = _state.value.ai.copy(scope = scope, result = null, error = null))
    }

    private fun aiSourceText(): String {
        val s = _state.value
        val range = selectedRange()
        return if (s.ai.scope == AiScope.SELECTION && range != null) s.content.substring(range.first, range.last + 1) else s.content
    }

    /** Runs the request, or — for a provider that is not on this device — asks for consent first. */
    fun runAi() {
        val ai = _state.value.ai
        if (ai.running || ai.prompt.isBlank()) return
        val text = aiSourceText()
        if (ai.providerIsLocal) {
            sendAi(text)
            return
        }
        val type = aiResolver.selectedType()
        val consentKey = "ai_consent_${type.name}"
        val firstUse = prefs.getString(consentKey, null) != "yes"
        viewModelScope.launch {
            val personal = text.isNotBlank() && runCatching { privacy.containsSensitiveData(text) }.getOrDefault(false)
            if (firstUse || personal) {
                _state.value = _state.value.copy(ai = _state.value.ai.copy(consentNeeded = ConsentRequest(ai.providerLabel, personal, firstUse)))
            } else {
                sendAi(text)
            }
        }
    }

    fun answerConsent(allow: Boolean) {
        val ai = _state.value.ai
        _state.value = _state.value.copy(ai = ai.copy(consentNeeded = null))
        if (!allow) return
        prefs.setString("ai_consent_${aiResolver.selectedType().name}", "yes")
        sendAi(aiSourceText())
    }

    private fun sendAi(text: String) {
        val prompt = _state.value.ai.prompt
        _state.value = _state.value.copy(ai = _state.value.ai.copy(running = true, error = null, result = null))
        viewModelScope.launch {
            try {
                val answer = aiService.askInline(
                    prompt = if (text.isBlank()) prompt else "$prompt\n\n---\n$text",
                    context = AI_SYSTEM_PROMPT
                )
                _state.value = _state.value.copy(ai = _state.value.ai.copy(running = false, result = answer.trim()))
            } catch (e: Exception) {
                Napier.e("AI request failed", e)
                _state.value = _state.value.copy(ai = _state.value.ai.copy(running = false, error = e.message ?: "The AI request failed"))
            }
        }
    }

    /** Puts the AI's answer into the document: over the highlighted text if that was the scope, else at the cursor. */
    fun applyAiResult() {
        val ai = _state.value.ai
        val result = ai.result ?: return
        val range = selectedRange()
        if (ai.scope == AiScope.SELECTION && range != null) replaceRange(range.first, range.last + 1, result)
        else insertAtCursor(result, spaced = true)
        closeAi()
    }

    override fun onCleared() {
        super.onCleared()
        engine?.cancel()
        // Persist anything typed in the last 1.5 s before the debounce fired.
        val s = _state.value
        if (s.documentId.isNotEmpty() && !s.isLoading && s.saveStatus != SaveStatus.SAVED) {
            saveScope.launch { withContext(NonCancellable) { runCatching { store.save(s.documentId, s.title, s.content) } } }
        }
    }

    private fun countWords(text: String) = text.split(Regex("\\s+")).count { it.isNotBlank() }

    companion object {
        const val AI_SYSTEM_PROMPT =
            "You are the writing assistant inside a dictation app. Reply with only the resulting text, " +
                "no preamble or explanation, in the same language as the user's text unless asked otherwise. " +
                "The user's text follows the line \"---\"."
        const val PRESET_IMPROVE = "Improve the following text: clearer and better flowing, same meaning."
        const val PRESET_REWRITE = "Rewrite the following text in different words, same meaning."
        const val PRESET_GRAMMAR = "Correct spelling, grammar and punctuation in the following text. Change nothing else."
        const val PRESET_SUMMARIZE = "Summarize the following text briefly."
    }
}
