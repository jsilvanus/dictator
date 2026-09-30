package com.dictator.android.ui.document

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.core.service.LocalDocumentStore
import io.github.aakira.napier.Napier
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

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

class DocumentViewModel constructor(
    private val store: LocalDocumentStore
) : ViewModel() {
    private val _state = MutableStateFlow(DocumentListUiState())
    val state: StateFlow<DocumentListUiState> = _state.asStateFlow()

    init {
        loadDocuments()
    }

    fun loadDocuments() {
        _state.value = _state.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            try {
                val uiDocuments = store.list().map { doc ->
                    Document(
                        id = doc.id,
                        title = doc.title,
                        folder = "Documents",
                        lastModified = doc.updatedAt,
                        // Nothing syncs yet: documents live on this device only.
                        isSynced = false
                    )
                }
                _state.value = _state.value.copy(documents = uiDocuments, isLoading = false, errorMessage = null)
            } catch (e: Exception) {
                Napier.e("Error loading documents", e)
                _state.value = _state.value.copy(isLoading = false, errorMessage = e.message ?: "Failed to load documents")
            }
        }
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
        _state.value = _state.value.copy(selectedDocument = document, showDetailDialog = true)
    }

    fun dismissDetailDialog() {
        _state.value = _state.value.copy(showDetailDialog = false)
    }

    fun deleteDocument(documentId: String) {
        _state.value = _state.value.copy(
            documents = _state.value.documents.filter { it.id != documentId },
            showDetailDialog = false
        )
        viewModelScope.launch {
            try {
                store.delete(documentId)
            } catch (e: Exception) {
                Napier.e("Error deleting document", e)
                _state.value = _state.value.copy(errorMessage = e.message ?: "Failed to delete document")
                loadDocuments()
            }
        }
    }

    fun archiveDocument(documentId: String) {
        // Archiving is not implemented; the dialog action just closes it.
        if (_state.value.selectedDocument?.id == documentId) {
            _state.value = _state.value.copy(showDetailDialog = false)
        }
    }

    /** Creates the document, then reports its id so the caller can open it. */
    fun createNewDocument(title: String, onCreated: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val doc = store.create(title)
                loadDocuments()
                onCreated(doc.id)
            } catch (e: Exception) {
                Napier.e("Error creating document", e)
                _state.value = _state.value.copy(errorMessage = e.message ?: "Failed to create document")
            }
        }
    }

    fun onRefresh() {
        loadDocuments()
    }
}
