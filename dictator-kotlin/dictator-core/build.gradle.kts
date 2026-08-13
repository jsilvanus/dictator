plugins {
    kotlin("multiplatform") version "1.9.23"
    kotlin("plugin.serialization") version "1.9.23"
    id("com.squareup.sqldelight") version "2.0.1"
}

kotlin {
    // Multiplatform configuration
    jvm {
        compilations.all {
            kotlinOptions {
                jvmTarget = "11"
            }
        }
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                // Kotlin standard library
                implementation(kotlin("stdlib"))

                // Coroutines
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

                // Serialization
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")

                // DateTime
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.4.0")

                // UUID
                implementation("com.benasher44:uuid:0.8.0")

                // SQLDelight
                implementation("app.cash.sqldelight:runtime:2.0.1")

                // Ktor Client (multiplatform)
                implementation("io.ktor:ktor-client-core:2.3.4")

                // Koin DI
                implementation("io.insert-koin:koin-core:3.4.0")

                // Logging
                implementation("io.github.aakira:napier:2.6.1")
            }
        }

        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
            }
        }

        val jvmMain by getting {
            dependencies {
                // Ktor Client engine for JVM
                implementation("io.ktor:ktor-client-okhttp:2.3.4")

                // SQLite driver for JVM
                implementation("app.cash.sqldelight:sqlite-driver:2.0.1")

                // Logging implementation
                implementation("org.slf4j:slf4j-api:2.0.9")
                implementation("org.slf4j:slf4j-simple:2.0.9")
            }
        }

        val jvmTest by getting {
            dependencies {
                implementation("junit:junit:4.13.2")
                implementation("org.mockito.kotlin:mockito-kotlin:5.1.0")
                implementation("org.mockito:mockito-core:5.5.0")
            }
        }
    }
}

sqldelight {
    databases {
        create("DictatorDatabase") {
            packageName.set("com.dictator.core.database")
            schemaOutputDirectory.set(file("src/commonMain/sqldelight"))
            deriveSchemaFromMigrations.set(true)
        }
    }
}
