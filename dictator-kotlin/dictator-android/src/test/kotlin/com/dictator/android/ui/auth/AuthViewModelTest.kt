package com.dictator.android.ui.auth

import com.dictator.core.data.error.DataException
import com.dictator.core.service.AuthService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {
    private class FakeAuth(var failure: Exception? = null) : AuthService {
        var lastLogin: Pair<String, String>? = null
        var lastSignup: Triple<String, String, String>? = null
        override suspend fun login(email: String, password: String): String { failure?.let { throw it }; lastLogin = email to password; return "jwt" }
        override suspend fun signup(email: String, name: String, password: String): String { failure?.let { throw it }; lastSignup = Triple(email, name, password); return "jwt" }
        override suspend fun logout() {}
        override suspend fun validateToken(token: String) = true
        override suspend fun refreshToken(token: String) = token
        override fun getCurrentUserId(): String? = null
    }

    private lateinit var auth: FakeAuth
    private lateinit var viewModel: AuthViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        auth = FakeAuth()
        viewModel = AuthViewModel(auth)
    }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun testInitialState() {
        val state = viewModel.state.value
        assertEquals("", state.email)
        assertEquals("", state.password)
        assertFalse(state.isSignUp)
        assertFalse(state.showPassword)
        assertFalse(state.termsAccepted)
    }

    @Test
    fun testPasswordStrengthCalculation() {
        viewModel.toggleMode()
        viewModel.onPasswordChanged("weak")
        assertEquals(PasswordStrength.WEAK, viewModel.state.value.passwordStrength)
        viewModel.onPasswordChanged("StrongPass123!")
        assertEquals(PasswordStrength.VERY_STRONG, viewModel.state.value.passwordStrength)
    }

    @Test
    fun testToggleMode() {
        viewModel.onEmailChanged("a@b.co")
        viewModel.toggleMode()
        assertTrue(viewModel.state.value.isSignUp)
        // Mode switch clears the name/confirm fields, not the email.
        assertEquals("", viewModel.state.value.name)
    }

    @Test
    fun testSubmitWithInvalidEmail() {
        viewModel.onEmailChanged("invalid-email")
        viewModel.onPasswordChanged("password123")
        viewModel.submit()
        assertTrue(viewModel.state.value.errorMessage!!.contains("valid email"))
        assertNull(auth.lastLogin)
    }

    @Test
    fun testSubmitWithShortPassword() {
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("short")
        viewModel.submit()
        assertTrue(viewModel.state.value.errorMessage!!.contains("8 characters"))
    }

    @Test
    fun testLoginCallsServiceAndReportsSuccess() {
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.submit()
        assertEquals("test@example.com" to "password123", auth.lastLogin)
        assertNotNull(viewModel.state.value.successMessage)
        assertFalse(viewModel.state.value.isLoading)
    }

    @Test
    fun testServerErrorIsShown() {
        auth.failure = DataException.NetworkError("Server unreachable")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.submit()
        assertEquals("Server unreachable", viewModel.state.value.errorMessage)
        assertNull(viewModel.state.value.successMessage)
    }

    @Test
    fun testSignupWithoutTermsAccepted() {
        viewModel.toggleMode()
        viewModel.onNameChanged("John Doe")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.onConfirmPasswordChanged("password123")
        viewModel.submit()
        assertTrue(viewModel.state.value.errorMessage!!.contains("Terms"))
    }

    @Test
    fun testSignupWithPasswordMismatch() {
        viewModel.toggleMode()
        viewModel.toggleTermsAcceptance()
        viewModel.onNameChanged("John Doe")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.onConfirmPasswordChanged("different")
        viewModel.submit()
        assertTrue(viewModel.state.value.errorMessage!!.contains("not match"))
    }

    @Test
    fun testSignupCallsService() {
        viewModel.toggleMode()
        viewModel.toggleTermsAcceptance()
        viewModel.onNameChanged("John Doe")
        viewModel.onEmailChanged("test@example.com")
        viewModel.onPasswordChanged("password123")
        viewModel.onConfirmPasswordChanged("password123")
        viewModel.submit()
        assertEquals(Triple("test@example.com", "John Doe", "password123"), auth.lastSignup)
        assertNotNull(viewModel.state.value.successMessage)
        assertNull(viewModel.state.value.errorMessage)
    }
}
