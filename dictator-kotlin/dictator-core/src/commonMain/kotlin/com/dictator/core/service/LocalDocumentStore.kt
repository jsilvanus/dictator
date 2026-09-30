package com.dictator.core.service

import com.dictator.core.domain.entity.Document
import com.dictator.core.domain.entity.DocumentVersion
import com.dictator.core.domain.entity.Folder
import com.dictator.core.domain.entity.User
import com.dictator.core.domain.repository.DocumentRepository
import com.dictator.core.domain.repository.DocumentVersionRepository
import com.dictator.core.domain.repository.FolderRepository
import com.dictator.core.domain.repository.UserRepository
import kotlinx.datetime.Clock
import kotlin.random.Random

/** A document together with its latest saved text. */
data class LoadedDocument(val document: Document, val content: String)

/**
 * The offline-first document store the app works against when nobody is signed in to a Dictator
 * server. Documents belong to a fixed local user and root folder (created on first use), so the
 * rows satisfy the schema's foreign keys and can later be adopted by a real account for sync.
 *
 * The text of a document lives in [DocumentVersion] rows (the documents table has no content
 * column); every save appends one, and only the newest [MAX_VERSIONS] are kept.
 */
class LocalDocumentStore(
    private val documents: DocumentRepository,
    private val versions: DocumentVersionRepository,
    private val folders: FolderRepository,
    private val users: UserRepository,
    private val now: () -> Long = { Clock.System.now().toEpochMilliseconds() },
    private val device: String = "android"
) {
    companion object {
        const val LOCAL_USER_ID = "local"
        const val LOCAL_FOLDER_ID = "local-root"
        const val MAX_VERSIONS = 20
    }

    private var ready = false

    private suspend fun ensureWorkspace() {
        if (ready) return
        val t = now()
        if (users.getUserById(LOCAL_USER_ID) == null) {
            users.createUser(User(id = LOCAL_USER_ID, email = "local@device", name = "This device", createdAt = t))
        }
        if (folders.getFolderById(LOCAL_FOLDER_ID) == null) {
            folders.createFolder(Folder(id = LOCAL_FOLDER_ID, name = "Documents", userId = LOCAL_USER_ID, createdAt = t))
        }
        ready = true
    }

    /** Newest first. */
    suspend fun list(): List<Document> {
        ensureWorkspace()
        return documents.getDocumentsByUserId(LOCAL_USER_ID).sortedByDescending { it.updatedAt }
    }

    suspend fun create(title: String): Document {
        ensureWorkspace()
        val t = now()
        val doc = Document(
            id = "doc_${t}_${Random.nextInt(100000)}",
            title = title.ifBlank { "Untitled" },
            folderId = LOCAL_FOLDER_ID,
            userId = LOCAL_USER_ID,
            createdAt = t,
            updatedAt = t,
            lastModifiedDevice = device
        )
        val created = documents.createDocument(doc)
        appendVersion(created.id, "", 1)
        return created
    }

    suspend fun load(id: String): LoadedDocument? {
        ensureWorkspace()
        val doc = documents.getDocumentById(id) ?: return null
        val latest = versions.getVersionsByDocumentId(id).maxByOrNull { it.version }
        return LoadedDocument(doc, latest?.content.orEmpty())
    }

    suspend fun save(id: String, title: String, content: String): Document {
        ensureWorkspace()
        val doc = documents.getDocumentById(id) ?: error("Document not found: $id")
        val existing = versions.getVersionsByDocumentId(id)
        val next = (existing.maxOfOrNull { it.version } ?: 0) + 1
        appendVersion(id, content, next)
        existing.sortedByDescending { it.version }.drop(MAX_VERSIONS - 1).forEach { versions.deleteVersion(it.id) }
        return documents.updateDocument(
            doc.copy(
                title = title.ifBlank { "Untitled" },
                updatedAt = now(),
                lastModifiedDevice = device,
                deviceVersion = doc.deviceVersion + 1
            )
        )
    }

    suspend fun delete(id: String) {
        ensureWorkspace()
        versions.deleteByDocumentId(id)
        documents.deleteDocument(id)
    }

    private suspend fun appendVersion(documentId: String, content: String, number: Int) {
        versions.createVersion(
            DocumentVersion(
                id = "ver_${documentId}_$number",
                documentId = documentId,
                content = content,
                version = number,
                createdBy = LOCAL_USER_ID,
                createdAt = now(),
                deviceSource = device
            )
        )
    }
}
