package com.dictator.android.ui.document

import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

class DocumentViewModelTest {
    private lateinit var viewModel: DocumentViewModel

    @Before
    fun setup() {
        viewModel = DocumentViewModel()
    }

    @Test
    fun testInitialState() {
        val state = viewModel.state.value
        assertTrue(state.documents.isNotEmpty())
        assertEquals("", state.searchQuery)
        assertFalse(state.isLoading)
    }

    @Test
    fun testLoadDocuments() {
        val state = viewModel.state.value
        assertTrue(state.documents.isNotEmpty())
        assertTrue(state.documents.any { it.title.contains("Welcome") })
    }

    @Test
    fun testSearchDocuments() {
        viewModel.onSearchQueryChanged("Writing")
        val filtered = viewModel.getFilteredDocuments()
        assertTrue(filtered.any { it.title.contains("Writing") })
    }

    @Test
    fun testSearchEmpty() {
        viewModel.onSearchQueryChanged("NonExistent")
        val filtered = viewModel.getFilteredDocuments()
        assertTrue(filtered.isEmpty())
    }

    @Test
    fun testCreateNewDocument() {
        val initialCount = viewModel.state.value.documents.size
        val newId = viewModel.createNewDocument("New Doc")
        val updatedCount = viewModel.state.value.documents.size
        assertEquals(initialCount + 1, updatedCount)
    }

    @Test
    fun testSelectDocument() {
        val doc = viewModel.state.value.documents.first()
        viewModel.selectDocument(doc)
        val state = viewModel.state.value
        assertEquals(doc.id, state.selectedDocument?.id)
        assertTrue(state.showDetailDialog)
    }

    @Test
    fun testDismissDetailDialog() {
        val doc = viewModel.state.value.documents.first()
        viewModel.selectDocument(doc)
        assertTrue(viewModel.state.value.showDetailDialog)
        viewModel.dismissDetailDialog()
        assertFalse(viewModel.state.value.showDetailDialog)
    }

    @Test
    fun testDeleteDocument() {
        val doc = viewModel.state.value.documents.first()
        val initialCount = viewModel.state.value.documents.size
        viewModel.deleteDocument(doc.id)
        val updatedCount = viewModel.state.value.documents.size
        assertEquals(initialCount - 1, updatedCount)
    }

    @Test
    fun testGetFilteredDocuments() {
        val allDocs = viewModel.getFilteredDocuments()
        assertTrue(allDocs.isNotEmpty())
        
        viewModel.onSearchQueryChanged("Writing")
        val filtered = viewModel.getFilteredDocuments()
        assertTrue(filtered.all { it.title.contains("Writing") || it.folder.contains("Writing") })
    }

    @Test
    fun testCaseSensitiveSearch() {
        viewModel.onSearchQueryChanged("WELCOME")
        val filtered = viewModel.getFilteredDocuments()
        assertTrue(filtered.any { it.title.contains("Welcome") })
    }

    @Test
    fun testRefresh() {
        val initialDocs = viewModel.state.value.documents
        viewModel.onRefresh()
        val refreshedDocs = viewModel.state.value.documents
        assertEquals(initialDocs.size, refreshedDocs.size)
    }
}
