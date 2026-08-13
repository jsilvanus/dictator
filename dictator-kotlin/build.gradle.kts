// Root build.gradle.kts - Shared configuration

subprojects {
    tasks.withType<Test> {
        useJUnitPlatform()
    }
}

