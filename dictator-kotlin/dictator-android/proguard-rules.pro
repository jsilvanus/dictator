# Proguard rules for Dictator Android app

# Keep all public classes and methods
-keep public class * { public *; }

# Keep Compose-related classes
-keep @androidx.compose.runtime.Composable class *

# Keep Hilt-related classes
-keep class * extends dagger.internal.DaggerGenerated
-keep @dagger.hilt.* class *
-keep class dagger.hilt.* { *; }

# Keep Jetpack components
-keep class androidx.** { *; }
-keep public class androidx.** { public *; }

# Keep Kotlin data classes
-keepclassmembers class ** {
    *** component1();
    *** component2();
    *** copy(...);
}

# Keep Kotlinx serialization
-keep class kotlinx.serialization.** { *; }
-keep @kotlinx.serialization.Serializable class *

# Keep Ktor client classes
-keep class io.ktor.** { *; }

# Keep Koin DI
-keep class org.koin.** { *; }

# Keep Dictator core classes
-keep class com.dictator.core.** { *; }

# Remove logging
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}
