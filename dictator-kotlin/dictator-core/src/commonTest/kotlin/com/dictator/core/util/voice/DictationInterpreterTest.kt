package com.dictator.core.util.voice

import com.dictator.core.data.voice.DEFAULT_ENGLISH_ACTIVATION_COMMANDS
import com.dictator.core.data.voice.DEFAULT_FINNISH_ACTIVATION_COMMANDS
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class DictationInterpreterTest {
    private val en = DEFAULT_ENGLISH_ACTIVATION_COMMANDS
    private val fi = DEFAULT_FINNISH_ACTIVATION_COMMANDS

    private fun interpret(text: String, lang: String = "en-US", existing: String = "") =
        DictationInterpreter.interpret(text, lang, if (lang.startsWith("fi")) fi else en, existing)

    @Test
    fun `command words inside prose are text not commands`() {
        val action = interpret("he was bold and asked me to save the date")
        assertEquals(DictationAction.Insert("He was bold and asked me to save the date"), action)
    }

    @Test
    fun `activation word makes a command`() {
        assertEquals(DictationAction.Command(CommandType.SAVE, "save"), interpret("Computer save"))
        assertEquals(DictationAction.Command(CommandType.NEW_PARAGRAPH, "new paragraph"), interpret("computer, new paragraph."))
    }

    @Test
    fun `activation word followed by a sentence is not swallowed as a command`() {
        assertIs<DictationAction.UnknownCommand>(interpret("Computer please save the date"))
    }

    @Test
    fun `ai word carries the prompt`() {
        assertEquals(DictationAction.AskAi("summarize this paragraph"), interpret("Assistant summarize this paragraph"))
    }

    @Test
    fun `activation word must be a whole word`() {
        assertEquals(DictationAction.Insert("Computers are useful"), interpret("computers are useful"))
    }

    @Test
    fun `spoken punctuation and capitalization in context`() {
        assertEquals(
            DictationAction.Insert("Grace and peace, amen."),
            interpret("grace and peace comma amen full stop")
        )
        assertEquals(DictationAction.Insert("Next sentence"), interpret("next sentence", existing = "First sentence."))
        assertEquals(DictationAction.Insert("continues here"), interpret("continues here", existing = "Half a sentence"))
    }

    @Test
    fun `plus and percent stay words`() {
        assertEquals(DictationAction.Insert("A plus and ten percent"), interpret("a plus and ten percent"))
    }

    @Test
    fun `finnish commands and punctuation`() {
        assertEquals(DictationAction.Command(CommandType.NEW_PARAGRAPH, "uusi kappale"), interpret("Tietokone uusi kappale", "fi-FI"))
        assertEquals(DictationAction.Command(CommandType.UNDO, "kumoa"), interpret("tietokone kumoa", "fi-FI"))
        assertEquals(DictationAction.AskAi("tiivistä tämä"), interpret("Avustaja tiivistä tämä", "fi-FI"))
        assertEquals(
            DictationAction.Insert("Herra on minun paimeneni, en minä mitään puutu."),
            interpret("herra on minun paimeneni pilkku en minä mitään puutu piste", "fi-FI")
        )
    }

    @Test
    fun `spoken line breaks`() {
        assertEquals(DictationAction.Insert("One\n\nTwo"), interpret("one new paragraph two"))
    }

    @Test
    fun `joinWithSpace spacing`() {
        assertEquals(" world", DictationInterpreter.joinWithSpace("hello", "world"))
        assertEquals("world", DictationInterpreter.joinWithSpace("hello ", "world"))
        assertEquals(".", DictationInterpreter.joinWithSpace("hello", "."))
        assertEquals("\nx", DictationInterpreter.joinWithSpace("hello", "\nx"))
        assertEquals("first", DictationInterpreter.joinWithSpace("", "first"))
    }
}
