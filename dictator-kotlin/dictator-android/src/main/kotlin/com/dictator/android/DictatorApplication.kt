package com.dictator.android

import android.app.Application
import com.dictator.android.data.AndroidDatabaseDriverProvider
import com.dictator.core.DictatorCore
import dagger.hilt.android.HiltAndroidApp
import io.github.aakira.napier.Napier
import io.github.aakira.napier.log

/**
 * Dictator Application entry point.
 * Initializes Hilt DI and Dictator Core services.
 */
@HiltAndroidApp
class DictatorApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Initialize Dictator Core with the Android SQLDelight driver.
        DictatorCore.initialize(AndroidDatabaseDriverProvider(this))

        Napier.log { "DictatorApplication initialized" }
    }
}
