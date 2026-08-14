/**
 * Privacy and Data Protection Types
 * Defines core types for privacy policy, telemetry, and provenance tracking
 */
package com.dictator.core.data.privacy

import kotlinx.serialization.Serializable

// ============================================================================
// Data Processing Types
// ============================================================================

enum class DataProcessingPurpose {
    MODEL_TRAINING,
    SERVICE_IMPROVEMENT,
    USER_SUPPORT,
    COMPLIANCE,
    SECURITY
}

enum class DataGeographicLocation {
    US, EU, UK, CA, AU, OTHER
}

/**
 * AI Provider Policy - defines data handling practices
 */
@Serializable
data class AiProviderPolicy(
    val id: String,
    val provider: String, // e.g., 'claude', 'openai'
    val displayName: String,
    val dataRetentionDays: Int? = null, // null = indefinite
    val processingPurposes: List<String> = emptyList(),
    val processingLocations: List<String> = emptyList(),
    val usesDataForTraining: Boolean = false,
    val trainingOptOutAvailable: Boolean = false,
    val privacyPolicyUrl: String = "",
    val gdprCompliant: Boolean = false,
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

// ============================================================================
// AI Request Provenance Types
// ============================================================================

enum class AiContentSource {
    HUMAN_DICTATED, HUMAN_WRITTEN, AI_GENERATED, AI_MODIFIED
}

enum class AiRequestScope {
    FULL_DOCUMENT, SELECTED_TEXT, CONTEXT_SNIPPET
}

/**
 * AI Request Provenance - tracks where content came from
 */
@Serializable
data class AiRequestProvenance(
    val requestId: String,
    val sessionId: String,
    val userId: String,
    val provider: String,
    val model: String,
    val contentSources: List<String>, // List of AiContentSource enum names
    val requestScope: String = "full-document",
    val hasPersonalData: Boolean = false,
    val personalDataTypes: List<String> = emptyList(),
    val requestedAt: Long = System.currentTimeMillis(),
    val completedAt: Long? = null,
    val consentProvided: Boolean = false,
    val consentType: String? = null // e.g., 'user-confirmed', 'implicit'
)

// ============================================================================
// Sensitive Data Types
// ============================================================================

enum class PiiType {
    EMAIL,
    PHONE,
    SSN,
    CREDIT_CARD,
    PASSPORT,
    DRIVER_LICENSE,
    ADDRESS,
    NAME,
    DOB,
    BANKING_INFO,
    MEDICAL_INFO,
    OTHER
}

/**
 * Detected PII/Sensitive data in content
 */
@Serializable
data class DetectedSensitiveData(
    val id: String,
    val type: String, // PiiType enum name
    val content: String, // The actual detected content (masked for security)
    val confidence: Float = 1.0f, // 0.0 to 1.0
    val location: String? = null, // Optional location info
    val timestamp: Long = System.currentTimeMillis()
)

// ============================================================================
// User Privacy Settings
// ============================================================================

/**
 * User privacy preferences and configuration
 */
@Serializable
data class UserPrivacySettings(
    val userId: String,
    val shareAnalytics: Boolean = false,
    val shareUsageData: Boolean = false,
    val allowModelTraining: Boolean = false,
    val dataRetentionDays: Int = 30,
    val piiDetectionEnabled: Boolean = true,
    val acceptedProviders: List<String> = emptyList(), // List of provider IDs
    val gdprConsentProvided: Boolean = false,
    val ccpaOptOut: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

// ============================================================================
// Privacy Audit Types
// ============================================================================

enum class AuditEventType {
    DATA_PROCESSED,
    DATA_SHARED,
    DATA_DELETED,
    CONSENT_CHANGED,
    POLICY_VIEWED,
    EXPORT_INITIATED,
    SETTINGS_CHANGED
}

/**
 * Privacy audit log entry
 */
@Serializable
data class PrivacyAuditLogEntry(
    val id: String,
    val userId: String,
    val eventType: String, // AuditEventType enum name
    val details: String,
    val affectedDataTypes: List<String> = emptyList(),
    val timestamp: Long = System.currentTimeMillis()
)

// ============================================================================
// Telemetry Types
// ============================================================================

/**
 * Anonymized/pseudonymized telemetry data
 */
@Serializable
data class AnonymousTelemetryEvent(
    val eventId: String,
    val pseudonymizedUserId: String, // HMAC-SHA256 hash of user ID
    val eventType: String, // e.g., 'document-opened', 'ai-query'
    val metadata: Map<String, String> = emptyMap(),
    val timestamp: Long = System.currentTimeMillis()
)
