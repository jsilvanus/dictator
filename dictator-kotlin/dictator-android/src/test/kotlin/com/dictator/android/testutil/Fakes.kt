package com.dictator.android.testutil

import com.dictator.android.data.dictation.DictationEngine
import com.dictator.android.data.dictation.DictationEngineKind
import com.dictator.android.data.dictation.DictationEngines
import com.dictator.android.data.dictation.DictationListener
import com.dictator.core.domain.entity.Document
import com.dictator.core.domain.entity.DocumentVersion
import com.dictator.core.domain.entity.Folder
import com.dictator.core.domain.entity.User
import com.dictator.core.domain.repository.DocumentRepository
import com.dictator.core.domain.repository.DocumentVersionRepository
import com.dictator.core.domain.repository.FolderRepository
import com.dictator.core.domain.repository.UserRepository
import com.dictator.core.service.LocalDocumentStore
import com.dictator.core.service.SharedPreferences
import fi.italeino.aidos.sdk.client.AidosEngineClient
import fi.italeino.aidos.sdk.client.ChatCompletionChunk
import fi.italeino.aidos.sdk.client.ChatCompletionRequest
import fi.italeino.aidos.sdk.client.ChatCompletionResponse
import fi.italeino.aidos.sdk.client.EmbeddingsRequest
import fi.italeino.aidos.sdk.client.EmbeddingsResponse
import fi.italeino.aidos.sdk.client.EngineAvailability
import fi.italeino.aidos.sdk.client.EngineCapabilities
import fi.italeino.aidos.sdk.client.TranscriptionRequest
import fi.italeino.aidos.sdk.client.TranscriptionResponse
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.emptyFlow

class FakePrefs(initial: Map<String, String> = emptyMap()) : SharedPreferences {
    val map = initial.toMutableMap()
    override fun getString(key: String, defaultValue: String?): String? = map[key] ?: defaultValue
    override fun setString(key: String, value: String) { map[key] = value }
    override fun remove(key: String) { map.remove(key) }
    override fun clear() { map.clear() }
}

private class MemDocs : DocumentRepository {
    val rows = linkedMapOf<String, Document>()
    override suspend fun getDocumentById(id: String) = rows[id]
    override suspend fun getDocumentsByUserId(userId: String) = rows.values.filter { it.userId == userId }
    override suspend fun getDocumentsByFolderId(folderId: String) = rows.values.filter { it.folderId == folderId }
    override suspend fun createDocument(document: Document): Document { rows[document.id] = document; return document }
    override suspend fun updateDocument(document: Document): Document { rows[document.id] = document; return document }
    override suspend fun deleteDocument(id: String) = rows.remove(id) != null
    override suspend fun deleteByUserId(userId: String) = true
    override fun observeDocument(id: String): Flow<Document?> = MutableStateFlow(rows[id])
    override fun observeDocumentsByUserId(userId: String): Flow<List<Document>> = MutableStateFlow(emptyList())
}

private class MemVersions : DocumentVersionRepository {
    val rows = mutableListOf<DocumentVersion>()
    override suspend fun getVersionById(id: String) = rows.firstOrNull { it.id == id }
    override suspend fun getVersionsByDocumentId(documentId: String) = rows.filter { it.documentId == documentId }
    override suspend fun getVersionsSince(documentId: String, timestamp: Long) = rows.filter { it.documentId == documentId && it.createdAt >= timestamp }
    override suspend fun createVersion(version: DocumentVersion): DocumentVersion { rows += version; return version }
    override suspend fun deleteByDocumentId(documentId: String) = rows.removeAll { it.documentId == documentId }
    override suspend fun deleteVersion(id: String) = rows.removeAll { it.id == id }
    override fun observeVersions(documentId: String): Flow<List<DocumentVersion>> = MutableStateFlow(emptyList())
}

private class MemFolders : FolderRepository {
    val rows = mutableMapOf<String, Folder>()
    override suspend fun getFolderById(id: String) = rows[id]
    override suspend fun getFoldersByUserId(userId: String) = rows.values.filter { it.userId == userId }
    override suspend fun getFoldersByParentId(parentId: String?) = rows.values.filter { it.parentId == parentId }
    override suspend fun createFolder(folder: Folder): Folder { rows[folder.id] = folder; return folder }
    override suspend fun updateFolder(folder: Folder): Folder { rows[folder.id] = folder; return folder }
    override suspend fun deleteFolder(id: String) = rows.remove(id) != null
    override suspend fun deleteByUserId(userId: String) = true
}

private class MemUsers : UserRepository {
    val rows = mutableMapOf<String, User>()
    override suspend fun getUserById(id: String) = rows[id]
    override suspend fun getUserByEmail(email: String) = rows.values.firstOrNull { it.email == email }
    override suspend fun createUser(user: User): User { rows[user.id] = user; return user }
    override suspend fun updateUser(user: User): User { rows[user.id] = user; return user }
    override suspend fun deleteUser(id: String) = rows.remove(id) != null
}

/** A real [LocalDocumentStore] over in-memory repositories; each call advances the clock so ordering is stable. */
fun inMemoryStore(): LocalDocumentStore {
    var clock = 1_000L
    return LocalDocumentStore(MemDocs(), MemVersions(), MemFolders(), MemUsers(), now = { clock++ })
}

/** A dictation engine the test drives by hand. */
class FakeDictationEngine(private val unavailable: String? = null) : DictationEngine {
    override val kind = DictationEngineKind.SYSTEM
    var listener: DictationListener? = null
    var startedLanguage: String? = null
    var stopped = false
    override suspend fun unavailableReason() = unavailable
    override fun start(language: String, listener: DictationListener) { startedLanguage = language; this.listener = listener; listener.onListening() }
    override fun stop() { stopped = true; listener?.onStopped() }
    override fun cancel() { listener = null }
    fun say(text: String) = listener!!.onFinal(text)
}

class FakeEngines(val engine: FakeDictationEngine = FakeDictationEngine(), private val kind: DictationEngineKind = DictationEngineKind.SYSTEM) : DictationEngines {
    override fun selectedKind() = kind
    override fun create(): DictationEngine = engine
}

/** Aidos SDK client with scripted answers. */
class FakeAidosClient(
    var state: EngineAvailability = EngineAvailability.Available,
    var capabilities: EngineCapabilities = EngineCapabilities(
        endpoints = listOf("chat.completions", "audio.transcriptions"),
        models = listOf(
            fi.italeino.aidos.sdk.client.EngineModel("llm-1", "llm"),
            fi.italeino.aidos.sdk.client.EngineModel("whisper-1", "stt")
        )
    ),
    var chat: ChatCompletionResponse? = null,
    var stream: List<ChatCompletionChunk> = emptyList(),
    var transcription: TranscriptionResponse? = null
) : AidosEngineClient {
    var initializeCalls = 0
    val chatRequests = mutableListOf<ChatCompletionRequest>()
    val transcribeRequests = mutableListOf<TranscriptionRequest>()
    override suspend fun initialize(): Boolean { initializeCalls++; return state == EngineAvailability.Available }
    override fun isAvailable() = state == EngineAvailability.Available
    override fun availability() = state
    override fun apiVersion() = 1
    override suspend fun capabilities() = capabilities
    override suspend fun request(endpoint: String, method: String, body: String?): String? = null
    override suspend fun supportsEndpoint(endpoint: String) = true
    override suspend fun chatCompletion(request: ChatCompletionRequest): ChatCompletionResponse? { chatRequests += request; return chat }
    override fun streamChatCompletion(request: ChatCompletionRequest): Flow<ChatCompletionChunk> {
        chatRequests += request
        return if (stream.isEmpty()) emptyFlow() else kotlinx.coroutines.flow.flowOf(*stream.toTypedArray())
    }
    override suspend fun embeddings(request: EmbeddingsRequest): EmbeddingsResponse? = null
    override suspend fun transcribe(request: TranscriptionRequest): TranscriptionResponse? { transcribeRequests += request; return transcription }
    override fun close() {}
}
