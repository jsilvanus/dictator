/**
 * Sensitive Data Detector for Android
 * Scans text for personally identifiable information (PII)
 */

package com.dictator.core.util.privacy

/**
 * Types of sensitive data
 */
enum class SensitiveDataType {
    CREDIT_CARD,
    SSN,
    PHONE,
    EMAIL,
    API_KEY,
    PASSWORD,
    JWT_TOKEN,
    IP_ADDRESS,
    LICENSE_PLATE,
    BANK_ACCOUNT,
    ROUTING_NUMBER,
    URL
}

/**
 * Detected sensitive data information
 */
data class DetectedSensitiveData(
    val type: SensitiveDataType,
    val value: String,
    val confidence: Double,
    val startIndex: Int,
    val endIndex: Int
)

/**
 * Result of scanning text for sensitive data
 */
data class SensitiveDataScanResult(
    val hasSensitiveData: Boolean,
    val detected: List<DetectedSensitiveData>,
    val riskLevel: String // "low", "medium", "high"
)

/**
 * Scans text for sensitive data using pattern matching
 */
object SensitiveDataDetector {
    
    // Regex patterns for different data types
    private val patterns = mapOf(
        SensitiveDataType.CREDIT_CARD to Regex(
            "\\b(?:\\d[ -]*?){13,19}\\b"
        ),
        SensitiveDataType.SSN to Regex(
            "\\b(?:\\d{3}-\\d{2}-\\d{4}|\\d{9})\\b"
        ),
        SensitiveDataType.PHONE to Regex(
            "\\b(?:\\+?1[-.]?)?\\(?([0-9]{3})\\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\\b"
        ),
        SensitiveDataType.EMAIL to Regex(
            "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b"
        ),
        SensitiveDataType.API_KEY to Regex(
            "(?i)(?:api[_-]?key|apikey|api[_-]?secret)\\s*[:=]\\s*['\"]?[A-Za-z0-9_-]{32,}['\"]?"
        ),
        SensitiveDataType.PASSWORD to Regex(
            "(?i)(?:password|passwd|pwd|pass)\\s*[:=]\\s*[^\\s'\"]+['\"]?"
        ),
        SensitiveDataType.JWT_TOKEN to Regex(
            "eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+"
        ),
        SensitiveDataType.IP_ADDRESS to Regex(
            "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b"
        ),
        SensitiveDataType.LICENSE_PLATE to Regex(
            "\\b[A-Z]{2,3}\\s?\\d{2,4}\\s?[A-Z]{2,3}\\b"
        ),
        SensitiveDataType.BANK_ACCOUNT to Regex(
            "\\b(?:\\d{8,17})\\b"
        ),
        SensitiveDataType.ROUTING_NUMBER to Regex(
            "\\b\\d{9}\\b"
        ),
        SensitiveDataType.URL to Regex(
            "https?://(?:www\\.)?[^\\s/$.?#].[^\\s]*"
        )
    )
    
    // Confidence scoring for different patterns
    private val confidenceMap = mapOf(
        SensitiveDataType.CREDIT_CARD to 0.95,
        SensitiveDataType.SSN to 0.95,
        SensitiveDataType.EMAIL to 0.90,
        SensitiveDataType.JWT_TOKEN to 0.95,
        SensitiveDataType.IP_ADDRESS to 0.85,
        SensitiveDataType.API_KEY to 0.90,
        SensitiveDataType.PASSWORD to 0.80,
        SensitiveDataType.PHONE to 0.75,
        SensitiveDataType.LICENSE_PLATE to 0.70,
        SensitiveDataType.BANK_ACCOUNT to 0.60,
        SensitiveDataType.ROUTING_NUMBER to 0.65,
        SensitiveDataType.URL to 0.80
    )
    
    /**
     * Scan text for sensitive data
     */
    fun scanForSensitiveData(text: String): SensitiveDataScanResult {
        val detected = mutableListOf<DetectedSensitiveData>()
        
        for ((dataType, pattern) in patterns) {
            val matches = pattern.findAll(text)
            val confidence = confidenceMap[dataType] ?: 0.5
            
            for (match in matches) {
                detected.add(
                    DetectedSensitiveData(
                        type = dataType,
                        value = match.value,
                        confidence = confidence,
                        startIndex = match.range.first,
                        endIndex = match.range.last + 1
                    )
                )
            }
        }
        
        // Filter duplicates and low-confidence matches
        val filtered = detected
            .distinctBy { "${it.type}-${it.value}" }
            .filter { it.confidence >= 0.6 }
        
        // Calculate overall risk level
        val riskLevel = when {
            filtered.isEmpty() -> "low"
            filtered.any { it.confidence >= 0.9 } -> "high"
            filtered.any { it.confidence >= 0.75 } -> "medium"
            else -> "low"
        }
        
        return SensitiveDataScanResult(
            hasSensitiveData = filtered.isNotEmpty(),
            detected = filtered,
            riskLevel = riskLevel
        )
    }
    
    /**
     * Get human-readable description of detected data type
     */
    fun getTypeDescription(type: SensitiveDataType): String {
        return when (type) {
            SensitiveDataType.CREDIT_CARD -> "Credit Card Number"
            SensitiveDataType.SSN -> "Social Security Number"
            SensitiveDataType.PHONE -> "Phone Number"
            SensitiveDataType.EMAIL -> "Email Address"
            SensitiveDataType.API_KEY -> "API Key"
            SensitiveDataType.PASSWORD -> "Password"
            SensitiveDataType.JWT_TOKEN -> "Authentication Token"
            SensitiveDataType.IP_ADDRESS -> "IP Address"
            SensitiveDataType.LICENSE_PLATE -> "License Plate"
            SensitiveDataType.BANK_ACCOUNT -> "Bank Account Number"
            SensitiveDataType.ROUTING_NUMBER -> "Bank Routing Number"
            SensitiveDataType.URL -> "Website URL"
        }
    }
    
    /**
     * Get confidence level description
     */
    fun getConfidenceDescription(confidence: Double): String {
        return when {
            confidence >= 0.9 -> "High"
            confidence >= 0.75 -> "Medium"
            else -> "Low"
        }
    }
    
    /**
     * Redact sensitive data from text
     */
    fun redactSensitiveData(text: String, scanResult: SensitiveDataScanResult): String {
        if (scanResult.detected.isEmpty()) return text
        
        var result = text
        
        // Sort by position descending to maintain indices
        val sortedDetected = scanResult.detected.sortedByDescending { it.startIndex }
        
        for (detected in sortedDetected) {
            val redacted = "*".repeat(minOf(detected.value.length, 8))
            result = result.substring(0, detected.startIndex) + redacted + result.substring(detected.endIndex)
        }
        
        return result
    }
}
