package com.dictator.android.ui.document

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class Document(
    val id: String,
    val title: String,
    val content: String = "",
    val wordCount: Int = 0,
    val folder: String = "Documents",
    val lastModified: Long = System.currentTimeMillis(),
    val isSynced: Boolean = true
)

data class DocumentListUiState(
    val documents: List<Document> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val selectedDocument: Document? = null,
    val showDetailDialog: Boolean = false
)

class DocumentViewModel : ViewModel() {
    private val _state = MutableStateFlow(DocumentListUiState())
    val state: StateFlow<DocumentListUiState> = _state.asStateFlow()

    init {
        loadDocuments()
    }

    fun loadDocuments() {
        _state.value = _state.value.copy(isLoading = true)
        // Simulate loading documents from the core service
        // In real implementation, this would call the DocumentService
        val sampleDocuments = listOf(
            Document(
                id = "1",
                title = "Welcome to Dictator",
                wordCount = 1250,
                folder = "Getting Started"
            ),
            Document(
                id = "2",
                title = "Writing Tips",
                wordCount = 2890,
                folder = "Documents"
            ),
            Document(
                id = "3",
                title = "Project Notes",
                wordCount = 456,
                folder = "Projects",
                lastModified = System.currentTimeMillis() - 3600000
            )
        )
        _state.value = _state.value.copy(
            documents = sampleDocuments,
            isLoading = false
        )
    }

    fun onSearchQueryChanged(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
    }

    fun getFilteredDocuments(): List<Document> {
        val current = _state.value
        return if (current.searchQuery.isBlank()) {
            current.documents
        } else {
            current.documents.filter {
                it.title.contains(current.searchQuery, ignoreCase = true) ||
                it.folder.contains(current.searchQuery, ignoreCase = true)
            }
        }
    }

    fun selectDocument(document: Document) {
        _state.value = _state.value.copy(
            selectedDocument = document,
            showDetailDialog = true
        )
    }

    fun dismissDetailDialog() {
        _state.value = _state.value.copy(showDetailDialog = false)
    }

    fun deleteDocument(documentId: String) {
        val updated = _state.value.documents.filter { it.id != documentId }
        _state.value = _state.value.copy(documents = updated, showDetailDialog = false)
    }

    fun archiveDocument(documentId: String) {
        val current = _state.value.selectedDocument
        if (current?.id == documentId) {
            _state.value = _state.value.copy(showDetailDialog = false)
        }
    }

    fun createNewDocument(title: String): String {
        val newId = System.currentTimeMillis().toString()
        val newDocument = Document(
            id = newId,
            title = title,
            folder = "Documents"
        )
        _state.value = _state.value.copy(
            documents = _state.value.documents + newDocument
        )
        return newId
    }

    fun onRefresh() {
        loadDocuments()
    }
}
