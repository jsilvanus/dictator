package com.dictator.android.ui.document

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.dictator.core.domain.entity.Document as DomainDocument
import com.dictator.core.domain.repository.DocumentRepository
import com.dictator.core.data.error.DataException
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.aakira.napier.Napier
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

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

@HiltViewModel
class DocumentViewModel @Inject constructor(
    private val documentRepository: DocumentRepository
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
                // Load documents from the actual DocumentService
                val domainDocuments = documentRepository.getAllDocuments()
                val uiDocuments = domainDocuments.map { doc ->
                    Document(
                        id = doc.id,
                        title = doc.title,
                        folder = "Documents",  // TODO: Get folder info from repository
                        lastModified = doc.updatedAt,
                        isSynced = true
                    )
                }
                _state.value = _state.value.copy(
                    documents = uiDocuments,
                    isLoading = false,
                    errorMessage = null
                )
            } catch (e: DataException) {
                Napier.e("Error loading documents", e)
                _state.value = _state.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "Failed to load documents"
                )
            } catch (e: Exception) {
                Napier.e("Unexpected error loading documents", e)
                _state.value = _state.value.copy(
                    isLoading = false,
                    errorMessage = e.message ?: "An unexpected error occurred"
                )
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
