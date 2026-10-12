package com.dictator.core.util.voice.shadow

import com.dictator.core.util.voice.DictationAction
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * What a typed-decision model (Aidos Engine "System One", LAYA.md) thinks an utterance is.
 * Probabilities are the model's own and are not calibrated.
 */
data class IntentSignal(
    /** P(the speaker is instructing the editor rather than dictating content). */
    val commandProbability: Double,
    /** P(the speaker is asking an assistant to write, change or explain something). */
    val aiRequestProbability: Double
)

/** Asks a model for an [IntentSignal]; null when the model is unavailable. Must never throw to callers that need not care. */
fun interface ShadowIntentProbe {
    suspend fun probe(utterance: String, language: String): IntentSignal?
}

/** Where one JSON line per utterance goes. */
fun interface ShadowSink {
    fun append(line: String)
}

/**
 * Shadow mode for intent routing: records what a model *would* have said beside what the deterministic
 * [com.dictator.core.util.voice.DictationInterpreter] *did*. Nothing here changes behaviour; callers run
 * [record] off the dictation path and ignore its result.
 *
 * Privacy: church dictation is personal data. Recording is off unless [enabled], and the utterance text
 * itself is written only when [storeText] is on; otherwise a line holds lengths and probabilities only,
 * which is enough to see agreement rates but not to evaluate individual mistakes.
 */
class ShadowIntentRecorder(
    private val probe: ShadowIntentProbe,
    private val sink: ShadowSink,
    private val enabled: () -> Boolean,
    private val storeText: () -> Boolean,
    private val nowMillis: () -> Long
) {
    suspend fun record(utterance: String, language: String, action: DictationAction) {
        if (!enabled() || utterance.isBlank()) return
        val signal = try {
            probe.probe(utterance, language)
        } catch (e: kotlin.coroutines.cancellation.CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        } ?: return
        val parser = parserKind(action)
        val modelSaysCommand = signal.commandProbability >= COMMAND_THRESHOLD
        // The costly direction for a dictation app: the parser would type it, the model thinks it is a command.
        val disagreement = when (action) {
            is DictationAction.Insert -> if (modelSaysCommand) "model_command_parser_insert" else null
            is DictationAction.Command -> if (!modelSaysCommand) "model_text_parser_command" else null
            else -> null
        }
        val line = buildJsonObject {
            put("ts", nowMillis())
            put("lang", language)
            put("parser", parser)
            put("command_p", signal.commandProbability)
            put("ai_p", signal.aiRequestProbability)
            put("chars", utterance.length)
            put("words", utterance.trim().split(Regex("\\s+")).size)
            if (disagreement != null) put("disagreement", disagreement)
            if (storeText()) put("text", utterance)
        }.toString()
        try {
            sink.append(line)
        } catch (e: Exception) {
            // Logging must never break dictation.
        }
    }

    companion object {
        const val COMMAND_THRESHOLD = 0.5

        fun parserKind(action: DictationAction): String = when (action) {
            is DictationAction.Insert -> "insert"
            is DictationAction.Command -> "command"
            is DictationAction.AskAi -> "ask_ai"
            is DictationAction.UnknownCommand -> "unknown_command"
        }
    }
}
