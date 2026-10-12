package com.dictator.android.data.shadow

import com.dictator.android.data.AidosEngineConnection
import com.dictator.core.util.voice.shadow.IntentSignal
import com.dictator.core.util.voice.shadow.ShadowIntentProbe
import fi.italeino.aidos.sdk.client.DecisionQuestionSpec
import fi.italeino.aidos.sdk.client.DecisionRequest
import fi.italeino.aidos.sdk.client.EngineAvailability

/**
 * Asks Aidos Engine's typed-decision endpoint (`/v1/systemone`, LAYA.md) what an utterance is, in one
 * model pass with two yes/no questions. Shadow mode only: it never prompts for approval, never
 * waits on a missing Engine, and returns null on any problem.
 *
 * The questions are the best zero-shot formulations measured in aidos `docs/system-one.md`; the base
 * model is weak at the second one, which is exactly what the shadow log is meant to quantify.
 */
class EngineIntentProbe(
    private val connection: AidosEngineConnection,
    private val modelId: String = DEFAULT_MODEL
) : ShadowIntentProbe {

    override suspend fun probe(utterance: String, language: String): IntentSignal? {
        // Already connected only: a shadow probe must not trigger the handshake/approval flow.
        if (connection.availability.value != EngineAvailability.Available) return null
        val response = connection.client.decide(
            DecisionRequest(
                model = modelId,
                state = utterance,
                questions = mapOf(
                    CMD to DecisionQuestionSpec.noul(
                        "The speaker is giving an instruction to the editor rather than dictating content."
                    ),
                    AI to DecisionQuestionSpec.noul(
                        "The speaker is asking an assistant to write, change or explain something."
                    )
                )
            )
        ) ?: return null
        val cmd = response.answers[CMD]?.noul ?: return null
        val ai = response.answers[AI]?.noul ?: return null
        return IntentSignal(commandProbability = cmd, aiRequestProbability = ai)
    }

    companion object {
        const val DEFAULT_MODEL = "laya-multilingual"
        private const val CMD = "cmd"
        private const val AI = "ai"
    }
}
