package com.dictator.android

import android.app.Application
import com.dictator.android.BuildConfig
import com.dictator.android.data.AidosEngineConnection
import com.dictator.android.data.AndroidDatabaseDriverProvider
import com.dictator.android.di.androidKoinModule
import com.dictator.core.DictatorCore
import io.github.aakira.napier.Napier
import io.github.aakira.napier.DebugAntilog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Dictator Application entry point.
 * Initializes Dictator Core (which starts Koin) and the Android additions.
 */
class DictatorApplication : Application() {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    /** Link to Aidos Engine (via the Aidos SDK); see [AidosEngineConnection]. */
    val aidosEngine: AidosEngineConnection by lazy { AidosEngineConnection.create(this) }

    override fun onCreate() {
        super.onCreate()

        // Without an Antilog Napier drops every message, including the Aidos handshake result.
        if (BuildConfig.DEBUG) Napier.base(DebugAntilog())

        // Initialize Dictator Core with the Android SQLDelight driver.
        DictatorCore.initialize(
            AndroidDatabaseDriverProvider(this),
            additionalModules = listOf(androidKoinModule(this, aidosEngine))
        )

        // Announce ourselves to Aidos Engine at launch. On a device where Engine is installed and
        // Dictator is not yet approved, this is what makes Dictator's first permission request
        // appear in Engine (notification + Connected Apps); it is harmless when Engine is absent.
        appScope.launch {
            val availability = aidosEngine.connect()
            Napier.i("Aidos Engine: $availability")
        }

        Napier.i("DictatorApplication initialized")
    }
}
