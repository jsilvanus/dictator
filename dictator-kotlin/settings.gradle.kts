pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }

    plugins {
        // D0 (docs/AIDOS_SDK_INTEGRATION_PLAN.md): Kotlin 2.4.10 and JVM 21 to match
        // Aidos, since a 2.4.10 AAR cannot be read by a 1.9.25 compiler.
        id("com.android.application") version "8.5.2"
        id("org.jetbrains.kotlin.android") version "2.4.10"
        id("org.jetbrains.kotlin.multiplatform") version "2.4.10"
        id("org.jetbrains.kotlin.plugin.serialization") version "2.4.10"
        // Kotlin 2.x moves Compose off composeOptions onto its own plugin.
        id("org.jetbrains.kotlin.plugin.compose") version "2.4.10"
        // Was declared as `kotlin-parcelize`, an alias with no marker artifact to
        // resolve — that alone made every Gradle invocation fail, core module
        // included. The resolvable id is the fully qualified one.
        id("org.jetbrains.kotlin.plugin.parcelize") version "2.4.10"
        // KSP has no release for Kotlin 2.4.10 (newest is 2.3.9), so Hilt stays on
        // kapt for now. The kapt plugin was never declared at all, which is why
        // `kapt(...)` was an unresolved reference.
        id("org.jetbrains.kotlin.kapt") version "2.4.10"
        id("com.google.dagger.hilt.android") version "2.52"
        id("app.cash.sqldelight") version "2.0.2"
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

rootProject.name = "dictator"

include(":dictator-core")
include(":dictator-android")

