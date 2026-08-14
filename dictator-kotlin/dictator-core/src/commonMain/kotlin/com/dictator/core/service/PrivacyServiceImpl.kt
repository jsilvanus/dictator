/**
 * Privacy Service Interface and Implementation
 * Orchestrates privacy-related operations
 */
package com.dictator.core.service

import com.dictator.core.data.privacy.*

/**
 * Privacy service interface
 */
interface PrivacyService {
    // Sensitive Data Detection
    suspend fun detectSensitiveData(text: String): List<DetectedSensitiveData>
    suspend fun containsSensitiveData(text: String): Boolean
    suspend fun calculatePrivacyRisk(text: String): Float
    suspend fun isSafeForAiProcessing(text: String): Boolean

    // Telemetry
    suspend fun recordEvent(userId: String, eventType: String, metadata: Map<String, String> = emptyMap())
    suspend fun recordAiQueryEvent(userId: String, provider: String, model: String, hasSensitiveData: Boolean)

    // Provider Policies
    suspend fun getProviderPolicy(provider: String): AiProviderPolicy?
    suspend fun getAllProviderPolicies(): List<AiProviderPolicy>
    suspend fun getPrivacyScore(provider: String): Float
    suspend fun isGdprCompliant(provider: String): Boolean

    // Privacy Settings
    suspend fun getUserPrivacySettings(userId: String): UserPrivacySettings
    suspend fun updatePrivacySettings(userId: String, settings: UserPrivacySettings)

    // Audit Logging
    suspend fun logPrivacyEvent(userId: String, eventType: String, details: String)
}

/**
 * Privacy Service Implementation
 */
class PrivacyServiceImpl(
    private val sensitiveDataDetector: SensitiveDataDetector,
    private val telemetryService: TelemetryService,
    private val providerPolicyManager: ProviderPolicyManager,
    private val privacyRepository: com.dictator.core.domain.repository.PrivacyRepository? = null
) : PrivacyService {

    /**
     * Detect sensitive data in text
     */
    override suspend fun detectSensitiveData(text: String): List<DetectedSensitiveData> {
        return sensitiveDataDetector.detectAllSensitiveData(text)
    }

    /**
     * Check if text contains sensitive data
     */
    override suspend fun containsSensitiveData(text: String): Boolean {
        return sensitiveDataDetector.containsSensitiveData(text)
    }

    /**
     * Calculate privacy risk score
     */
    override suspend fun calculatePrivacyRisk(text: String): Float {
        return sensitiveDataDetector.calculatePrivacyRisk(text)
    }

    /**
     * Check if text is safe for AI processing
     */
    override suspend fun isSafeForAiProcessing(text: String): Boolean {
        return sensitiveDataDetector.isSafeForAiProcessing(text)
    }

    /**
     * Record a telemetry event
     */
    override suspend fun recordEvent(
        userId: String,
        eventType: String,
        metadata: Map<String, String>
    ) {
        telemetryService.recordEvent(userId, eventType, metadata)
    }

    /**
     * Record an AI query event
     */
    override suspend fun recordAiQueryEvent(
        userId: String,
        provider: String,
        model: String,
        hasSensitiveData: Boolean
    ) {
        telemetryService.recordAiQueryEvent(userId, provider, model, hasSensitiveData)
    }

    /**
     * Get provider privacy policy
     */
    override suspend fun getProviderPolicy(provider: String): AiProviderPolicy? {
        return providerPolicyManager.getPolicy(provider)
    }

    /**
     * Get all provider policies
     */
    override suspend fun getAllProviderPolicies(): List<AiProviderPolicy> {
        return providerPolicyManager.getAllPolicies()
    }

    /**
     * Get privacy score for provider
     */
    override suspend fun getPrivacyScore(provider: String): Float {
        return providerPolicyManager.getPrivacyScore(provider)
    }

    /**
     * Check if provider is GDPR compliant
     */
    override suspend fun isGdprCompliant(provider: String): Boolean {
        return providerPolicyManager.isGdprCompliant(provider)
    }

    /**
     * Get user privacy settings
     */
    override suspend fun getUserPrivacySettings(userId: String): UserPrivacySettings {
        return privacyRepository?.getUserPrivacySettings(userId)
            ?: UserPrivacySettings(userId = userId)
    }

    /**
     * Update user privacy settings
     */
    override suspend fun updatePrivacySettings(userId: String, settings: UserPrivacySettings) {
        privacyRepository?.saveUserPrivacySettings(settings)
    }

    /**
     * Log privacy event
     */
    override suspend fun logPrivacyEvent(userId: String, eventType: String, details: String) {
        telemetryService.recordPrivacyActionEvent(userId, eventType, details)
        
        // Also save to repository if available
        privacyRepository?.logPrivacyEvent(
            PrivacyAuditLogEntry(
                id = kotlin.uuid.Uuid.random().toString(),
                userId = userId,
                eventType = eventType,
                details = details,
                timestamp = System.currentTimeMillis()
            )
        )
    }

    /**
     * Get telemetry statistics
     */
    fun getTelemetryStatistics(): TelemetryStatistics {
        return telemetryService.getStatistics()
    }

    /**
     * Generate privacy report
     */
    fun generatePrivacyReport(provider: String): String {
        return providerPolicyManager.generatePrivacyReport(provider)
    }

    /**
     * Check if multiple pieces of content are safe for AI processing
     */
    suspend fun areSafeForAiProcessing(texts: List<String>, maxRiskLevel: Float = 0.3f): Boolean {
        return texts.all { text ->
            calculatePrivacyRisk(text) <= maxRiskLevel
        }
    }

    /**
     * Redact sensitive data from text
     */
    fun redactSensitiveData(text: String): String {
        return sensitiveDataDetector.redactSensitiveData(text)
    }

    /**
     * Get privacy-ranked providers
     */
    fun getProvidersByPrivacy(): List<Pair<String, Float>> {
        return providerPolicyManager.getProvidersByPrivacy()
    }

    /**
     * Get recommended provider for privacy requirements
     */
    fun getRecommendedProvider(requireGdprCompliance: Boolean = true, allowTraining: Boolean = false): String? {
        return providerPolicyManager.getRecommendedProvider(requireGdprCompliance, allowTraining)
    }
}
