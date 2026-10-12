package com.dictator.android.data.shadow

import com.dictator.core.util.voice.shadow.ShadowSink
import java.io.File

/**
 * Appends shadow-mode lines to a file in the app's private storage. When the file passes [maxBytes]
 * it is replaced by a fresh one (the previous file is kept once as `.1`), so the log cannot grow
 * without bound. Local only: nothing here is ever uploaded.
 */
class ShadowFileSink(private val file: File, private val maxBytes: Long = 1_000_000L) : ShadowSink {
    @Synchronized
    override fun append(line: String) {
        if (file.length() > maxBytes) {
            val old = File(file.path + ".1")
            old.delete()
            file.renameTo(old)
        }
        file.appendText(line + "\n")
    }

    @Synchronized
    fun clear() {
        file.delete()
        File(file.path + ".1").delete()
    }
}
