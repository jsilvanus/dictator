package com.dictator.core.service

import app.cash.sqldelight.driver.jdbc.sqlite.JdbcSqliteDriver
import com.dictator.core.data.local.LocalDocumentRepository
import com.dictator.core.data.local.LocalDocumentVersionRepository
import com.dictator.core.data.local.LocalFolderRepository
import com.dictator.core.data.local.LocalUserRepository
import com.dictator.core.database.DictatorDatabase
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class LocalDocumentStoreTest {
    private var clock = 1_000L

    private fun store(): LocalDocumentStore {
        val driver = JdbcSqliteDriver("jdbc:sqlite:${java.io.File.createTempFile("dictator-test", ".db").also { it.deleteOnExit() }.absolutePath}", java.util.Properties().apply { setProperty("foreign_keys", "ON") })
        DictatorDatabase.Schema.create(driver)
        val db = DictatorDatabase(driver)
        return LocalDocumentStore(
            LocalDocumentRepository(db), LocalDocumentVersionRepository(db),
            LocalFolderRepository(db), LocalUserRepository(db), now = { clock++ }
        )
    }

    @Test
    fun `create, save, reload round trip with foreign keys on`() = runTest {
        val s = store()
        val doc = s.create("Sermon")
        s.save(doc.id, "Sermon draft", "Grace and peace.\nAmen.")
        val loaded = assertNotNull(s.load(doc.id))
        assertEquals("Sermon draft", loaded.document.title)
        assertEquals("Grace and peace.\nAmen.", loaded.content)
    }

    @Test
    fun `list is newest first and delete removes the document`() = runTest {
        val s = store()
        val a = s.create("A")
        val b = s.create("B")
        s.save(a.id, "A", "touched last")
        assertEquals(listOf(a.id, b.id), s.list().map { it.id })
        s.delete(a.id)
        assertEquals(listOf(b.id), s.list().map { it.id })
        assertNull(s.load(a.id))
    }

    @Test
    fun `only the newest versions are kept and the latest wins`() = runTest {
        val s = store()
        val doc = s.create("Long")
        repeat(LocalDocumentStore.MAX_VERSIONS + 10) { s.save(doc.id, "Long", "rev $it") }
        assertEquals("rev ${LocalDocumentStore.MAX_VERSIONS + 9}", s.load(doc.id)?.content)
    }
}
