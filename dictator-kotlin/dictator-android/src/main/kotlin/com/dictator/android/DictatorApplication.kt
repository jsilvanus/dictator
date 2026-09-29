package com.dictator.android

import android.app.Application
import com.dictator.android.data.AidosEngineConnection
import com.dictator.android.data.AndroidDatabaseDriverProvider
import com.dictator.core.DictatorCore
import dagger.hilt.android.HiltAndroidApp
import io.github.aakira.napier.Napier
import io.github.aakira.napier.log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Dictator Application entry point.
 * Initializes Hilt DI and Dictator Core services.
 */
@HiltAndroidApp
class DictatorApplication : Application() {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    /** Link to Aidos Engine (via the Aidos SDK); see [AidosEngineConnection]. */
    val aidosEngine: AidosEngineConnection by lazy { AidosEngineConnection.create(this) }

    override fun onCreate() {
        super.onCreate()

        // Initialize Dictator Core with the Android SQLDelight driver.
        DictatorCore.initialize(AndroidDatabaseDriverProvider(this))

        // Announce ourselves to Aidos Engine at launch. On a device where Engine is installed and
        // Dictator is not yet approved, this is what makes Dictator's first permission request
        // appear in Engine (notification + Connected Apps); it is harmless when Engine is absent.
        appScope.launch {
            val availability = aidosEngine.connect()
            Napier.i("Aidos Engine: $availability")
        }

        Napier.log { "DictatorApplication initialized" }
    }
}
