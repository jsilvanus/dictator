package com.dictator.android.ui.share

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class SharedUser(
    val id: String,
    val email: String,
    val name: String = "",
    val permission: SharePermission = SharePermission.VIEW
)

enum class SharePermission {
    VIEW, EDIT, COMMENT
}

data class ShareUiState(
    val documentId: String = "",
    val sharedUsers: List<SharedUser> = emptyList(),
    val userInput: String = "",
    val selectedPermission: SharePermission = SharePermission.VIEW,
    val isPublic: Boolean = false,
    val publicLink: String = "",
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class ShareViewModel : ViewModel() {
    private val _state = MutableStateFlow(ShareUiState())
    val state: StateFlow<ShareUiState> = _state.asStateFlow()

    fun setDocument(documentId: String) {
        _state.value = _state.value.copy(documentId = documentId)
        loadShares()
    }

    fun onUserInputChanged(input: String) {
        _state.value = _state.value.copy(userInput = input)
    }

    fun onPermissionChanged(permission: SharePermission) {
        _state.value = _state.value.copy(selectedPermission = permission)
    }

    fun addUser(email: String) {
        if (email.isBlank()) return

        val current = _state.value
        val newUser = SharedUser(
            id = System.currentTimeMillis().toString(),
            email = email,
            permission = current.selectedPermission
        )

        _state.value = current.copy(
            sharedUsers = current.sharedUsers + newUser,
            userInput = "",
            successMessage = "User shared successfully"
        )
    }

    fun removeUser(userId: String) {
        val current = _state.value
        _state.value = current.copy(
            sharedUsers = current.sharedUsers.filter { it.id != userId }
        )
    }

    fun updatePermission(userId: String, permission: SharePermission) {
        val current = _state.value
        val updated = current.sharedUsers.map {
            if (it.id == userId) it.copy(permission = permission) else it
        }
        _state.value = current.copy(sharedUsers = updated)
    }

    fun togglePublic() {
        val current = _state.value
        _state.value = current.copy(
            isPublic = !current.isPublic,
            publicLink = if (!current.isPublic) generatePublicLink() else ""
        )
    }

    fun copyPublicLink(): String {
        return _state.value.publicLink
    }

    private fun generatePublicLink(): String {
        return "https://dictator.app/share/${_state.value.documentId}/${System.currentTimeMillis()}"
    }

    private fun loadShares() {
        // In real implementation, load from ShareService
        _state.value = _state.value.copy(
            sharedUsers = emptyList()
        )
    }
}
