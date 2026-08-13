package com.dictator.android.ui.sync

import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

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
