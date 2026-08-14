/**
 * Telemetry Service
 * Handles anonymized/pseudonymized telemetry data collection
 */
package com.dictator.core.data.privacy

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.uuid.Uuid

/**
 * Telemetry service for pseudonymized event tracking
 */
class TelemetryService(
    private val secretKey: String = "default-secret-key"
) {
    
    private val events = mutableListOf<AnonymousTelemetryEvent>()
    private val maxEventsInMemory = 1000

    /**
     * Record a telemetry event with pseudonymized user ID
     */
    fun recordEvent(
        userId: String,
        eventType: String,
        metadata: Map<String, String> = emptyMap()
    ): AnonymousTelemetryEvent {
        val pseudonymizedUserId = pseudonymizeUserId(userId)
        
        val event = AnonymousTelemetryEvent(
            eventId = Uuid.random().toString(),
            pseudonymizedUserId = pseudonymizedUserId,
            eventType = eventType,
            metadata = metadata,
            timestamp = System.currentTimeMillis()
        )

        // Store in memory (with size limit)
        if (events.size >= maxEventsInMemory) {
            events.removeAt(0) // Remove oldest
        }
        events.add(event)

        return event
    }

    /**
     * Pseudonymize a user ID using HMAC-SHA256
     * This allows tracking unique users without revealing their identity
     */
    fun pseudonymizeUserId(userId: String): String {
        return try {
            val mac = Mac.getInstance("HmacSHA256")
            val secretKeySpec = SecretKeySpec(secretKey.toByteArray(), 0, secretKey.toByteArray().size, "HmacSHA256")
            mac.init(secretKeySpec)
            val hash = mac.doFinal(userId.toByteArray())
            bytesToHex(hash)
        } catch (e: Exception) {
            // Fallback: simple hash if HMAC fails
            userId.hashCode().toString()
        }
    }

    /**
     * Record document event
     */
    fun recordDocumentEvent(userId: String, documentId: String, action: String) {
        recordEvent(
            userId = userId,
            eventType = "document-$action",
            metadata = mapOf("documentId" to documentId)
        )
    }

    /**
     * Record AI query event
     */
    fun recordAiQueryEvent(userId: String, provider: String, model: String, containsSensitiveData: Boolean) {
        recordEvent(
            userId = userId,
            eventType = "ai-query",
            metadata = mapOf(
                "provider" to provider,
                "model" to model,
                "hasSensitiveData" to containsSensitiveData.toString()
            )
        )
    }

    /**
     * Record voice input event
     */
    fun recordVoiceInputEvent(userId: String, duration: Long, success: Boolean) {
        recordEvent(
            userId = userId,
            eventType = "voice-input",
            metadata = mapOf(
                "duration" to duration.toString(),
                "success" to success.toString()
            )
        )
    }

    /**
     * Record privacy action event
     */
    fun recordPrivacyActionEvent(userId: String, action: String, details: String = "") {
        recordEvent(
            userId = userId,
            eventType = "privacy-action",
            metadata = mapOf(
                "action" to action,
                "details" to details
            )
        )
    }

    /**
     * Get all recorded events (for export/debugging)
     */
    fun getAllEvents(): List<AnonymousTelemetryEvent> {
        return events.toList()
    }

    /**
     * Get events for a specific pseudonymized user
     */
    fun getEventsForUser(pseudonymizedUserId: String): List<AnonymousTelemetryEvent> {
        return events.filter { it.pseudonymizedUserId == pseudonymizedUserId }
    }

    /**
     * Get events of a specific type
     */
    fun getEventsByType(eventType: String): List<AnonymousTelemetryEvent> {
        return events.filter { it.eventType == eventType }
    }

    /**
     * Get events since a timestamp
     */
    fun getEventsSince(timestamp: Long): List<AnonymousTelemetryEvent> {
        return events.filter { it.timestamp >= timestamp }
    }

    /**
     * Clear all events
     */
    fun clearAllEvents() {
        events.clear()
    }

    /**
     * Clear events older than specified timestamp
     */
    fun clearEventsOlderThan(timestamp: Long) {
        events.removeAll { it.timestamp < timestamp }
    }

    /**
     * Get event statistics
     */
    fun getStatistics(): TelemetryStatistics {
        return TelemetryStatistics(
            totalEvents = events.size,
            uniqueUsers = events.map { it.pseudonymizedUserId }.distinct().size,
            eventTypes = events.groupingBy { it.eventType }.eachCount(),
            oldestEventTime = events.minOfOrNull { it.timestamp } ?: 0,
            newestEventTime = events.maxOfOrNull { it.timestamp } ?: 0
        )
    }

    /**
     * Export events as JSON (for sending to analytics server)
     * Events are already pseudonymized, safe to send
     */
    fun exportEventsForAnalytics(sincleTimestamp: Long = 0): String {
        val eventsToExport = if (sincleTimestamp > 0) {
            getEventsSince(sincleTimestamp)
        } else {
            getAllEvents()
        }

        // Simple JSON export (would use proper serialization in production)
        val json = StringBuilder()
        json.append("[\n")
        eventsToExport.forEachIndexed { index, event ->
            json.append("  {\n")
            json.append("    \"eventId\": \"${event.eventId}\",\n")
            json.append("    \"pseudonymizedUserId\": \"${event.pseudonymizedUserId}\",\n")
            json.append("    \"eventType\": \"${event.eventType}\",\n")
            json.append("    \"timestamp\": ${event.timestamp},\n")
            json.append("    \"metadata\": {\n")
            event.metadata.forEach { (key, value) ->
                json.append("      \"$key\": \"$value\",\n")
            }
            json.append("    }\n")
            json.append("  }")
            if (index < eventsToExport.size - 1) json.append(",")
            json.append("\n")
        }
        json.append("]\n")
        return json.toString()
    }

    /**
     * Convert bytes to hex string
     */
    private fun bytesToHex(bytes: ByteArray): String {
        val hexChars = "0123456789abcdef".toCharArray()
        val result = StringBuilder(bytes.size * 2)
        for (byte in bytes) {
            val b = byte.toInt() and 0xff
            result.append(hexChars[b shr 4])
            result.append(hexChars[b and 0x0f])
        }
        return result.toString()
    }
}

/**
 * Telemetry statistics
 */
data class TelemetryStatistics(
    val totalEvents: Int,
    val uniqueUsers: Int,
    val eventTypes: Map<String, Int>,
    val oldestEventTime: Long,
    val newestEventTime: Long
) {
    fun getDurationSeconds(): Long {
        return (newestEventTime - oldestEventTime) / 1000
    }

    fun getTopEventTypes(limit: Int = 5): List<Pair<String, Int>> {
        return eventTypes.toList()
            .sortedByDescending { it.second }
            .take(limit)
    }

    fun getEventsPerUser(): Double {
        return if (uniqueUsers > 0) totalEvents.toDouble() / uniqueUsers else 0.0
    }
}
