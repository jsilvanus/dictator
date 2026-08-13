package com.dictator.android.ui.auth

import androidx.lifecycle.ViewModel
import com.dictator.core.util.validation.Validators
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * ViewModel for authentication screens.
 * Manages login/signup form state with validation and password strength checking.
 */
class AuthViewModel : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun onEmailChanged(email: String) {
        _state.value = _state.value.copy(email = email, errorMessage = null)
    }

    fun onPasswordChanged(password: String) {
        val current = _state.value
        val strength = if (current.isSignUp) calculatePasswordStrength(password) else PasswordStrength.NONE
        _state.value = current.copy(
            password = password,
            passwordStrength = strength,
            errorMessage = null
        )
    }

    fun onNameChanged(name: String) {
        _state.value = _state.value.copy(name = name, errorMessage = null)
    }

    fun onConfirmPasswordChanged(confirmPassword: String) {
        _state.value = _state.value.copy(confirmPassword = confirmPassword, errorMessage = null)
    }

    fun togglePasswordVisibility() {
        _state.value = _state.value.copy(showPassword = !_state.value.showPassword)
    }

    fun toggleTermsAcceptance() {
        _state.value = _state.value.copy(termsAccepted = !_state.value.termsAccepted)
    }

    fun toggleMode() {
        _state.value = _state.value.copy(
            isSignUp = !_state.value.isSignUp,
            errorMessage = null,
            successMessage = null,
            showPassword = false,
            passwordStrength = PasswordStrength.NONE,
            termsAccepted = false,
            name = "",
            confirmPassword = ""
        )
    }

    fun submit() {
        val current = _state.value
        
        // Validation checks
        when {
            current.email.isBlank() -> {
                _state.value = current.copy(errorMessage = "Email cannot be empty")
                return
            }
            !Validators.isValidEmail(current.email) -> {
                _state.value = current.copy(errorMessage = "Please enter a valid email address")
                return
            }
            current.password.isBlank() -> {
                _state.value = current.copy(errorMessage = "Password cannot be empty")
                return
            }
            current.password.length < 8 -> {
                _state.value = current.copy(errorMessage = "Password must be at least 8 characters")
                return
            }
            current.isSignUp && current.name.isBlank() -> {
                _state.value = current.copy(errorMessage = "Please enter your name")
                return
            }
            current.isSignUp && current.confirmPassword != current.password -> {
                _state.value = current.copy(errorMessage = "Passwords do not match")
                return
            }
            current.isSignUp && !current.termsAccepted -> {
                _state.value = current.copy(errorMessage = "Please accept the Terms of Service")
                return
            }
        }

        // All validations passed
        _state.value = current.copy(
            isLoading = true,
            errorMessage = null
        )

        // Simulate API call delay
        // In real implementation, this would call the AuthService
        _state.value = current.copy(
            isLoading = false,
            successMessage = if (current.isSignUp) 
                "Account created successfully!" 
            else 
                "Logged in successfully!",
            errorMessage = null
        )
    }

    private fun calculatePasswordStrength(password: String): PasswordStrength {
        var strength = 0
        
        if (password.length >= 8) strength++
        if (password.length >= 12) strength++
        if (password.any { it.isUpperCase() }) strength++
        if (password.any { it.isDigit() }) strength++
        if (password.any { !it.isLetterOrDigit() }) strength++
        
        return when {
            strength <= 1 -> PasswordStrength.WEAK
            strength == 2 -> PasswordStrength.MEDIUM
            strength == 3 || strength == 4 -> PasswordStrength.STRONG
            else -> PasswordStrength.VERY_STRONG
        }
    }
}

enum class PasswordStrength {
    NONE, WEAK, MEDIUM, STRONG, VERY_STRONG
}

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val name: String = "",
    val confirmPassword: String = "",
    val isSignUp: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val showPassword: Boolean = false,
    val passwordStrength: PasswordStrength = PasswordStrength.NONE,
    val termsAccepted: Boolean = false,
    val isLoading: Boolean = false
)
