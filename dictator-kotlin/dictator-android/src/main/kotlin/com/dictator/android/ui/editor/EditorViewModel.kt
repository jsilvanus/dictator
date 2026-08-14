package com.dictator.android.ui.editor

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.max

enum class SyncStatus {
    SYNCED, SYNCING, ERROR, UNSAVED
}

data class EditorUiState(
    val documentId: String = "",
    val title: String = "",
    val content: String = "",
    val wordCount: Int = 0,
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val lastSyncTime: Long = System.currentTimeMillis(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val canUndo: Boolean = false,
    val canRedo: Boolean = false,
    val undoStack: List<String> = emptyList(),
    val redoStack: List<String> = emptyList()
)

class EditorViewModel : ViewModel() {
    private val _state = MutableStateFlow(EditorUiState())
    val state: StateFlow<EditorUiState> = _state.asStateFlow()

    private var autoSaveTimer: Long = 0
    private val AUTO_SAVE_DELAY = 2000L // 2 seconds

    fun loadDocument(documentId: String) {
        _state.value = _state.value.copy(isLoading = true)
        // In real implementation, load from DocumentService
        _state.value = _state.value.copy(
            documentId = documentId,
            title = "Document $documentId",
            content = "Start typing here...",
            isLoading = false,
            syncStatus = SyncStatus.SYNCED
        )
    }

    fun onTitleChanged(newTitle: String) {
        _state.value = _state.value.copy(title = newTitle, syncStatus = SyncStatus.UNSAVED)
        scheduleAutoSave()
    }

    fun onContentChanged(newContent: String) {
        val current = _state.value
        val wordCount = calculateWordCount(newContent)

        // Add current content to undo stack
        val newUndoStack = (current.undoStack + current.content).takeLast(50)

        _state.value = current.copy(
            content = newContent,
            wordCount = wordCount,
            syncStatus = SyncStatus.UNSAVED,
            undoStack = newUndoStack,
            redoStack = emptyList(),
            canUndo = newUndoStack.isNotEmpty(),
            canRedo = false
        )
        scheduleAutoSave()
    }

    fun undo() {
        val current = _state.value
        if (current.undoStack.isNotEmpty()) {
            val newUndoStack = current.undoStack.dropLast(1)
            val previousContent = if (newUndoStack.isNotEmpty())
                newUndoStack.last()
            else
                ""

            val newRedoStack = (current.redoStack + current.content).takeLast(50)

            _state.value = current.copy(
                content = previousContent,
                wordCount = calculateWordCount(previousContent),
                undoStack = newUndoStack,
                redoStack = newRedoStack,
                canUndo = newUndoStack.isNotEmpty(),
                canRedo = true,
                syncStatus = SyncStatus.UNSAVED
            )
        }
    }

    fun redo() {
        val current = _state.value
        if (current.redoStack.isNotEmpty()) {
            val nextContent = current.redoStack.last()
            val newRedoStack = current.redoStack.dropLast(1)
            val newUndoStack = (current.undoStack + current.content).takeLast(50)

            _state.value = current.copy(
                content = nextContent,
                wordCount = calculateWordCount(nextContent),
                undoStack = newUndoStack,
                redoStack = newRedoStack,
                canUndo = true,
                canRedo = newRedoStack.isNotEmpty(),
                syncStatus = SyncStatus.UNSAVED
            )
        }
    }

    fun insertText(text: String, atPosition: Int = -1) {
        val current = _state.value
        val newContent = if (atPosition >= 0) {
            current.content.substring(0, atPosition) + text + current.content.substring(atPosition)
        } else {
            current.content + text
        }
        onContentChanged(newContent)
    }

    fun formatBold(start: Int, end: Int) {
        val current = _state.value
        val selectedText = current.content.substring(start, end)
        val formatted = "**$selectedText**"
        val newContent = current.content.substring(0, start) + formatted + current.content.substring(end)
        onContentChanged(newContent)
    }

    fun formatItalic(start: Int, end: Int) {
        val current = _state.value
        val selectedText = current.content.substring(start, end)
        val formatted = "*$selectedText*"
        val newContent = current.content.substring(0, start) + formatted + current.content.substring(end)
        onContentChanged(newContent)
    }

    fun save() {
        val current = _state.value
        _state.value = current.copy(syncStatus = SyncStatus.SYNCING)
        // In real implementation, call DocumentService.save()
        _state.value = current.copy(
            syncStatus = SyncStatus.SYNCED,
            lastSyncTime = System.currentTimeMillis()
        )
    }

    private fun scheduleAutoSave() {
        autoSaveTimer = System.currentTimeMillis()
        // In real implementation, this would cancel previous timer and schedule new one
    }

    private fun calculateWordCount(text: String): Int {
        return text.trim().split("\\s+".toRegex()).filter { it.isNotEmpty() }.size
    }

    fun getSyncStatusText(): String {
        return when (_state.value.syncStatus) {
            SyncStatus.SYNCED -> "Saved"
            SyncStatus.SYNCING -> "Saving..."
            SyncStatus.UNSAVED -> "Unsaved changes"
            SyncStatus.ERROR -> "Sync error"
        }
    }

    fun getFormattedLastSync(): String {
        val diff = System.currentTimeMillis() - _state.value.lastSyncTime
        return when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000}m ago"
            else -> "${diff / 3600000}h ago"
        }
    }
}
