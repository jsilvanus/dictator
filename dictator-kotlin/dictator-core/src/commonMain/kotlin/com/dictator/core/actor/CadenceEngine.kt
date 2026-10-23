package com.dictator.core.actor

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Orchestrates the temporal cadence for actor actions.
 * "Work, as a concept, requires time."
 *
 * Provides radial countdown progress, pause/resume (Spring & Freeze),
 * safety aborts, and staging state transitions.
 */
class CadenceEngine(
    private val scope: CoroutineScope,
    private val defaultTickIntervalMs: Long = 25L
) {
    private val _currentStatus = MutableStateFlow<ActorPillStatus>(ActorPillStatus.WaitingAmbient)
    val currentStatus: StateFlow<ActorPillStatus> = _currentStatus.asStateFlow()

    private var stagingJob: Job? = null

    // Paused state tracking
    private var activeTargetRange: TextRangeBounds? = null
    private var activeDurationMs: Long = 0L
    private var activeRemainingMs: Long = 0L
    private var activeDescription: String = ""
    private var activeGlyph: GlyphType = GlyphType.DELETE
    private var activeCommitAction: (suspend () -> Unit)? = null
    private var isCurrentlyPaused: Boolean = false

    /**
     * Determines duration in milliseconds based on operation severity.
     */
    fun calculateCadenceMs(severity: OperationSeverity): Long = when (severity) {
        OperationSeverity.DESTRUCTIVE -> 900L
        OperationSeverity.STRUCTURAL -> 500L
        OperationSeverity.MINOR -> 250L
    }

    /**
     * Stages an action with calibrated cadence.
     */
    fun stageAndExecute(
        targetRange: TextRangeBounds,
        severity: OperationSeverity,
        description: String,
        glyph: GlyphType,
        onCommit: suspend () -> Unit
    ): Job {
        abortCurrentAction()

        val totalDurationMs = calculateCadenceMs(severity)
        activeTargetRange = targetRange
        activeDurationMs = totalDurationMs
        activeRemainingMs = totalDurationMs
        activeDescription = description
        activeGlyph = glyph
        activeCommitAction = onCommit
        isCurrentlyPaused = false

        return startCountdown(totalDurationMs, totalDurationMs, targetRange, description, glyph, onCommit)
    }

    private fun startCountdown(
        totalDurationMs: Long,
        initialRemainingMs: Long,
        targetRange: TextRangeBounds,
        description: String,
        glyph: GlyphType,
        onCommit: suspend () -> Unit
    ): Job {
        val job = scope.launch {
            try {
                var remainingMs = initialRemainingMs
                while (remainingMs > 0) {
                    if (isCurrentlyPaused) {
                        delay(defaultTickIntervalMs)
                        continue
                    }

                    val progress = remainingMs.toFloat() / totalDurationMs.toFloat()
                    activeRemainingMs = remainingMs
                    _currentStatus.value = ActorPillStatus.CadenceStaging(
                        targetRange = targetRange,
                        durationMs = totalDurationMs,
                        remainingMs = remainingMs,
                        progress = progress,
                        actionDescription = description,
                        glyph = glyph,
                        isPaused = false
                    )
                    delay(defaultTickIntervalMs)
                    remainingMs -= defaultTickIntervalMs
                }

                if (!isCurrentlyPaused) {
                    _currentStatus.value = ActorPillStatus.CadenceStaging(
                        targetRange = targetRange,
                        durationMs = totalDurationMs,
                        remainingMs = 0L,
                        progress = 0f,
                        actionDescription = description,
                        glyph = glyph,
                        isPaused = false
                    )

                    onCommit()

                    // Brief commit flash (100ms)
                    _currentStatus.value = ActorPillStatus.CommitFlash(targetRange)
                    delay(100L)

                    clearActiveState()
                    _currentStatus.value = ActorPillStatus.WaitingAmbient
                }
            } catch (e: CancellationException) {
                clearActiveState()
                _currentStatus.value = ActorPillStatus.WaitingAmbient
                throw e
            }
        }

        stagingJob = job
        return job
    }

    /**
     * Pauses the countdown immediately (Spring & Freeze).
     */
    fun pause(): Boolean {
        if (stagingJob?.isActive == true && !isCurrentlyPaused) {
            isCurrentlyPaused = true
            val target = activeTargetRange
            if (target != null) {
                val progress = if (activeDurationMs > 0) activeRemainingMs.toFloat() / activeDurationMs.toFloat() else 0f
                _currentStatus.value = ActorPillStatus.CadenceStaging(
                    targetRange = target,
                    durationMs = activeDurationMs,
                    remainingMs = activeRemainingMs,
                    progress = progress,
                    actionDescription = activeDescription,
                    glyph = activeGlyph,
                    isPaused = true
                )
            }
            return true
        }
        return false
    }

    /**
     * Resumes a paused countdown.
     */
    fun resume(): Boolean {
        if (isCurrentlyPaused && stagingJob?.isActive == true) {
            isCurrentlyPaused = false
            return true
        }
        return false
    }

    /**
     * Aborts the active staging action safely before it commits.
     */
    fun abortCurrentAction(): Boolean {
        val wasActive = stagingJob?.isActive == true
        stagingJob?.cancel()
        stagingJob = null
        clearActiveState()
        _currentStatus.value = ActorPillStatus.WaitingAmbient
        return wasActive
    }

    private fun clearActiveState() {
        activeTargetRange = null
        activeDurationMs = 0L
        activeRemainingMs = 0L
        activeDescription = ""
        activeCommitAction = null
        isCurrentlyPaused = false
    }

    fun resetToAmbient() {
        abortCurrentAction()
        _currentStatus.value = ActorPillStatus.WaitingAmbient
    }

    fun setStatus(status: ActorPillStatus) {
        if (stagingJob?.isActive == true && status !is ActorPillStatus.CadenceStaging) {
            stagingJob?.cancel()
            stagingJob = null
            clearActiveState()
        }
        _currentStatus.value = status
    }
}
