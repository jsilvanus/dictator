package com.dictator.android.data

import android.app.PendingIntent
import android.content.Context
import fi.italeino.aidos.sdk.client.AidosEngineClient
import fi.italeino.aidos.sdk.client.AndroidAidosEngineClientFactory
import fi.italeino.aidos.sdk.client.EngineAvailability
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Dictator's link to Aidos Engine through the Aidos SDK (docs/AIDOS_SDK_INTEGRATION_PLAN.md, D1).
 *
 * [connect] performs the SDK handshake. The first time it runs on a device, Engine sees an unknown
 * caller, records Dictator as pending and notifies the user; the user approves on Engine's
 * Connected Apps screen and a later [connect] returns [EngineAvailability.Available]. Until then
 * nothing else in Dictator depends on Engine — [availability] is what a settings surface reads to
 * decide between "install Engine", "approve Dictator in Engine", and "ready".
 */
class AidosEngineConnection(
    val client: AidosEngineClient,
    private val approvalIntent: () -> PendingIntent? = { null }
) {
    // Null until the first handshake completes, so "not checked yet" is not shown as "not installed".
    private val _availability = MutableStateFlow<EngineAvailability?>(null)
    val availability: StateFlow<EngineAvailability?> = _availability.asStateFlow()

    /** Handshake with Engine and publish the outcome. Safe to call again, e.g. after the user approves. */
    suspend fun connect(): EngineAvailability {
        client.initialize()
        return client.availability().also { _availability.value = it }
    }

    /** Connect only if the last known state is not already [EngineAvailability.Available]. */
    suspend fun ensureAvailable(): EngineAvailability =
        if (_availability.value == EngineAvailability.Available && client.isAvailable()) EngineAvailability.Available else connect()

    /** Deep link into Engine's Connected Apps screen while [availability] is PendingApproval. */
    fun pendingApprovalIntent(): PendingIntent? = approvalIntent()

    companion object {
        fun create(context: Context): AidosEngineConnection {
            val android = AndroidAidosEngineClientFactory.createClient(context)
            return AidosEngineConnection(android) { android.pendingApprovalIntent() }
        }

        /** One line a user can act on, for every state except Available. */
        fun explain(availability: EngineAvailability?): String = when (availability) {
            null -> "Checking for Aidos Engine…"
            EngineAvailability.Available -> "Aidos Engine is ready."
            EngineAvailability.NotInstalled ->
                "Aidos Engine is not installed, or not running. Open Aidos Engine once, then try again."
            EngineAvailability.PendingApproval ->
                "Approve Dictator in Aidos Engine (Connected Apps), then try again."
            EngineAvailability.Denied ->
                "Dictator was denied in Aidos Engine. Allow it under Connected Apps in Aidos Engine."
            EngineAvailability.IncompatibleVersion ->
                "This Aidos Engine speaks a different API version. Update Aidos Engine or Dictator."
            EngineAvailability.HandshakeFailed ->
                "Could not reach Aidos Engine. Make sure it is running."
        }
    }
}
