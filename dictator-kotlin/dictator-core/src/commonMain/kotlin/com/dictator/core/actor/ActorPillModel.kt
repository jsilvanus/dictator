package com.dictator.core.actor

import kotlinx.serialization.Serializable

/**
 * The functional role and archetype of an Actor Pill.
 */
@Serializable
enum class ActorRole {
    /** Voice dictation orchestrator (Red pill, anchored at cursor). */
    ORCHESTRATOR_DICTATION,

    /** Deterministic text editor (Blue pill, executes text commands with cadence). */
    DETERMINISTIC_EDITOR,

    /** Generative AI agent (Green pill, writes/rewrites text streaming from its tip). */
    GENERATIVE_AI,

    /** User-defined or plugin-supplied actor. */
    CUSTOM
}

/**
 * Visual glyph / icon represented within the pill.
 */
@Serializable
enum class GlyphType {
    MIC,
    TEXT_CARET,
    SPARK,
    DELETE,
    SCISSORS,
    SELECTION,
    CHECK,
    CLOCK,
    QUESTION
}

/**
 * Operation impact severity used by the CadenceEngine to determine human-verification time.
 * "Work, as a concept, requires time."
 */
@Serializable
enum class OperationSeverity {
    /** Deleting paragraphs, wiping sections, clearing documents (800ms - 1200ms). */
    DESTRUCTIVE,

    /** Moving text, rephrasing, formatting blocks, wrapping structures (500ms). */
    STRUCTURAL,

    /** Single word edit, punctuation fix, small caret jump (250ms). */
    MINOR
}

/**
 * Character range in a text document.
 */
@Serializable
data class TextRangeBounds(
    val startChar: Int,
    val endChar: Int
) {
    val length: Int get() = kotlin.math.max(0, endChar - startChar)
}

/**
 * Spatial coordinate anchor for pills in the editor canvas.
 */
@Serializable
data class SpatialPoint(
    val x: Float,
    val y: Float
)

/**
 * Configuration and customization properties for an Actor Pill.
 * All pills are renameable and color-changeable.
 */
@Serializable
data class ActorPillConfig(
    val id: String,
    val role: ActorRole,
    val displayName: String,
    val colorArgb: Long,
    val defaultGlyph: GlyphType,
    val isRenameable: Boolean = true,
    val isColorChangeable: Boolean = true
) {
    companion object {
        const val DEFAULT_RED_ORCHESTRATOR = 0xFFEF4444L
        const val DEFAULT_BLUE_EDITOR = 0xFF3B82F6L
        const val DEFAULT_GREEN_AI = 0xFF10B981L

        fun createDefaultOrchestrator(
            id: String = "actor_orchestrator",
            name: String = "Sanelu"
        ) = ActorPillConfig(
            id = id,
            role = ActorRole.ORCHESTRATOR_DICTATION,
            displayName = name,
            colorArgb = DEFAULT_RED_ORCHESTRATOR,
            defaultGlyph = GlyphType.MIC
        )

        fun createDefaultEditor(
            id: String = "actor_editor",
            name: String = "Muokkain"
        ) = ActorPillConfig(
            id = id,
            role = ActorRole.DETERMINISTIC_EDITOR,
            displayName = name,
            colorArgb = DEFAULT_BLUE_EDITOR,
            defaultGlyph = GlyphType.TEXT_CARET
        )

        fun createDefaultAi(
            id: String = "actor_ai",
            name: String = "Tekoäly"
        ) = ActorPillConfig(
            id = id,
            role = ActorRole.GENERATIVE_AI,
            displayName = name,
            colorArgb = DEFAULT_GREEN_AI,
            defaultGlyph = GlyphType.SPARK
        )
    }
}

/**
 * Execution and animation state of an Actor Pill.
 */
sealed interface ActorPillStatus {
    /** Active but waiting: Ambient sinusoidal pulse at its anchor. */
    object WaitingAmbient : ActorPillStatus

    /** In flight: Gliding across the document surface to a new target. */
    data class InFlight(
        val from: SpatialPoint,
        val to: SpatialPoint,
        val progress: Float = 0f
    ) : ActorPillStatus

    /** Active and working: Processing, streaming tokens, or running pipeline. */
    data class WorkingGeneric(
        val progress: Float? = null,
        val statusMessage: String? = null
    ) : ActorPillStatus

    /** Active and working on THIS: Directional notch pointing at target text range. */
    data class WorkingOnTarget(
        val targetRange: TextRangeBounds,
        val glyph: GlyphType
    ) : ActorPillStatus

    /**
     * Cadence Staging: Human-friendly countdown before execution.
     * Displays a radial countdown ring and soft target highlight.
     */
    data class CadenceStaging(
        val targetRange: TextRangeBounds,
        val durationMs: Long,
        val remainingMs: Long,
        val progress: Float, // 1.0 down to 0.0
        val actionDescription: String,
        val glyph: GlyphType,
        val isPaused: Boolean = false
    ) : ActorPillStatus

    /** Commit Flash: 100ms crisp execution snap / feedback beat. */
    data class CommitFlash(
        val targetRange: TextRangeBounds
    ) : ActorPillStatus

    /** Holding Selection: Blue pill anchoring selected text in its shelf. */
    data class HoldingSelection(
        val selectedRange: TextRangeBounds,
        val wordCount: Int
    ) : ActorPillStatus

    /** Ambiguity / Disambiguation: Gentle wobble asking for user confirmation. */
    data class Disambiguation(
        val query: String
    ) : ActorPillStatus
}

/**
 * Event recorded for the 1-click Happenings HUD.
 */
@Serializable
data class HappeningsEvent(
    val id: String,
    val timestampMs: Long,
    val recognizedUtterance: String,
    val actorRole: ActorRole,
    val actorColorArgb: Long,
    val actionName: String,
    val details: String,
    val status: EventStatus
) {
    enum class EventStatus {
        STAGED,
        COMMITTED,
        ABORTED
    }
}

/**
 * Entry for the 2-click 50% split transcript drawer.
 */
@Serializable
data class TranscriptEntry(
    val id: String,
    val timestampMs: Long,
    val speaker: String,
    val text: String,
    val confidence: Float,
    val isFinal: Boolean
)
