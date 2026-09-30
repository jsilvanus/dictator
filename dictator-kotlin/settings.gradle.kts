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
        id("app.cash.sqldelight") version "2.0.2"
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        // Aidos SDK (docs/AIDOS_SDK_INTEGRATION_PLAN.md, D-4). Scoped by group so no other
        // dependency ever asks these repositories, and a missing GitHub token can only affect
        // the SDK itself.
        //
        // Local development: `cd <aidos>/sdk && gradle :client:publishToMavenLocal`, which
        // publishes version 0.1.0 to ~/.m2 — no token needed.
        // CI / releases: GitHub Packages, authenticated with `gpr.user`/`gpr.key` Gradle
        // properties or GITHUB_ACTOR/GITHUB_TOKEN (read:packages), with -PaidosSdkVersion=<version>.
        mavenLocal {
            content { includeGroup("fi.italeino.aidos.sdk") }
        }
        maven {
            name = "AidosGitHubPackages"
            url = uri("https://maven.pkg.github.com/jsilvanus/aidos")
            credentials {
                username = providers.gradleProperty("gpr.user")
                    .orElse(providers.environmentVariable("GITHUB_ACTOR")).orNull ?: "token"
                password = providers.gradleProperty("gpr.key")
                    .orElse(providers.environmentVariable("GITHUB_TOKEN")).orNull ?: ""
            }
            content { includeGroup("fi.italeino.aidos.sdk") }
        }
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

rootProject.name = "dictator"

include(":dictator-core")
include(":dictator-android")

