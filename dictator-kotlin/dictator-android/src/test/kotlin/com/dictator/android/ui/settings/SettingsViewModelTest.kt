package com.dictator.android.ui.settings

import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.service.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Tests for SettingsViewModel
 */
class SettingsViewModelTest {

    private lateinit var viewModel: SettingsViewModel
    private lateinit var mockSharedPreferences: MockSharedPreferences

    @OptIn(ExperimentalCoroutinesApi::class)
    @Before
    fun setUp() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
        mockSharedPreferences = MockSharedPreferences()
        viewModel = SettingsViewModel(mockSharedPreferences)
    }

    @Test
    fun `initial state should use default values`() = runTest {
        val state = viewModel.state.first()
        assertEquals(SettingsMode.DictatorService, state.mode)
        assertEquals("", state.dictatorServiceUrl)
        assertEquals(ModelProvider.CLAUDE, state.selectedProvider)
        assertEquals(0.7, state.temperature)
        assertEquals(2048, state.maxTokens)
    }

    @Test
    fun `setMode should update mode state`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        val state = viewModel.state.first()
        assertEquals(SettingsMode.DirectProvider, state.mode)
    }

    @Test
    fun `setDictatorServiceUrl should update URL`() = runTest {
        val testUrl = "http://localhost:3000"
        viewModel.setDictatorServiceUrl(testUrl)
        val state = viewModel.state.first()
        assertEquals(testUrl, state.dictatorServiceUrl)
    }

    @Test
    fun `setSelectedProvider should update provider`() = runTest {
        viewModel.setSelectedProvider(ModelProvider.OPENAI)
        val state = viewModel.state.first()
        assertEquals(ModelProvider.OPENAI, state.selectedProvider)
        // Should set default model for OpenAI
        assertEquals("gpt-4o", state.model)
    }

    @Test
    fun `setApiKey should update API key`() = runTest {
        val testKey = "sk-test-key"
        viewModel.setApiKey(testKey)
        val state = viewModel.state.first()
        assertEquals(testKey, state.apiKey)
    }

    @Test
    fun `setBaseUrl should update base URL`() = runTest {
        val testUrl = "http://localhost:11434"
        viewModel.setBaseUrl(testUrl)
        val state = viewModel.state.first()
        assertEquals(testUrl, state.baseUrl)
    }

    @Test
    fun `setModel should update model`() = runTest {
        val testModel = "custom-model"
        viewModel.setModel(testModel)
        val state = viewModel.state.first()
        assertEquals(testModel, state.model)
    }

    @Test
    fun `setTemperature should update temperature`() = runTest {
        viewModel.setTemperature(1.5)
        val state = viewModel.state.first()
        assertEquals(1.5, state.temperature)
    }

    @Test
    fun `setMaxTokens should update max tokens`() = runTest {
        viewModel.setMaxTokens(4096)
        val state = viewModel.state.first()
        assertEquals(4096, state.maxTokens)
    }

    @Test
    fun `validateAndSaveSettings should fail when dictator service URL is empty`() = runTest {
        viewModel.setMode(SettingsMode.DictatorService)
        viewModel.setDictatorServiceUrl("")
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertTrue(state.errorMessage?.contains("URL is required") == true)
        assertFalse(state.isSaved)
    }

    @Test
    fun `validateAndSaveSettings should fail for invalid URL`() = runTest {
        viewModel.setMode(SettingsMode.DictatorService)
        viewModel.setDictatorServiceUrl("not a valid url")
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertTrue(state.errorMessage?.contains("Invalid") == true)
    }

    @Test
    fun `validateAndSaveSettings should succeed for valid dictator service URL`() = runTest {
        viewModel.setMode(SettingsMode.DictatorService)
        viewModel.setDictatorServiceUrl("http://localhost:3000")
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertEquals(null, state.errorMessage)
        assertEquals(true, state.isSaved)
        
        // Verify saved to preferences
        assertEquals("dictator_service", mockSharedPreferences.getString("settings_mode"))
        assertEquals("http://localhost:3000", mockSharedPreferences.getString("dictator_service_url"))
    }

    @Test
    fun `validateAndSaveSettings should fail when claude API key is empty`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("")
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertTrue(state.errorMessage?.contains("API key is required") == true)
    }

    @Test
    fun `validateAndSaveSettings should succeed for valid claude provider`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("sk-ant-test-key")
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertEquals(null, state.errorMessage)
        assertEquals(true, state.isSaved)
        
        // Verify saved to preferences
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
        
        val state = viewModel.state.first()
        assertTrue(state.errorMessage?.contains("URL is required") == true)
    }

    @Test
    fun `validateAndSaveSettings should succeed for valid ollama provider`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.OLLAMA)
        viewModel.setBaseUrl("http://localhost:11434")
        viewModel.setModel("mistral")
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertEquals(null, state.errorMessage)
        assertEquals(true, state.isSaved)
        
        // Verify saved to preferences
        assertEquals("direct_provider", mockSharedPreferences.getString("settings_mode"))
        assertEquals("OLLAMA", mockSharedPreferences.getString("provider_type"))
        assertEquals("http://localhost:11434", mockSharedPreferences.getString("provider_base_url"))
    }

    @Test
    fun `validateAndSaveSettings should fail when temperature is out of range`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("sk-ant-test-key")
        viewModel.setTemperature(2.5)
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertTrue(state.errorMessage?.contains("Temperature") == true)
    }

    @Test
    fun `validateAndSaveSettings should fail when max tokens is negative`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("sk-ant-test-key")
        viewModel.setMaxTokens(-1)
        viewModel.validateAndSaveSettings()
        
        val state = viewModel.state.first()
        assertTrue(state.errorMessage?.contains("Max tokens") == true)
    }

    @Test
    fun `clearError should clear error message`() = runTest {
        viewModel.setMode(SettingsMode.DictatorService)
        viewModel.setDictatorServiceUrl("")
        viewModel.validateAndSaveSettings()
        
        var state = viewModel.state.first()
        assertTrue(state.errorMessage != null)
        
        viewModel.clearError()
        state = viewModel.state.first()
        assertEquals(null, state.errorMessage)
    }

    @Test
    fun `testConnection should return success for valid dictator service`() = runTest {
        viewModel.setMode(SettingsMode.DictatorService)
        viewModel.setDictatorServiceUrl("http://localhost:3000")
        viewModel.testConnection()
        
        val state = viewModel.state.first()
        assertTrue(state.testConnectionStatus?.contains("successful") == true)
    }

    @Test
    fun `testConnection should return invalid for empty dictator service URL`() = runTest {
        viewModel.setMode(SettingsMode.DictatorService)
        viewModel.setDictatorServiceUrl("")
        viewModel.testConnection()
        
        val state = viewModel.state.first()
        assertTrue(state.testConnectionStatus?.contains("Invalid") == true)
    }

    @Test
    fun `testConnection should return valid for complete direct provider config`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("sk-ant-test-key")
        viewModel.testConnection()
        
        val state = viewModel.state.first()
        assertTrue(state.testConnectionStatus?.contains("valid") == true)
    }

    @Test
    fun `testConnection should return invalid for incomplete direct provider config`() = runTest {
        viewModel.setMode(SettingsMode.DirectProvider)
        viewModel.setSelectedProvider(ModelProvider.CLAUDE)
        viewModel.setApiKey("")
        viewModel.testConnection()
        
        val state = viewModel.state.first()
        assertTrue(state.testConnectionStatus?.contains("Missing") == true)
    }

    /**
     * Mock implementation of SharedPreferences for testing
     */
    private class MockSharedPreferences : SharedPreferences {
        private val storage = mutableMapOf<String, String>()

        override fun getString(key: String, defaultValue: String?): String? {
            return storage[key] ?: defaultValue
        }

        override fun setString(key: String, value: String) {
            storage[key] = value
        }

        override fun remove(key: String) {
            storage.remove(key)
        }

        override fun clear() {
            storage.clear()
        }
    }
}
