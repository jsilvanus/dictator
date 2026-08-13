package com.dictator.android.ui.editor

import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

class EditorViewModelTest {
    private lateinit var viewModel: EditorViewModel

    @Before
    fun setup() {
        viewModel = EditorViewModel()
    }

    @Test
    fun testInitialState() {
        val state = viewModel.state.value
        assertEquals("", state.documentId)
        assertEquals("", state.title)
        assertEquals(SyncStatus.SYNCED, state.syncStatus)
        assertFalse(state.canUndo)
        assertFalse(state.canRedo)
    }

    @Test
    fun testLoadDocument() {
        viewModel.loadDocument("doc123")
        val state = viewModel.state.value
        assertEquals("doc123", state.documentId)
        assertTrue(state.title.contains("doc123"))
        assertEquals(SyncStatus.SYNCED, state.syncStatus)
    }

    @Test
    fun testOnTitleChanged() {
        viewModel.onTitleChanged("New Title")
        val state = viewModel.state.value
        assertEquals("New Title", state.title)
        assertEquals(SyncStatus.UNSAVED, state.syncStatus)
    }

    @Test
    fun testOnContentChanged() {
        viewModel.onContentChanged("Hello World")
        val state = viewModel.state.value
        assertEquals("Hello World", state.content)
        assertEquals(3, state.wordCount)
        assertEquals(SyncStatus.UNSAVED, state.syncStatus)
        assertTrue(state.canUndo)
    }

    @Test
    fun testWordCountCalculation() {
        viewModel.onContentChanged("One Two Three")
        assertEquals(3, viewModel.state.value.wordCount)
        
        viewModel.onContentChanged("Single")
        assertEquals(1, viewModel.state.value.wordCount)
        
        viewModel.onContentChanged("  Multiple   Spaces  ")
        assertEquals(2, viewModel.state.value.wordCount)
    }

    @Test
    fun testUndo() {
        viewModel.onContentChanged("First content")
        viewModel.onContentChanged("Second content")
        assertTrue(viewModel.state.value.canUndo)
        
        viewModel.undo()
        assertEquals("First content", viewModel.state.value.content)
        assertTrue(viewModel.state.value.canRedo)
    }

    @Test
    fun testRedo() {
        viewModel.onContentChanged("First content")
        viewModel.onContentChanged("Second content")
        viewModel.undo()
        
        viewModel.redo()
        assertEquals("Second content", viewModel.state.value.content)
        assertTrue(viewModel.state.value.canUndo)
    }

    @Test
    fun testMultipleUndoRedo() {
        viewModel.onContentChanged("Text 1")
        viewModel.onContentChanged("Text 2")
        viewModel.onContentChanged("Text 3")
        
        viewModel.undo()
        assertEquals("Text 2", viewModel.state.value.content)
        viewModel.undo()
        assertEquals("Text 1", viewModel.state.value.content)
        viewModel.undo()
        assertEquals("", viewModel.state.value.content)
        
        viewModel.redo()
        assertEquals("Text 1", viewModel.state.value.content)
        viewModel.redo()
        assertEquals("Text 2", viewModel.state.value.content)
    }

    @Test
    fun testUndoStackLimit() {
        // Add more than 50 items
        repeat(55) { i ->
            viewModel.onContentChanged("Text $i")
        }
        
        // Should only keep last 50
        assertTrue(viewModel.state.value.undoStack.size <= 50)
    }

    @Test
    fun testInsertText() {
        viewModel.onContentChanged("Hello World")
        viewModel.insertText(" Beautiful", 5)
        assertTrue(viewModel.state.value.content.contains("Beautiful"))
    }

    @Test
    fun testSave() {
        viewModel.onContentChanged("Content to save")
        assertEquals(SyncStatus.UNSAVED, viewModel.state.value.syncStatus)
        
        viewModel.save()
        assertEquals(SyncStatus.SYNCED, viewModel.state.value.syncStatus)
    }

    @Test
    fun testGetSyncStatusText() {
        assertEquals("Saved", viewModel.getSyncStatusText())
        
        viewModel.onContentChanged("Unsaved content")
        assertEquals("Unsaved changes", viewModel.getSyncStatusText())
    }

    @Test
    fun testFormattedLastSync() {
        val text = viewModel.getFormattedLastSync()
        assertTrue(text.contains("ago") || text.contains("Just"))
    }
}
