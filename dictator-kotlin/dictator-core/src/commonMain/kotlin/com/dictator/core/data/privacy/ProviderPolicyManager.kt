/**
 * Provider Policy Manager
 * Manages AI provider privacy policies and data handling practices
 */
package com.dictator.core.data.privacy

/**
 * Manager for AI provider privacy policies
 */
class ProviderPolicyManager {
    
    private val policies = mutableMapOf<String, AiProviderPolicy>()
    
    init {
        // Initialize with default policies
        initializeDefaultPolicies()
    }

    /**
     * Initialize default provider policies
     */
    private fun initializeDefaultPolicies() {
        // Anthropic Claude Policy
        policies["claude"] = AiProviderPolicy(
            id = "policy-claude-v1",
            provider = "claude",
            displayName = "Anthropic Claude",
            dataRetentionDays = 30,
            processingPurposes = listOf("service-improvement", "user-support", "security"),
            processingLocations = listOf("us"),
            usesDataForTraining = false,
            trainingOptOutAvailable = true,
            privacyPolicyUrl = "https://www.anthropic.com/privacy",
            gdprCompliant = true,
            notes = "User conversations are deleted after 30 days by default. Available via Claude API."
        )

        // OpenAI Policy
        policies["openai"] = AiProviderPolicy(
            id = "policy-openai-v1",
            provider = "openai",
            displayName = "OpenAI",
            dataRetentionDays = 30,
            processingPurposes = listOf("model-training", "service-improvement", "user-support"),
            processingLocations = listOf("us"),
            usesDataForTraining = true,
            trainingOptOutAvailable = true,
            privacyPolicyUrl = "https://openai.com/privacy",
            gdprCompliant = true,
            notes = "Data may be used for model training unless opted out."
        )

        // Google Policy
        policies["google"] = AiProviderPolicy(
            id = "policy-google-v1",
            provider = "google",
            displayName = "Google",
            dataRetentionDays = null, // Indefinite
            processingPurposes = listOf("model-training", "service-improvement"),
            processingLocations = listOf("us", "eu"),
            usesDataForTraining = true,
            trainingOptOutAvailable = true,
            privacyPolicyUrl = "https://policies.google.com/privacy",
            gdprCompliant = true,
            notes = "Retention policy varies by service. Opt-out available for training use."
        )

        // Local Ollama Policy
        policies["ollama"] = AiProviderPolicy(
            id = "policy-ollama-v1",
            provider = "ollama",
            displayName = "Ollama (Local)",
            dataRetentionDays = 0, // No retention - local processing
            processingPurposes = emptyList(),
            processingLocations = listOf("local"),
            usesDataForTraining = false,
            trainingOptOutAvailable = false,
            privacyPolicyUrl = "https://ollama.ai",
            gdprCompliant = true,
            notes = "100% local processing. No data transmission or retention. Highest privacy."
        )

        // Dictator's Policy (own backend)
        policies["dictator"] = AiProviderPolicy(
            id = "policy-dictator-v1",
            provider = "dictator",
            displayName = "Dictator Server",
            dataRetentionDays = 90,
            processingPurposes = listOf("service-improvement", "user-support", "security"),
            processingLocations = listOf("us"),
            usesDataForTraining = false,
            trainingOptOutAvailable = false,
            privacyPolicyUrl = "https://www.getdictator.ai/privacy",
            gdprCompliant = true,
            notes = "Data encrypted in transit and at rest. Retained for 90 days for audit."
        )
    }

    /**
     * Get policy for a specific provider
     */
    fun getPolicy(provider: String): AiProviderPolicy? {
        return policies[provider.lowercase()]
    }

    /**
     * Get all registered provider policies
     */
    fun getAllPolicies(): List<AiProviderPolicy> {
        return policies.values.toList()
    }

    /**
     * Add or update a provider policy
     */
    fun registerPolicy(policy: AiProviderPolicy) {
        policies[policy.provider.lowercase()] = policy
    }

    /**
     * Remove a provider policy
     */
    fun removePolicy(provider: String) {
        policies.remove(provider.lowercase())
    }

    /**
     * Check if provider is GDPR compliant
     */
    fun isGdprCompliant(provider: String): Boolean {
        return getPolicy(provider)?.gdprCompliant ?: false
    }

    /**
     * Check if provider uses data for training
     */
    fun usesDataForTraining(provider: String): Boolean {
        return getPolicy(provider)?.usesDataForTraining ?: false
    }

    /**
     * Check if training opt-out is available
     */
    fun isTrainingOptOutAvailable(provider: String): Boolean {
        return getPolicy(provider)?.trainingOptOutAvailable ?: false
    }

    /**
     * Get data retention days
     */
    fun getDataRetentionDays(provider: String): Int? {
        return getPolicy(provider)?.dataRetentionDays
    }

    /**
     * Get processing purposes
     */
    fun getProcessingPurposes(provider: String): List<String> {
        return getPolicy(provider)?.processingPurposes ?: emptyList()
    }

    /**
     * Get processing locations
     */
    fun getProcessingLocations(provider: String): List<String> {
        return getPolicy(provider)?.processingLocations ?: emptyList()
    }

    /**
     * Get privacy policy URL
     */
    fun getPrivacyPolicyUrl(provider: String): String? {
        return getPolicy(provider)?.privacyPolicyUrl
    }

    /**
     * Check if provider is local (no data transmission)
     */
    fun isLocalProvider(provider: String): Boolean {
        val locations = getProcessingLocations(provider)
        return locations.contains("local")
    }

    /**
     * Rank providers by privacy (0.0 to 1.0, higher = more private)
     */
    fun getPrivacyScore(provider: String): Float {
        val policy = getPolicy(provider) ?: return 0.5f // Default middle score

        var score = 0.0f

        // Local processing = highest privacy (1.0)
        if (isLocalProvider(provider)) {
            return 1.0f
        }

        // GDPR compliance (0.2 points)
        if (policy.gdprCompliant) score += 0.2f

        // No data training (0.3 points)
        if (!policy.usesDataForTraining) score += 0.3f

        // Short retention (0.2 points)
        if (policy.dataRetentionDays != null && policy.dataRetentionDays <= 30) {
            score += 0.2f
        }

        // Limited processing purposes (0.15 points)
        if (policy.processingPurposes.size <= 2) score += 0.15f

        // US/EU only (0.1 points)
        val allUsEuLike = policy.processingLocations.all { 
            it in listOf("us", "eu", "uk", "ca", "au")
        }
        if (allUsEuLike) score += 0.1f

        return score.coerceIn(0.0f, 1.0f)
    }

    /**
     * Get providers sorted by privacy score (highest first)
     */
    fun getProvidersByPrivacy(): List<Pair<String, Float>> {
        return policies.map { (provider, _) ->
            provider to getPrivacyScore(provider)
        }.sortedByDescending { it.second }
    }

    /**
     * Compare two providers
     */
    fun compareProviders(provider1: String, provider2: String): String {
        val policy1 = getPolicy(provider1)
        val policy2 = getPolicy(provider2)
        
        if (policy1 == null || policy2 == null) {
            return "Provider not found"
        }

        val score1 = getPrivacyScore(provider1)
        val score2 = getPrivacyScore(provider2)
        val morePrivate = if (score1 > score2) provider1 else provider2
        val scoreFormat = "%.2f vs %.2f".format(score1, score2)

        return "$morePrivate is more private ($scoreFormat)"
    }

    /**
     * Get recommended provider based on privacy requirements
     */
    fun getRecommendedProvider(requireGdprCompliance: Boolean = true, allowTraining: Boolean = false): String? {
        val providers = getAllPolicies()
            .filter { 
                (!requireGdprCompliance || it.gdprCompliant) &&
                (allowTraining || !it.usesDataForTraining)
            }
            .sortedByDescending { getPrivacyScore(it.provider) }

        return providers.firstOrNull()?.provider
    }

    /**
     * Generate privacy report for a provider
     */
    fun generatePrivacyReport(provider: String): String {
        val policy = getPolicy(provider) ?: return "Provider not found"
        val score = getPrivacyScore(provider)

        val sb = StringBuilder()
        sb.append("=== Privacy Report: ${policy.displayName} ===\n")
        sb.append("Privacy Score: ${"%.1f".format(score * 100)}%\n")
        sb.append("GDPR Compliant: ${policy.gdprCompliant}\n")
        sb.append("Data for Training: ${policy.usesDataForTraining}\n")
        sb.append("Training Opt-Out: ${policy.trainingOptOutAvailable}\n")
        sb.append("Data Retention: ${policy.dataRetentionDays?.toString() ?: "Indefinite"} days\n")
        sb.append("Processing Locations: ${policy.processingLocations.joinToString(", ")}\n")
        sb.append("Processing Purposes: ${policy.processingPurposes.joinToString(", ")}\n")
        sb.append("Policy URL: ${policy.privacyPolicyUrl}\n")
        sb.append("Notes: ${policy.notes}\n")

        return sb.toString()
    }
}
