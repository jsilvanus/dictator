plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // Kotlin 2.x moves Compose off android.composeOptions onto its own plugin.
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.plugin.parcelize")
}

android {
    namespace = "com.dictator.android"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.dictator.android"
        minSdk = 28
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
        
        // API configuration
        buildConfigField("String", "API_BASE_URL", "\"http://localhost:3000\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_BASE_URL", "\"https://api.dictator.app\"")
        }
        debug {
            buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000\"")  // Android emulator localhost
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    testOptions {
        // android.jar is a stub in unit tests; return defaults instead of throwing on Android calls.
        unitTests.isReturnDefaultValues = true
    }

    buildFeatures {
        compose = true
        // AGP 8.x no longer enables this implicitly, and defaultConfig sets
        // custom buildConfigField values.
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

// The root build applies useJUnitPlatform() to every Test task; these are JUnit 4 tests.
tasks.withType<Test>().configureEach { useJUnit() }

kotlin {
    jvmToolchain(21)
    compilerOptions {
        freeCompilerArgs.add("-opt-in=androidx.compose.material3.ExperimentalMaterial3Api")
    }
}

dependencies {

    // Core library dependency (from dictator-core)
    implementation(project(":dictator-core"))

    // Aidos SDK client (docs/AIDOS_SDK_INTEGRATION_PLAN.md, D-1): handshake + loopback transport to
    // Aidos Engine. Deliberately the client artifact only — it has no dependency on Aidos's
    // `kernel` contract types. Its manifest brings the Engine handshake permission and the
    // package-visibility <queries> entry with it. See settings.gradle.kts for where this resolves.
    implementation("fi.italeino.aidos.sdk:aidos-sdk-client:${providers.gradleProperty("aidosSdkVersion").getOrElse("0.1.0")}")

    // Jetpack Compose
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Jetpack Lifecycle & ViewModel
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.1")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Koin: dictator-core already wires everything with it. Hilt was removed because no Hilt
    // release reads Kotlin 2.4 metadata and also supports AGP 8 (2.52 fails with "Provided
    // Metadata instance has version 2.4.0, while maximum supported version is 2.1.0"; 2.60
    // needs AGP 9), and it needed kapt, which is the fragile part of this toolchain.
    implementation("io.insert-koin:koin-android:3.4.3")
    implementation("io.insert-koin:koin-androidx-compose:3.4.6")

    // AndroidX
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.work:work-runtime-ktx:2.8.1")

    // Security & Crypto
    implementation("androidx.security:security-crypto:1.1.0-alpha06")


    // SQLDelight Android driver
    implementation("app.cash.sqldelight:android-driver:2.0.1")
    
    // DataStore for preferences
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")

    // Logging
    implementation("io.github.aakira:napier:2.6.1")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.1.0")
    testImplementation("org.mockito:mockito-core:5.5.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("org.jetbrains.kotlin:kotlin-test:2.4.10")

    androidTestImplementation(composeBom)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
