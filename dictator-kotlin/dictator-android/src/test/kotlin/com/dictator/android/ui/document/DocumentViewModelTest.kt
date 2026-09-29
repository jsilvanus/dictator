package com.dictator.android.ui.document

import com.dictator.android.testutil.inMemoryStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class DocumentViewModelTest {
    private val store = inMemoryStore()

    @Before
    fun setup() { Dispatchers.setMain(UnconfinedTestDispatcher()) }

    @After
    fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `starts empty on a fresh install`() {
        val vm = DocumentViewModel(store)
        assertTrue(vm.state.value.documents.isEmpty())
        assertFalse(vm.state.value.isLoading)
    }

    @Test
    fun `created documents are persisted and listed newest first`() = runTest {
        val vm = DocumentViewModel(store)
        var firstId = ""
        var secondId = ""
        vm.createNewDocument("First") { firstId = it }
        vm.createNewDocument("Second") { secondId = it }
        assertEquals(listOf(secondId, firstId), vm.state.value.documents.map { it.id })
        // A new view model (app restart) sees them too.
        assertEquals(2, DocumentViewModel(store).state.value.documents.size)
    }

    @Test
    fun `delete removes from the store`() = runTest {
        val vm = DocumentViewModel(store)
        var id = ""
        vm.createNewDocument("Gone") { id = it }
        vm.deleteDocument(id)
        assertTrue(vm.state.value.documents.isEmpty())
        assertNull(store.load(id))
    }

    @Test
    fun `search filters by title ignoring case`() = runTest {
        val vm = DocumentViewModel(store)
        vm.createNewDocument("Sunday sermon") {}
        vm.createNewDocument("Shopping list") {}
        vm.onSearchQueryChanged("SERMON")
        assertEquals(listOf("Sunday sermon"), vm.getFilteredDocuments().map { it.title })
        vm.onSearchQueryChanged("nothing")
        assertTrue(vm.getFilteredDocuments().isEmpty())
    }

    @Test
    fun `select and dismiss the detail dialog`() = runTest {
        val vm = DocumentViewModel(store)
        vm.createNewDocument("Doc") {}
        val doc = vm.state.value.documents.first()
        vm.selectDocument(doc)
        assertEquals(doc.id, vm.state.value.selectedDocument?.id)
        assertTrue(vm.state.value.showDetailDialog)
        vm.dismissDetailDialog()
        assertFalse(vm.state.value.showDetailDialog)
    }
}
