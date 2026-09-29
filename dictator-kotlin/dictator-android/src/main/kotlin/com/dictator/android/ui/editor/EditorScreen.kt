package com.dictator.android.ui.editor

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Redo
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Undo
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import org.koin.androidx.compose.koinViewModel
import com.dictator.android.data.dictation.DictationEngineKind

@Composable
fun EditorScreen(
    documentId: String = "",
    viewModel: EditorViewModel = koinViewModel(),
    onBack: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(documentId) {
        if (documentId.isNotEmpty()) viewModel.loadDocument(documentId)
    }
    // Leaving the screen saves whatever the debounce has not written yet.
    DisposableEffect(Unit) { onDispose { viewModel.saveNow() } }

    LaunchedEffect(state.errorMessage, state.notice) {
        (state.errorMessage ?: state.notice)?.let {
            snackbar.showSnackbar(it)
            viewModel.clearMessages()
        }
    }

    val micPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) viewModel.toggleDictation()
    }
    val onMicClick = {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (granted || state.dictation == DictationPhase.LISTENING) viewModel.toggleDictation()
        else micPermission.launch(Manifest.permission.RECORD_AUDIO)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    TextField(
                        value = state.title,
                        onValueChange = viewModel::onTitleChanged,
                        singleLine = true,
                        placeholder = { Text("Title") },
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.saveNow(); onBack() }) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = viewModel::undo, enabled = state.canUndo) { Icon(Icons.Filled.Undo, contentDescription = "Undo") }
                    IconButton(onClick = viewModel::redo, enabled = state.canRedo) { Icon(Icons.Filled.Redo, contentDescription = "Redo") }
                    IconButton(onClick = { viewModel.openAi() }) { Icon(Icons.Filled.AutoAwesome, contentDescription = "AI assistant") }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
        floatingActionButton = {
            FloatingActionButton(onClick = onMicClick) {
                val listening = state.dictation == DictationPhase.LISTENING
                Icon(if (listening) Icons.Filled.Stop else Icons.Filled.Mic, contentDescription = if (listening) "Stop dictation" else "Start dictation")
            }
        }
    ) { padding ->
        if (state.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            return@Scaffold
        }
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            DictationBanner(state)
            EditorText(state, viewModel, Modifier.weight(1f))
            Text(
                text = statusLine(state),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 8.dp)
            )
        }
    }

    if (state.ai.visible) AiSheet(state.ai, viewModel)
}

private fun statusLine(state: EditorUiState): String {
    val saved = when (state.saveStatus) {
        SaveStatus.SAVED -> "Saved on this device"
        SaveStatus.SAVING -> "Saving…"
        SaveStatus.UNSAVED -> "Unsaved changes"
        SaveStatus.ERROR -> "Could not save"
    }
    return "${state.wordCount} words · $saved"
}

@Composable
private fun DictationBanner(state: EditorUiState) {
    if (state.dictation == DictationPhase.IDLE) return
    Card(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            val engineName = if (state.dictationEngine == DictationEngineKind.AIDOS) "Aidos, on this device" else "Android speech service"
            Text(
                when (state.dictation) {
                    DictationPhase.STARTING -> "Starting… ($engineName)"
                    DictationPhase.LISTENING -> "Listening… ($engineName)"
                    else -> "Finishing…"
                },
                style = MaterialTheme.typography.labelLarge
            )
            LinearProgressIndicator(progress = { state.level }, modifier = Modifier.fillMaxWidth())
            if (state.partial.isNotBlank()) Text(state.partial, style = MaterialTheme.typography.bodyMedium)
            if (state.dictationEngine == DictationEngineKind.AIDOS && state.dictation == DictationPhase.LISTENING) {
                Text(
                    "Text appears after each pause — offline dictation shows no live words.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun EditorText(state: EditorUiState, viewModel: EditorViewModel, modifier: Modifier) {
    // The field keeps its own TextFieldValue so the IME's composing region survives recomposition;
    // it is replaced only when the view model changed the text or selection itself (dictation, AI, undo).
    var value by remember { mutableStateOf(TextFieldValue(state.content, TextRange(state.selStart, state.selEnd))) }
    LaunchedEffect(state.content, state.selStart, state.selEnd) {
        if (value.text != state.content || value.selection != TextRange(state.selStart, state.selEnd)) {
            value = TextFieldValue(state.content, TextRange(state.selStart, state.selEnd))
        }
    }
    OutlinedTextField(
        value = value,
        onValueChange = {
            value = it
            viewModel.onTextChanged(it.text, it.selection.start, it.selection.end)
        },
        placeholder = { Text("Type, or tap the microphone and speak.") },
        modifier = modifier.fillMaxWidth().padding(bottom = 72.dp)
    )
}

@Composable
private fun AiSheet(ai: AiSheetState, viewModel: EditorViewModel) {
    val clipboard = LocalClipboardManager.current
    ModalBottomSheet(onDismissRequest = viewModel::closeAi) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 24.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("AI assistant", style = MaterialTheme.typography.titleMedium)
            Text(
                if (ai.providerIsLocal) "Runs on this device: ${ai.providerLabel}. Nothing is sent to a third party."
                else "Sends your text to ${ai.providerLabel}. Change the provider in Settings.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = ai.scope == AiScope.SELECTION, onClick = { viewModel.setAiScope(AiScope.SELECTION) }, label = { Text("Selected text") })
                FilterChip(selected = ai.scope == AiScope.DOCUMENT, onClick = { viewModel.setAiScope(AiScope.DOCUMENT) }, label = { Text("Whole document") })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Improve" to EditorViewModel.PRESET_IMPROVE, "Fix grammar" to EditorViewModel.PRESET_GRAMMAR, "Summarize" to EditorViewModel.PRESET_SUMMARIZE)
                    .forEach { (label, prompt) -> OutlinedButton(onClick = { viewModel.onAiPromptChanged(prompt) }) { Text(label) } }
            }
            OutlinedTextField(
                value = ai.prompt,
                onValueChange = viewModel::onAiPromptChanged,
                label = { Text("What should the AI do?") },
                modifier = Modifier.fillMaxWidth()
            )
            Button(onClick = viewModel::runAi, enabled = !ai.running && ai.prompt.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                if (ai.running) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("Ask")
            }
            ai.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            ai.result?.let { result ->
                Card(Modifier.fillMaxWidth()) { Text(result, Modifier.padding(12.dp)) }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = viewModel::applyAiResult) { Text(if (ai.scope == AiScope.SELECTION) "Replace selection" else "Insert") }
                    OutlinedButton(onClick = { clipboard.setText(AnnotatedString(result)) }) { Text("Copy") }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    ai.consentNeeded?.let { consent ->
        AlertDialog(
            onDismissRequest = { viewModel.answerConsent(false) },
            title = { Text("Send text to ${consent.providerLabel}?") },
            text = {
                Text(
                    buildString {
                        append("This text leaves your device and is processed by ${consent.providerLabel}.")
                        if (consent.containsPersonalData) append("\n\nIt appears to contain personal data (names, contact details or similar).")
                        append("\n\nChoose Aidos Engine in Settings to keep everything on this device.")
                    }
                )
            },
            confirmButton = { TextButton(onClick = { viewModel.answerConsent(true) }) { Text("Send") } },
            dismissButton = { TextButton(onClick = { viewModel.answerConsent(false) }) { Text("Cancel") } }
        )
    }
}
