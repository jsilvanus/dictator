package com.dictator.core.util.voice

import com.dictator.core.data.voice.ActivationCommand

/**
 * What one dictated utterance means. [Insert] carries text ready to append to the document.
 */
sealed class DictationAction {
    data class Insert(val text: String) : DictationAction()
    data class Command(val type: CommandType, val spoken: String) : DictationAction()
    data class AskAi(val prompt: String) : DictationAction()
    /** Said the command word but then something that is not a command; shown as a hint, never inserted. */
    data class UnknownCommand(val spoken: String) : DictationAction()
}

/**
 * Turns a recognizer transcript into an editor action.
 *
 * Why this exists instead of calling [VoiceCommandParser] directly: that parser matches command
 * words anywhere in the utterance, so dictating "he was bold and asked me to save the date" would
 * fire BOLD and SAVE. Here an utterance is a command only when it *starts* with the language's
 * activation word ("Computer …" / "Tietokone …"), and an AI request only when it starts with the AI
 * word ("Assistant …" / "Avustaja …") — the design the activation commands were made for. Everything
 * else is text. Spoken punctuation is limited to a small unambiguous set per language; the wider
 * [PunctuationNormalizer] map turns ordinary words like "plus" and "period" into symbols.
 */
object DictationInterpreter {

    private val punctuation: Map<String, Map<String, String>> = mapOf(
        "en" to mapOf(
            "full stop" to ".", "period" to ".", "comma" to ",", "question mark" to "?",
            "exclamation mark" to "!", "exclamation point" to "!", "colon" to ":", "semicolon" to ";"
        ),
        "fi" to mapOf(
            "piste" to ".", "pilkku" to ",", "kysymysmerkki" to "?", "huutomerkki" to "!",
            "kaksoispiste" to ":", "puolipiste" to ";"
        ),
        "sv" to mapOf(
            "punkt" to ".", "komma" to ",", "frågetecken" to "?", "utropstecken" to "!",
            "kolon" to ":", "semikolon" to ";"
        )
    )

    private val lineBreaks: Map<String, Map<String, String>> = mapOf(
        "en" to mapOf("new paragraph" to "\n\n", "new line" to "\n"),
        "fi" to mapOf("uusi kappale" to "\n\n", "uusi rivi" to "\n"),
        "sv" to mapOf("nytt stycke" to "\n\n", "ny rad" to "\n")
    )

    /** Spoken command → type, for the languages VoiceCommandParser has no patterns for. */
    private val localCommands: Map<String, Map<String, CommandType>> = mapOf(
        "fi" to mapOf(
            "uusi rivi" to CommandType.NEW_LINE, "uusi kappale" to CommandType.NEW_PARAGRAPH,
            "kumoa" to CommandType.UNDO, "tee uudelleen" to CommandType.REDO,
            "poista sana" to CommandType.DELETE_WORD, "poista rivi" to CommandType.DELETE_LINE,
            "tallenna" to CommandType.SAVE, "lihavoi" to CommandType.BOLD, "kursivoi" to CommandType.ITALIC
        ),
        "sv" to mapOf(
            "ny rad" to CommandType.NEW_LINE, "nytt stycke" to CommandType.NEW_PARAGRAPH,
            "ångra" to CommandType.UNDO, "gör om" to CommandType.REDO,
            "ta bort ord" to CommandType.DELETE_WORD, "ta bort rad" to CommandType.DELETE_LINE,
            "spara" to CommandType.SAVE
        )
    )

    /**
     * @param language BCP-47 tag such as "fi-FI"; only the primary subtag selects vocabulary.
     * @param existingText document text before the cursor, used to decide capitalization.
     */
    fun interpret(
        utterance: String,
        language: String,
        activationCommands: List<ActivationCommand>,
        existingText: String = ""
    ): DictationAction {
        val lang = language.substringBefore('-').lowercase()
        val trimmed = utterance.trim()
        if (trimmed.isEmpty()) return DictationAction.Insert("")

        val commandWords = activationCommands.filter { it.type == "command" }.flatMap { it.phrases }
        val aiWords = activationCommands.filter { it.type == "ai" }.flatMap { it.phrases }

        stripActivation(trimmed, commandWords)?.let { rest ->
            return parseCommand(rest, lang)
        }
        stripActivation(trimmed, aiWords)?.let { rest ->
            return if (rest.isBlank()) DictationAction.UnknownCommand(trimmed) else DictationAction.AskAi(rest)
        }

        return DictationAction.Insert(formatText(trimmed, lang, existingText))
    }

    private fun stripActivation(text: String, phrases: List<String>): String? {
        for (phrase in phrases.sortedByDescending { it.length }) {
            val match = Regex("^${Regex.escape(phrase.trim())}\\b[\\s,:.\\-]*", RegexOption.IGNORE_CASE).find(text)
            if (match != null) return text.substring(match.range.last + 1).trim()
        }
        return null
    }

    private fun parseCommand(rest: String, lang: String): DictationAction {
        val spoken = rest.trim().trimEnd('.', ',', '!', '?').lowercase()
        if (spoken.isEmpty()) return DictationAction.UnknownCommand(rest)
        localCommands[lang]?.get(spoken)?.let { return DictationAction.Command(it, spoken) }
        // Whole-phrase match only: VoiceCommandParser finds words anywhere, which is fine after an
        // explicit activation word but must not swallow a longer sentence.
        val parsed = VoiceCommandParser.parseCommand(spoken)
        return if (parsed != null && parsed.matchedPattern.trim().equals(spoken, ignoreCase = true)) {
            DictationAction.Command(parsed.type, spoken)
        } else {
            DictationAction.UnknownCommand(spoken)
        }
    }

    /** Spoken punctuation and line breaks → symbols, spacing repaired, first letter capitalized in context. */
    fun formatText(text: String, lang: String, existingText: String): String {
        var out = text
        for ((phrase, brk) in lineBreaks[lang].orEmpty() + lineBreaks["en"].orEmpty().takeIf { lang != "en" }.orEmpty()) {
            out = out.replace(Regex("\\s*\\b${Regex.escape(phrase)}\\b\\s*", RegexOption.IGNORE_CASE), brk)
        }
        for ((phrase, mark) in punctuation[lang] ?: punctuation.getValue("en")) {
            out = out.replace(Regex("\\s*\\b${Regex.escape(phrase)}\\b", RegexOption.IGNORE_CASE), mark)
        }
        out = out.replace(Regex("[ \\t]{2,}"), " ").trim()
        return capitalizeForContext(out, existingText)
    }

    private fun capitalizeForContext(text: String, existingText: String): String {
        if (text.isEmpty()) return text
        val before = existingText.trimEnd(' ', '\t')
        val startsSentence = before.isEmpty() || before.last() in ".!?\n"
        var result = text
        if (startsSentence) result = result.replaceFirstChar { it.uppercase() }
        // Capitalize after sentence punctuation inside the utterance itself.
        result = Regex("([.!?]\\s+|\\n)(\\p{Ll})").replace(result) { it.groupValues[1] + it.groupValues[2].uppercase() }
        return result
    }

    /**
     * The string to append to [existing] so a new utterance joins it with sensible spacing:
     * a leading space unless the text starts with punctuation / a line break or [existing] ends in
     * whitespace.
     */
    fun joinWithSpace(existing: String, insertion: String): String {
        if (insertion.isEmpty()) return insertion
        if (existing.isEmpty() || existing.last().isWhitespace()) return insertion
        val first = insertion.first()
        return if (first.isWhitespace() || first in ".,!?;:)") insertion else " $insertion"
    }
}
