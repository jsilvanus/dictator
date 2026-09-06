package com.dictator.android.ui.settings

import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.service.SharedPreferences
import io.ktor.client.HttpClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.mock
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SettingsViewModelTest {
    private lateinit var viewModel: SettingsViewModel
    private lateinit var mockSharedPreferences: MockSharedPreferences

    @OptIn(ExperimentalCoroutinesApi::class)
    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        mockSharedPreferences = MockSharedPreferences()
        viewModel = SettingsViewModel(mockSharedPreferences, mock<HttpClient>())
    }

    @Test
    fun `initial state should use default values`() = runTest {
        val state = viewModel.state.first()
        assertEquals(SettingsMode.DictatorService, state.mode)
        assertEquals("https://ai.dictator.dev", state.dictatorServiceUrl)
        assertEquals(ModelProvider.CLAUDE, state.selectedProvider)
        assertEquals("claude-sonnet-4-6", state.model)
        assertEquals(0.7, state.temperature)
        assertEquals(2048, state.maxTokens)
    }

    @Test
    fun `setMode should update mode state`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        assertEquals(SettingsMode.DirectProvider, viewModel.state.first().mode)
    }

    @Test
    fun `setDictatorServiceUrl should update URL`() = runTest {
        val testUrl = "http://localhost:3000"
        viewModel.setDictatorServiceUrl(testUrl)
        assertEquals(testUrl, viewModel.state.first().dictatorServiceUrl)
    }

    @Test
    fun `setSelectedProvider should update provider and default model`() = runTest {
        viewModel.setSelectedProvider(ModelProvider.OPENAI)
        val state = viewModel.state.first()
        assertEquals(ModelProvider.OPENAI, state.selectedProvider)
        assertEquals("gpt-4o", state.model)
    }

    @Test
    fun `setApiKey should update API key`() = runTest {
        viewModel.setApiKey("sk-test-key")
        assertEquals("sk-test-key", viewModel.state.first().apiKey)
    }

    @Test
    fun `setBaseUrl should update base URL`() = runTest {
        viewModel.setBaseUrl("http://localhost:11434")
        assertEquals("http://localhost:11434", viewModel.state.first().baseUrl)
    }

    @Test
    fun `setModel should update model`() = runTest {
        viewModel.setModel("custom-model")
        assertEquals("custom-model", viewModel.state.first().model)
    }

    @Test
    fun `setTemperature should update temperature`() = runTest {
        viewModel.setTemperature(1.5)
        assertEquals(1.5, viewModel.state.first().temperature)
    }

    @Test
    fun `setMaxTokens should update max tokens`() = runTest {
        viewModel.setMaxTokens(4096)
        assertEquals(4096, viewModel.state.first().maxTokens)
    }

    @Test
    fun `validateAndSaveSettings should fail when dictator service URL is empty`() = runTest {
        viewModel.setDictatorServiceUrl("")
        viewModel.validateAndSaveSettings()
        val state = viewModel.state.first()
        assertTrue(state.errorMessage?.contains("URL is required") == true)
        assertFalse(state.isSaved)
    }

    @Test
    fun `validateAndSaveSettings should fail for invalid URL`() = runTest {
        viewModel.setDictatorServiceUrl("not a valid url")
        viewModel.validateAndSaveSettings()
        assertTrue(viewModel.state.first().errorMessage?.contains("Invalid") == true)
    }

    @Test
    fun `validateAndSaveSettings should save valid dictator service URL`() = runTest {
        viewModel.setDictatorServiceUrl("http://localhost:3000")
        viewModel.validateAndSaveSettings()
        val state = viewModel.state.first()
        assertEquals(null, state.errorMessage)
        assertTrue(state.isSaved)
        assertEquals("dictator_service", mockSharedPreferences.getString("settings_mode"))
        assertEquals("http://localhost:3000", mockSharedPreferences.getString("dictator_service_url"))
    }

    @Test
    fun `validateAndSaveSettings should fail when claude API key is empty`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("")
        viewModel.validateAndSaveSettings()
        assertTrue(viewModel.state.first().errorMessage?.contains("API key is required") == true)
    }

    @Test
    fun `validateAndSaveSettings should save valid claude provider`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("sk-ant-test-key")
        viewModel.validateAndSaveSettings()
        val state = viewModel.state.first()
        assertEquals(null, state.errorMessage)
        assertTrue(state.isSaved)
        assertEquals("direct_provider", mockSharedPreferences.getString("settings_mode"))
        assertEquals("CLAUDE", mockSharedPreferences.getString("provider_type"))
        assertEquals("sk-ant-test-key", mockSharedPreferences.getString("provider_api_key"))
    }

    @Test
    fun `validateAndSaveSettings should fail when ollama URL is empty`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.OLLAMA)
        viewModel.setBaseUrl("")
        viewModel.validateAndSaveSettings()
        assertTrue(viewModel.state.first().errorMessage?.contains("URL is required") == true)
    }

    @Test
    fun `validateAndSaveSettings should save valid ollama provider`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.OLLAMA)
        viewModel.setBaseUrl("http://localhost:11434")
        viewModel.setModel("mistral")
        viewModel.validateAndSaveSettings()
        val state = viewModel.state.first()
        assertEquals(null, state.errorMessage)
        assertTrue(state.isSaved)
        assertEquals("OLLAMA", mockSharedPreferences.getString("provider_type"))
        assertEquals("http://localhost:11434", mockSharedPreferences.getString("provider_base_url"))
    }

    @Test
    fun `validateAndSaveSettings should accept dictator direct provider`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.DICTATOR)
        viewModel.validateAndSaveSettings()
        assertTrue(viewModel.state.first().isSaved)
    }

    @Test
    fun `validateAndSaveSettings should fail when temperature is out of range`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("sk-ant-test-key")
        viewModel.setTemperature(2.5)
        viewModel.validateAndSaveSettings()
        assertTrue(viewModel.state.first().errorMessage?.contains("Temperature") == true)
    }

    @Test
    fun `validateAndSaveSettings should fail when max tokens is negative`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("sk-ant-test-key")
        viewModel.setMaxTokens(-1)
        viewModel.validateAndSaveSettings()
        assertTrue(viewModel.state.first().errorMessage?.contains("Max tokens") == true)
    }

    @Test
    fun `clearError should clear error message`() = runTest {
        viewModel.setDictatorServiceUrl("")
        viewModel.validateAndSaveSettings()
        assertTrue(viewModel.state.first().errorMessage != null)
        viewModel.clearError()
        assertEquals(null, viewModel.state.first().errorMessage)
    }

    @Test
    fun `testConnection should reject invalid dictator URL without network call`() = runTest {
        viewModel.setDictatorServiceUrl("")
        viewModel.testConnection()
        assertTrue(viewModel.state.first().testConnectionStatus?.contains("URL is required") == true)
    }

    @Test
    fun `testConnection should reject incomplete direct provider without network call`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("")
        viewModel.testConnection()
        assertTrue(viewModel.state.first().testConnectionStatus?.contains("API key is required") == true)
    }

    private class MockSharedPreferences : SharedPreferences {
        private val storage = mutableMapOf<String, String>()

        override fun getString(key: String, defaultValue: String?): String? = storage[key] ?: defaultValue
        override fun setString(key: String, value: String) { storage[key] = value }
        override fun remove(key: String) { storage.remove(key) }
        override fun clear() { storage.clear() }
    }
}
