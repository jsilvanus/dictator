/**
 * Sensitive Data Detector
 * Detects personally identifiable information (PII) in content
 */
package com.dictator.core.data.privacy

import kotlin.uuid.Uuid

/**
 * Detects sensitive data (PII, credentials, etc.) in text content
 */
class SensitiveDataDetector {
    
    private val patterns = mapOf(
        PiiType.EMAIL to Regex(
            "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
            RegexOption.IGNORE_CASE
        ),
        PiiType.PHONE to Regex(
            "(?:\\+?1[-.]?)?\\(?([0-9]{3})\\)?[-.]?([0-9]{3})[-.]?([0-9]{4})"
        ),
        PiiType.SSN to Regex(
            "\\b(?!000|666|9\\d{2})\\d{3}-?(?!00)\\d{2}-?(?!0{4})\\d{4}\\b"
        ),
        PiiType.CREDIT_CARD to Regex(
            "\\b(?:\\d[ \\-]{0,}?){13,19}\\b"
        ),
        PiiType.ADDRESS to Regex(
            "\\d+\\s+[A-Za-z\\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct)"
        ),
        PiiType.DOB to Regex(
            "\\b(?:(?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\\d|3[01])/(?:19|20)?\\d{2})\\b"
        ),
        PiiType.PASSPORT to Regex(
            "[A-Z]{1,2}\\d{6,9}"
        ),
        PiiType.DRIVER_LICENSE to Regex(
            "[A-Z]{1,2}\\d{5,8}"
        )
    )

    private val credentialPatterns = listOf(
        Regex("api[_-]?key['\"]?\\s*[:=]\\s*['\"]?[a-zA-Z0-9_-]{20,}", RegexOption.IGNORE_CASE),
        Regex("password['\"]?\\s*[:=]\\s*['\"]?[^\\s'\"]{8,}", RegexOption.IGNORE_CASE),
        Regex("token['\"]?\\s*[:=]\\s*['\"]?[a-zA-Z0-9_-]{20,}", RegexOption.IGNORE_CASE),
        Regex("secret['\"]?\\s*[:=]\\s*['\"]?[^\\s'\"]{8,}", RegexOption.IGNORE_CASE),
        Regex("aws_access_key_id", RegexOption.IGNORE_CASE),
        Regex("aws_secret_access_key", RegexOption.IGNORE_CASE)
    )

    /**
     * Detect all sensitive data in text
     */
    fun detectAllSensitiveData(text: String, userId: String = ""): List<DetectedSensitiveData> {
        val detectedData = mutableListOf<DetectedSensitiveData>()

        // Check for PII using defined patterns
        patterns.forEach { (piiType, pattern) ->
            pattern.findAll(text).forEach { match ->
                detectedData.add(
                    DetectedSensitiveData(
                        id = Uuid.random().toString(),
                        type = piiType.name,
                        content = maskSensitiveContent(match.value),
                        confidence = 0.95f,
                        location = "position:${match.range}"
                    )
                )
            }
        }

        // Check for credentials
        credentialPatterns.forEach { pattern ->
            pattern.findAll(text).forEach { match ->
                detectedData.add(
                    DetectedSensitiveData(
                        id = Uuid.random().toString(),
                        type = PiiType.OTHER.name,
                        content = maskSensitiveContent(match.value, "CREDENTIAL"),
                        confidence = 0.90f,
                        location = "position:${match.range}"
                    )
                )
            }
        }

        return detectedData
    }

    /**
     * Check if text contains sensitive data
     */
    fun containsSensitiveData(text: String): Boolean {
        // Quick check for PII
        patterns.values.forEach { pattern ->
            if (pattern.containsMatchIn(text)) {
                return true
            }
        }

        // Quick check for credentials
        credentialPatterns.forEach { pattern ->
            if (pattern.containsMatchIn(text)) {
                return true
            }
        }

        return false
    }

    /**
     * Get detected PII types in text
     */
    fun getDetectedPiiTypes(text: String): List<PiiType> {
        val types = mutableListOf<PiiType>()

        patterns.forEach { (piiType, pattern) ->
            if (pattern.containsMatchIn(text)) {
                types.add(piiType)
            }
        }

        return types
    }

    /**
     * Detect specific PII type
     */
    fun detectPiiType(text: String, piiType: PiiType): List<DetectedSensitiveData> {
        val pattern = patterns[piiType] ?: return emptyList()
        
        return pattern.findAll(text).map { match ->
            DetectedSensitiveData(
                id = Uuid.random().toString(),
                type = piiType.name,
                content = maskSensitiveContent(match.value),
                confidence = 0.95f,
                location = "position:${match.range}"
            )
        }.toList()
    }

    /**
     * Mask sensitive content for logging/display
     */
    private fun maskSensitiveContent(content: String, type: String = "SENSITIVE"): String {
        return when {
            content.length <= 4 -> "*".repeat(content.length)
            else -> content.substring(0, 2) + "*".repeat(content.length - 4) + content.substring(content.length - 2)
        }
    }

    /**
     * Remove sensitive data from text
     */
    fun removeSensitiveData(text: String): String {
        var result = text

        // Remove PII
        patterns.values.forEach { pattern ->
            result = result.replace(pattern) { matchResult ->
                "[${matchResult.value.length} chars redacted]"
            }
        }

        // Remove credentials
        credentialPatterns.forEach { pattern ->
            result = result.replace(pattern) { matchResult ->
                "[credential redacted]"
            }
        }

        return result
    }

    /**
     * Redact sensitive data (replace with placeholders)
     */
    fun redactSensitiveData(text: String): String {
        var result = text

        // Redact PII
        patterns.forEach { (piiType, pattern) ->
            result = result.replace(pattern) { 
                "[${piiType.name.lowercase().replace('_', '-')}]"
            }
        }

        // Redact credentials
        credentialPatterns.forEach { pattern ->
            result = result.replace(pattern) { 
                "[credential]"
            }
        }

        return result
    }

    /**
     * Calculate privacy risk score (0.0 to 1.0)
     * Higher score = more sensitive data detected
     */
    fun calculatePrivacyRisk(text: String): Float {
        val detectedData = detectAllSensitiveData(text)
        
        if (detectedData.isEmpty()) {
            return 0.0f
        }

        // Weight different PII types
        val riskWeights = mapOf(
            PiiType.SSN to 1.0f,
            PiiType.CREDIT_CARD to 1.0f,
            PiiType.PASSPORT to 0.9f,
            PiiType.BANKING_INFO to 0.95f,
            PiiType.MEDICAL_INFO to 0.85f,
            PiiType.EMAIL to 0.3f,
            PiiType.PHONE to 0.4f,
            PiiType.ADDRESS to 0.5f
        )

        var totalRisk = 0.0f
        detectedData.forEach { data ->
            val piiType = PiiType.valueOf(data.type)
            val weight = riskWeights[piiType] ?: 0.5f
            totalRisk += weight * data.confidence
        }

        // Normalize to 0-1 range
        return (totalRisk / (detectedData.size * 1.0f)).coerceIn(0.0f, 1.0f)
    }

    /**
     * Check if user content is safe for AI processing
     */
    fun isSafeForAiProcessing(text: String, allowedRiskLevel: Float = 0.3f): Boolean {
        return calculatePrivacyRisk(text) <= allowedRiskLevel
    }
}
