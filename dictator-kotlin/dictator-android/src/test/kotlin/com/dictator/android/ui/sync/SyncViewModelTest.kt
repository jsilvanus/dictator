package com.dictator.android.ui.sync

import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Comprehensive sync edge case tests for Android platform.
 * Tests various failure scenarios, conflict handling, and state management.
 * 
 * Based on web platform sync system analysis:
 * - Conflict detection and resolution
 * - Network failure recovery
 * - Partial sync handling
 * - Large document sync
 * - Pending changes management
 */
class SyncViewModelTest {
    private lateinit var viewModel: SyncViewModel

    @Before
    fun setup() {
        viewModel = SyncViewModel()
    }

    @Test
    fun testInitialState() {
        val state = viewModel.state.value
        assertEquals(SyncState.SYNCED, state.syncState)
        assertTrue(state.pendingChanges.isEmpty())
        assertEquals(1f, state.syncProgress)
    }

    @Test
    fun testSync() {
        viewModel.sync()
        val state = viewModel.state.value
        assertEquals(SyncState.SYNCING, state.syncState)
        assertEquals(0f, state.syncProgress)
    }

    @Test
    fun testAddPendingChange() {
        val change = SyncChange(
            id = "change1",
            documentId = "doc1",
            type = "modified"
        )
        viewModel.addPendingChange(change)
        
        val state = viewModel.state.value
        assertEquals(1, state.pendingChanges.size)
        assertEquals("change1", state.pendingChanges[0].id)
    }

    @Test
    fun testClearPendingChanges() {
        val change = SyncChange(
            id = "change1",
            documentId = "doc1",
            type = "modified"
        )
        viewModel.addPendingChange(change)
        assertTrue(viewModel.state.value.pendingChanges.isNotEmpty())
        
        viewModel.clearPendingChanges()
        assertTrue(viewModel.state.value.pendingChanges.isEmpty())
    }

    @Test
    fun testAddConflict() {
        viewModel.addConflict("doc1")
        assertTrue(viewModel.state.value.conflictedDocuments.contains("doc1"))
        
        // Adding same conflict twice should not duplicate
        viewModel.addConflict("doc1")
        assertEquals(1, viewModel.state.value.conflictedDocuments.size)
    }

    @Test
    fun testResolveConflict() {
        viewModel.addConflict("doc1")
        viewModel.addConflict("doc2")
        assertEquals(2, viewModel.state.value.conflictedDocuments.size)
        
        viewModel.resolveConflict("doc1")
        assertEquals(1, viewModel.state.value.conflictedDocuments.size)
        assertFalse(viewModel.state.value.conflictedDocuments.contains("doc1"))
        assertTrue(viewModel.state.value.conflictedDocuments.contains("doc2"))
    }

    // ===== EDGE CASE TESTS =====

    @Test
    fun testMultiplePendingChangesForSameDocument() {
        // Test that multiple changes for the same document are tracked
        val change1 = SyncChange(
            id = "change1",
            documentId = "doc1",
            type = "modified"
        )
        val change2 = SyncChange(
            id = "change2",
            documentId = "doc1",
            type = "modified"
        )
        
        viewModel.addPendingChange(change1)
        viewModel.addPendingChange(change2)
        
        val state = viewModel.state.value
        assertEquals(2, state.pendingChanges.size)
        assertTrue(state.pendingChanges.any { it.id == "change1" })
        assertTrue(state.pendingChanges.any { it.id == "change2" })
    }

    @Test
    fun testMultiplePendingChangesForDifferentDocuments() {
        // Test tracking changes across multiple documents
        val change1 = SyncChange(
            id = "change1",
            documentId = "doc1",
            type = "modified"
        )
        val change2 = SyncChange(
            id = "change2",
            documentId = "doc2",
            type = "created"
        )
        
        viewModel.addPendingChange(change1)
        viewModel.addPendingChange(change2)
        
        val state = viewModel.state.value
        assertEquals(2, state.pendingChanges.size)
    }

    @Test
    fun testConcurrentConflictsOnMultipleDocuments() {
        // Test handling conflicts on multiple documents simultaneously
        for (i in 1..5) {
            viewModel.addConflict("doc$i")
        }
        
        val state = viewModel.state.value
        assertEquals(5, state.conflictedDocuments.size)
    }

    @Test
    fun testResolveMultipleConflictsSequentially() {
        // Test resolving conflicts one by one
        val conflicts = listOf("doc1", "doc2", "doc3", "doc4", "doc5")
        conflicts.forEach { viewModel.addConflict(it) }
        
        assertEquals(5, viewModel.state.value.conflictedDocuments.size)
        
        for (i in 0..2) {
            viewModel.resolveConflict(conflicts[i])
        }
        
        assertEquals(2, viewModel.state.value.conflictedDocuments.size)
        assertFalse(viewModel.state.value.conflictedDocuments.contains("doc1"))
        assertTrue(viewModel.state.value.conflictedDocuments.contains("doc4"))
    }

    @Test
    fun testSyncProgressTracking() {
        // Test that sync progress is updated correctly
        viewModel.sync()
        var state = viewModel.state.value
        assertEquals(0f, state.syncProgress)
        
        // Simulate progress updates
        viewModel.updateSyncProgress(0.25f)
        state = viewModel.state.value
        assertEquals(0.25f, state.syncProgress)
        
        viewModel.updateSyncProgress(0.5f)
        state = viewModel.state.value
        assertEquals(0.5f, state.syncProgress)
        
        viewModel.updateSyncProgress(1.0f)
        state = viewModel.state.value
        assertEquals(1.0f, state.syncProgress)
    }

    @Test
    fun testSyncFailureTransition() {
        // Test that sync transitions to FAILED state on error
        viewModel.sync()
        assertEquals(SyncState.SYNCING, viewModel.state.value.syncState)
        
        viewModel.markSyncFailed("Network error")
        val state = viewModel.state.value
        assertEquals(SyncState.FAILED, state.syncState)
        assertTrue(state.errorMessage?.contains("Network error") ?: false)
    }

    @Test
    fun testSyncRetryAfterFailure() {
        // Test that sync can be retried after failure
        viewModel.sync()
        viewModel.markSyncFailed("Network error")
        assertEquals(SyncState.FAILED, viewModel.state.value.syncState)
        
        viewModel.sync()
        assertEquals(SyncState.SYNCING, viewModel.state.value.syncState)
    }

    @Test
    fun testLargePendingChangesList() {
        // Test handling a large number of pending changes
        for (i in 1..1000) {
            val change = SyncChange(
                id = "change$i",
                documentId = "doc${i % 10}",
                type = "modified"
            )
            viewModel.addPendingChange(change)
        }
        
        val state = viewModel.state.value
        assertEquals(1000, state.pendingChanges.size)
    }

    @Test
    fun testPartialSyncCompletion() {
        // Test handling partial sync where some docs sync successfully and others fail
        viewModel.addPendingChange(SyncChange("change1", "doc1", "modified"))
        viewModel.addPendingChange(SyncChange("change2", "doc2", "modified"))
        viewModel.addPendingChange(SyncChange("change3", "doc3", "created"))
        
        assertEquals(3, viewModel.state.value.pendingChanges.size)
        
        // Simulate partial completion - only 2 changes synced
        viewModel.removePendingChange("change1")
        viewModel.removePendingChange("change2")
        
        val state = viewModel.state.value
        assertEquals(1, state.pendingChanges.size)
        assertEquals("change3", state.pendingChanges[0].id)
    }

    @Test
    fun testConflictDuringPendingSync() {
        // Test conflict detection when changes are pending
        viewModel.addPendingChange(SyncChange("change1", "doc1", "modified"))
        viewModel.addConflict("doc1")
        
        val state = viewModel.state.value
        assertTrue(state.pendingChanges.any { it.documentId == "doc1" })
        assertTrue(state.conflictedDocuments.contains("doc1"))
    }

    @Test
    fun testClearAllState() {
        // Test complete state reset
        viewModel.addPendingChange(SyncChange("change1", "doc1", "modified"))
        viewModel.addConflict("doc1")
        viewModel.sync()
        
        var state = viewModel.state.value
        assertTrue(state.pendingChanges.isNotEmpty())
        assertTrue(state.conflictedDocuments.isNotEmpty())
        
        viewModel.clearAllState()
        state = viewModel.state.value
        assertTrue(state.pendingChanges.isEmpty())
        assertTrue(state.conflictedDocuments.isEmpty())
        assertEquals(SyncState.SYNCED, state.syncState)
    }

    @Test
    fun testNetworkOfflineThenOnline() {
        // Test sync state when going offline then online
        viewModel.markNetworkOffline()
        assertEquals(SyncState.OFFLINE, viewModel.state.value.syncState)
        
        viewModel.addPendingChange(SyncChange("change1", "doc1", "modified"))
        assertEquals(1, viewModel.state.value.pendingChanges.size)
        
        viewModel.markNetworkOnline()
        assertEquals(1, viewModel.state.value.pendingChanges.size)
    }

    @Test
    fun testDeletedDocumentHandling() {
        // Test handling sync for deleted documents
        val deleteChange = SyncChange("change1", "doc1", "deleted")
        viewModel.addPendingChange(deleteChange)
        
        val state = viewModel.state.value
        assertTrue(state.pendingChanges.any { it.type == "deleted" })
    }

    @Test
    fun testConflictResolutionStrategy() {
        // Test that conflict resolution is tracked
        viewModel.addConflict("doc1")
        viewModel.resolveConflictWithStrategy("doc1", "keep_local")
        
        val state = viewModel.state.value
        assertFalse(state.conflictedDocuments.contains("doc1"))
    }

    @Test
    fun testSyncStateTransitions() {
        // Test valid state transitions
        assertEquals(SyncState.SYNCED, viewModel.state.value.syncState)
        
        viewModel.sync()
        assertEquals(SyncState.SYNCING, viewModel.state.value.syncState)
        
        viewModel.markSyncComplete()
        assertEquals(SyncState.SYNCED, viewModel.state.value.syncState)
    }

    @Test
    fun testEmptyOperations() {
        // Test that empty operations don't crash
        viewModel.clearPendingChanges()  // Already empty
        assertTrue(viewModel.state.value.pendingChanges.isEmpty())
        
        viewModel.resolveConflict("nonexistent")  // Try to resolve non-existent conflict
        assertTrue(viewModel.state.value.conflictedDocuments.isEmpty())
    }

    @Test
    fun testLastSyncTimestamp() {
        // Test that last sync timestamp is tracked
        val beforeSync = System.currentTimeMillis()
        viewModel.sync()
        viewModel.markSyncComplete()
        val afterSync = System.currentTimeMillis()
        
        val lastSync = viewModel.state.value.lastSyncTime
        assertTrue(lastSync >= beforeSync && lastSync <= afterSync)
    }
}
    @Test
    fun testGetPendingChangesSummary() {
        val summary1 = viewModel.getPendingChangesSummary()
        assertTrue(summary1.contains("No pending changes"))
        
        val change = SyncChange("c1", "doc1", "modified")
        viewModel.addPendingChange(change)
        val summary2 = viewModel.getPendingChangesSummary()
        assertTrue(summary2.contains("1"))
    }

    @Test
    fun testGetLastSyncText() {
        val text = viewModel.getLastSyncText()
        assertTrue(text.contains("ago") || text.contains("Just"))
    }

    @Test
    fun testRetry() {
        viewModel.sync()
        assertEquals(SyncState.SYNCING, viewModel.state.value.syncState)
        viewModel.retry()
        assertEquals(SyncState.SYNCING, viewModel.state.value.syncState)
    }
}
