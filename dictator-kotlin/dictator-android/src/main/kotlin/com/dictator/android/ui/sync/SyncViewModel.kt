package com.dictator.android.ui.sync

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class SyncState {
    SYNCED, SYNCING, ERROR, OFFLINE
}

data class SyncChange(
    val id: String,
    val documentId: String,
    val type: String, // "modified", "deleted", "created"
    val timestamp: Long = System.currentTimeMillis()
)

data class SyncStatusUiState(
    val syncState: SyncState = SyncState.SYNCED,
    val lastSyncTime: Long = System.currentTimeMillis(),
    val pendingChanges: List<SyncChange> = emptyList(),
    val errorMessage: String? = null,
    val syncProgress: Float = 1f, // 0 to 1
    val conflictedDocuments: List<String> = emptyList()
)

class SyncViewModel : ViewModel() {
    private val _state = MutableStateFlow(SyncStatusUiState())
    val state: StateFlow<SyncStatusUiState> = _state.asStateFlow()

    fun sync() {
        _state.value = _state.value.copy(
            syncState = SyncState.SYNCING,
            syncProgress = 0f,
            errorMessage = null
        )

        // Simulate syncing
        simulateSync()
    }

    fun retry() {
        sync()
    }

    fun getPendingChangesSummary(): String {
        val current = _state.value
        return if (current.pendingChanges.isEmpty()) {
            "No pending changes"
        } else {
            "${current.pendingChanges.size} pending changes"
        }
    }

    fun getLastSyncText(): String {
        val diff = System.currentTimeMillis() - _state.value.lastSyncTime
        return when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000}m ago"
            diff < 86400000 -> "${diff / 3600000}h ago"
            else -> "${diff / 86400000}d ago"
        }
    }

    private fun simulateSync() {
        // In real implementation, would sync with server
        _state.value = _state.value.copy(
            syncState = SyncState.SYNCED,
            lastSyncTime = System.currentTimeMillis(),
            pendingChanges = emptyList(),
            syncProgress = 1f,
            errorMessage = null
        )
    }

    fun addPendingChange(change: SyncChange) {
        val current = _state.value
        val updated = current.pendingChanges + change
        _state.value = current.copy(
            pendingChanges = updated,
            syncState = SyncState.SYNCING
        )
    }

    fun clearPendingChanges() {
        _state.value = _state.value.copy(pendingChanges = emptyList())
    }

    fun addConflict(documentId: String) {
        val current = _state.value
        if (!current.conflictedDocuments.contains(documentId)) {
            _state.value = current.copy(
                conflictedDocuments = current.conflictedDocuments + documentId
            )
        }
    }

    fun resolveConflict(documentId: String) {
        val current = _state.value
        _state.value = current.copy(
            conflictedDocuments = current.conflictedDocuments.filter { it != documentId }
        )
    }
}
