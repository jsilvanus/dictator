package com.dictator.android.ui.ai

import com.dictator.core.data.ai.ModelProvider
import com.dictator.core.service.SharedPreferences
import io.ktor.client.HttpClient
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.kotlin.mock

class AndroidAiProviderResolverTest {
    @Test
    fun `default configuration resolves to Dictator service`() {
        val preferences = TestPreferences()
        val provider = AndroidAiProviderResolver(mock<HttpClient>(), preferences).resolve()

        assertEquals(ModelProvider.DICTATOR, provider.getProviderType())
        assertEquals("dictator-ai-default", provider.getModelName())
    }

    @Test
    fun `direct OpenAI configuration resolves to OpenAI provider`() {
        val preferences = TestPreferences().apply {
            setString("settings_mode", "direct_provider")
            setString("provider_type", "OPENAI")
            setString("provider_api_key", "test-key")
            setString("provider_model", "gpt-test")
        }

        val provider = AndroidAiProviderResolver(mock<HttpClient>(), preferences).resolve()

        assertEquals(ModelProvider.OPENAI, provider.getProviderType())
        assertEquals("gpt-test", provider.getModelName())
        assertEquals(true, provider.isConfigured())
    }

    @Test
    fun `direct Ollama configuration resolves without API key`() {
        val preferences = TestPreferences().apply {
            setString("settings_mode", "direct_provider")
            setString("provider_type", "OLLAMA")
            setString("provider_base_url", "http://10.0.2.2:11434")
            setString("provider_model", "mistral")
        }

        val provider = AndroidAiProviderResolver(mock<HttpClient>(), preferences).resolve()

        assertEquals(ModelProvider.OLLAMA, provider.getProviderType())
        assertEquals("mistral", provider.getModelName())
        assertEquals(true, provider.isConfigured())
    }

    private class TestPreferences : SharedPreferences {
        private val values = mutableMapOf<String, String>()
        override fun getString(key: String, defaultValue: String?): String? = values[key] ?: defaultValue
        override fun setString(key: String, value: String) { values[key] = value }
        override fun remove(key: String) { values.remove(key) }
        override fun clear() { values.clear() }
    }
}
