package com.dictator.core.data.ai

import com.dictator.core.data.privacy.ProviderPolicyManager
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AiProviderFactoryTest {
    @Test
    fun `aidos policy is local and never retained`() {
        val policies = ProviderPolicyManager()
        val policy = policies.getPolicy("aidos")!!
        assertTrue(policies.isLocalProvider("aidos"))
        assertEquals(0, policy.dataRetentionDays)
        assertFalse(policy.usesDataForTraining)
        assertEquals(1.0f, policies.getPrivacyScore("aidos"))
    }

    @Test
    fun `aidos config is invalid until a platform provider is registered`() {
        // The registry is process-global; this test is the only one that registers AIDOS in this module.
        val before = AiProviderFactory.validateConfig(ProviderConfig(ModelProvider.AIDOS))
        if (!AiProviderFactory.isRegistered(ModelProvider.AIDOS)) assertFalse(before.valid)
        AiProviderFactory.register(ModelProvider.AIDOS) { _, _ -> error("not built in this test") }
        assertTrue(AiProviderFactory.validateConfig(ProviderConfig(ModelProvider.AIDOS)).valid)
    }
}
