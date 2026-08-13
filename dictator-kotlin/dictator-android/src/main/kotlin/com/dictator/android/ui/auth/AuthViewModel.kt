package com.dictator.android.ui.auth

import androidx.lifecycle.ViewModel
import com.dictator.core.util.validation.Validators
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * ViewModel for authentication screens.
 * Keeps the form state and validates the user input locally.
 */
class AuthViewModel : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun onEmailChanged(email: String) {
        _state.value = _state.value.copy(email = email)
    }

    fun onPasswordChanged(password: String) {
        _state.value = _state.value.copy(password = password)
    }

    fun onNameChanged(name: String) {
        _state.value = _state.value.copy(name = name)
    }

    fun onConfirmPasswordChanged(confirmPassword: String) {
        _state.value = _state.value.copy(confirmPassword = confirmPassword)
    }

    fun toggleMode() {
        _state.value = _state.value.copy(
            isSignUp = !_state.value.isSignUp,
            errorMessage = null,
            successMessage = null
        )
    }

    fun submit() {
        val current = _state.value
        when {
            current.email.isBlank() || !Validators.isValidEmail(current.email) -> {
                _state.value = current.copy(errorMessage = "Please enter a valid email address")
            }
            current.password.length < 8 -> {
                _state.value = current.copy(errorMessage = "Password must be at least 8 characters")
            }
            current.isSignUp && current.name.isBlank() -> {
                _state.value = current.copy(errorMessage = "Please enter your name")
            }
            current.isSignUp && current.confirmPassword != current.password -> {
                _state.value = current.copy(errorMessage = "Passwords do not match")
            }
            else -> {
                _state.value = current.copy(
                    errorMessage = null,
                    successMessage = if (current.isSignUp) "Account ready — your sign-up flow is wired up." else "Welcome back — your login flow is wired up."
                )
            }
        }
    }
}

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val name: String = "",
    val confirmPassword: String = "",
    val isSignUp: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null
)
