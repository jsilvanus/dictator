package com.dictator.android.ui.auth

import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

class AuthViewModelTest {
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setup() {
        viewModel = AuthViewModel()
    }

    @Test
    fun testInitialState() {
        val state = viewModel.state.value
        assertEquals("", state.email)
        assertEquals("", state.password)
        assertEquals(false, state.isSignUp)
        assertEquals(false, state.showPassword)
        assertEquals(false, state.termsAccepted)
    }

    @Test
    fun testOnEmailChanged() {
        viewModel.onEmailChanged("test@example.com")
        assertEquals("test@example.com", viewModel.state.value.email)
        assertNull(viewModel.state.value.errorMessage)
    }

    @Test
    fun testOnPasswordChanged() {
        viewModel.onPasswordChanged("password123")
        assertEquals("password123", viewModel.state.value.password)
    }

    @Test
    fun testPasswordStrengthCalculation() = runTest {
        viewModel.onPasswordChanged("weak")
        val state1 = viewModel.state.value
        // Too short, should be WEAK
        
        viewModel.onPasswordChanged("Medium1!")
        val state2 = viewModel.state.value
        assertEquals(PasswordStrength.MEDIUM, state2.passwordStrength)
        
        viewModel.onPasswordChanged("StrongPass123!")
        val state3 = viewModel.state.value
        assertEquals(PasswordStrength.STRONG, state3.passwordStrength)
    }

    @Test
    fun testTogglePasswordVisibility() {
        assertFalse(viewModel.state.value.showPassword)
        viewModel.togglePasswordVisibility()
        assertTrue(viewModel.state.value.showPassword)
        viewModel.togglePasswordVisibility()
        assertFalse(viewModel.state.value.showPassword)
    }

    @Test
    fun testToggleMode() {
        assertFalse(viewModel.state.value.isSignUp)
        viewModel.toggleMode()
        assertTrue(viewModel.state.value.isSignUp)
        assertEquals("", viewModel.state.value.email) // Should be cleared
    }

    @Test
    fun testSubmitWithInvalidEmail() {
        viewModel.onEmailChanged("invalid-email")
        viewModel.onPasswordChanged("password123")
        viewModel.submit()
        assertNotNull(viewModel.state.value.errorMessage)
        assertTrue(viewModel.state.value.errorMessage!!.contains("valid email"))
    }

    @Test
    fun testSubmitWithShortPassword() {
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("short")
        viewModel.submit()
        assertNotNull(viewModel.state.value.errorMessage)
        assertTrue(viewModel.state.value.errorMessage!!.contains("8 characters"))
    }

    @Test
    fun testLoginValidation() {
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.submit()
        // Should be successful
        assertNotNull(viewModel.state.value.successMessage)
    }

    @Test
    fun testSignupWithoutTermsAccepted() {
        viewModel.toggleMode() // Switch to signup
        viewModel.onNameChanged("John Doe")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.onConfirmPasswordChanged("password123")
        viewModel.submit()
        assertNotNull(viewModel.state.value.errorMessage)
        assertTrue(viewModel.state.value.errorMessage!!.contains("Terms"))
    }

    @Test
    fun testSignupWithPasswordMismatch() {
        viewModel.toggleMode() // Switch to signup
        viewModel.toggleTermsAcceptance()
        viewModel.onNameChanged("John Doe")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.onConfirmPasswordChanged("different")
        viewModel.submit()
        assertNotNull(viewModel.state.value.errorMessage)
        assertTrue(viewModel.state.value.errorMessage!!.contains("not match"))
    }

    @Test
    fun testSignupValidation() {
        viewModel.toggleMode() // Switch to signup
        viewModel.toggleTermsAcceptance()
        viewModel.onNameChanged("John Doe")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.onConfirmPasswordChanged("password123")
        viewModel.submit()
        assertNotNull(viewModel.state.value.successMessage)
        assertEquals(null, viewModel.state.value.errorMessage)
    }

    @Test
    fun testLoadingState() {
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.submit()
        assertTrue(viewModel.state.value.isLoading)
    }
}
