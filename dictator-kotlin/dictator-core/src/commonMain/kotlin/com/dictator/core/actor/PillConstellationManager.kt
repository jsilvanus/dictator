package com.dictator.core.actor

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * Manages the multi-pill constellation (Option B: Red, Blue, Green, and Custom pills).
 * Orchestrates interactions, click gestures, telemetry logging, and UI overlays.
 */
class PillConstellationManager(
    private val scope: CoroutineScope,
    initialOrchestratorName: String = "Sanelu",
    initialEditorName: String = "Muokkain",
    initialAiName: String = "Tekoäly"
) {
    // Configurations (renameable & color-changeable)
    private val _orchestratorConfig = MutableStateFlow(
        ActorPillConfig.createDefaultOrchestrator(name = initialOrchestratorName)
    )
    val orchestratorConfig: StateFlow<ActorPillConfig> = _orchestratorConfig.asStateFlow()

    private val _editorConfig = MutableStateFlow(
        ActorPillConfig.createDefaultEditor(name = initialEditorName)
    )
    val editorConfig: StateFlow<ActorPillConfig> = _editorConfig.asStateFlow()

    private val _aiConfig = MutableStateFlow(
        ActorPillConfig.createDefaultAi(name = initialAiName)
    )
    val aiConfig: StateFlow<ActorPillConfig> = _aiConfig.asStateFlow()

    private val _customPills = MutableStateFlow<Map<String, ActorPillConfig>>(emptyMap())
    val customPills: StateFlow<Map<String, ActorPillConfig>> = _customPills.asStateFlow()

    // Subsystems
    val cadenceEngine = CadenceEngine(scope)
    val selectionHolder = ActorSelectionHolder()

    // Statuses
    private val _orchestratorStatus = MutableStateFlow<ActorPillStatus>(ActorPillStatus.WaitingAmbient)
    val orchestratorStatus: StateFlow<ActorPillStatus> = _orchestratorStatus.asStateFlow()

    val editorStatus: StateFlow<ActorPillStatus> = cadenceEngine.currentStatus

    private val _aiStatus = MutableStateFlow<ActorPillStatus>(ActorPillStatus.WaitingAmbient)
    val aiStatus: StateFlow<ActorPillStatus> = _aiStatus.asStateFlow()

    // Overlay visibility states
    private val _isHappeningsHudVisible = MutableStateFlow(false)
    val isHappeningsHudVisible: StateFlow<Boolean> = _isHappeningsHudVisible.asStateFlow()

    private val _isTranscriptDrawerOpen = MutableStateFlow(false)
    val isTranscriptDrawerOpen: StateFlow<Boolean> = _isTranscriptDrawerOpen.asStateFlow()

    // Telemetry & Logs
    private val _happenings = MutableStateFlow<List<HappeningsEvent>>(emptyList())
    val happenings: StateFlow<List<HappeningsEvent>> = _happenings.asStateFlow()

    private val _transcript = MutableStateFlow<List<TranscriptEntry>>(emptyList())
    val transcript: StateFlow<List<TranscriptEntry>> = _transcript.asStateFlow()

    // --- Gestures & Interactivity ---

    /**
     * Single-click on a pill: Toggles the Happenings HUD hovering over the document.
     */
    fun onPillSingleClick(pillId: String) {
        _isHappeningsHudVisible.update { !it }
    }

    /**
     * Double-click on a pill: Opens the full Transcript Drawer in half of the screen.
     */
    fun onPillDoubleClick(pillId: String) {
        _isTranscriptDrawerOpen.update { !it }
    }

    fun dismissHappeningsHud() {
        _isHappeningsHudVisible.value = false
    }

    fun closeTranscriptDrawer() {
        _isTranscriptDrawerOpen.value = false
    }

    // --- Customization ---

    fun renamePill(pillId: String, newName: String) {
        when (pillId) {
            _orchestratorConfig.value.id -> _orchestratorConfig.update { it.copy(displayName = newName) }
            _editorConfig.value.id -> _editorConfig.update { it.copy(displayName = newName) }
            _aiConfig.value.id -> _aiConfig.update { it.copy(displayName = newName) }
            else -> {
                _customPills.update { map ->
                    val existing = map[pillId]
                    if (existing != null) map + (pillId to existing.copy(displayName = newName)) else map
                }
            }
        }
    }

    fun changePillColor(pillId: String, newColorArgb: Long) {
        when (pillId) {
            _orchestratorConfig.value.id -> _orchestratorConfig.update { it.copy(colorArgb = newColorArgb) }
            _editorConfig.value.id -> _editorConfig.update { it.copy(colorArgb = newColorArgb) }
            _aiConfig.value.id -> _aiConfig.update { it.copy(colorArgb = newColorArgb) }
            else -> {
                _customPills.update { map ->
                    val existing = map[pillId]
                    if (existing != null) map + (pillId to existing.copy(colorArgb = newColorArgb)) else map
                }
            }
        }
    }

    // --- Logging & Telemetry ---

    fun recordHappening(
        recognizedUtterance: String,
        actorRole: ActorRole,
        actionName: String,
        details: String,
        status: HappeningsEvent.EventStatus,
        actorColorArgb: Long? = null
    ) {
        val resolvedColor = actorColorArgb ?: when (actorRole) {
            ActorRole.ORCHESTRATOR_DICTATION -> _orchestratorConfig.value.colorArgb
            ActorRole.DETERMINISTIC_EDITOR -> _editorConfig.value.colorArgb
            ActorRole.GENERATIVE_AI -> _aiConfig.value.colorArgb
            ActorRole.CUSTOM -> _customPills.value.values.firstOrNull()?.colorArgb ?: 0xFF9E9E9EL
        }
        val event = HappeningsEvent(
            id = "evt_${_happenings.value.size + 1}_${kotlinx.datetime.Clock.System.now().toEpochMilliseconds()}",
            timestampMs = kotlinx.datetime.Clock.System.now().toEpochMilliseconds(),
            recognizedUtterance = recognizedUtterance,
            actorRole = actorRole,
            actorColorArgb = resolvedColor,
            actionName = actionName,
            details = details,
            status = status
        )
        _happenings.update { listOf(event) + it.take(29) } // Retain last 30 events
    }

    fun appendTranscript(
        speaker: String,
        text: String,
        confidence: Float,
        isFinal: Boolean
    ) {
        val entry = TranscriptEntry(
            id = "tr_${_transcript.value.size + 1}_${kotlinx.datetime.Clock.System.now().toEpochMilliseconds()}",
            timestampMs = kotlinx.datetime.Clock.System.now().toEpochMilliseconds(),
            speaker = speaker,
            text = text,
            confidence = confidence,
            isFinal = isFinal
        )
        _transcript.update { it + entry }
    }

    fun setOrchestratorStatus(status: ActorPillStatus) {
        _orchestratorStatus.value = status
    }

    fun setAiStatus(status: ActorPillStatus) {
        _aiStatus.value = status
    }
}
