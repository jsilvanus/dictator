// Root build.gradle.kts - Version catalogs and shared configuration
plugins {
    kotlin("jvm") version "1.9.23" apply false
    kotlin("multiplatform") version "1.9.23" apply false
    id("com.squareup.sqldelight") version "2.0.1" apply false
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

subprojects {
    tasks.withType<Test> {
        useJUnitPlatform()
    }
}
