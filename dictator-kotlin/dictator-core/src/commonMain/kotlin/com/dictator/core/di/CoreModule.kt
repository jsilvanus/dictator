package com.dictator.core.di

import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

/**
 * Koin dependency injection module for Dictator Core.
 * Configures all repositories, services, and utilities for the core library.
 */

val coreModule = module {
    // Repositories will be injected here in implementation modules
    // See data layer implementations
    
    // Utilities (singletons)
    singleOf(::com.dictator.core.util.voice.VoiceCommandParser)
    singleOf(::com.dictator.core.util.voice.PunctuationNormalizer)
    singleOf(::com.dictator.core.util.validation.Validators)
    
    // Services will be bound here in implementation modules
    // Interfaces are bound in the data layer
}
