# Laya and Intent Classification

## Purpose

This document records the architectural considerations for adding Laya and/or classification-based intent routing to Dictator.

This is a design note, not an implementation commitment.

## Problem

Dictator currently has two conceptually different kinds of user input:

1. commands that should be handled by Dictator's deterministic command machinery;
2. natural-language requests that should be sent to an LLM.

Voice input makes the boundary fuzzy.

Examples:

    "uusi asiakirja"
        -> command

    "avaa uusi dokumentti"
        -> command

    "kirjoita tästä lyhyt yhteenveto"
        -> LLM request

    "voisitko tehdä tästä lyhyemmän?"
        -> LLM request

The goal is to improve routing without giving a model authority to execute commands.

## Proposed architecture

    speech
       |
       v
      STT
       |
       v
    IntentRouter
       |
       +-------------------+
       |                   |
    COMMAND              LLM_REQUEST
       |                   |
       v                   v
    VoiceCommandParser    LLM
       |
       v
    validated command
       |
       v
    execution

Laya would sit inside the IntentRouter as a classifier:

    IntentRouter
        |
        v
    IntentClassifier
        |
        v
    Aidos Engine
        |
        v
    Laya

Dictator should not depend directly on ONNX Runtime or Laya internals.

## Why Laya?

Laya can provide a fast semantic decision before invoking a generative model.

A suitable initial classification could be:

    COMMAND
    LLM_REQUEST
    AMBIGUOUS

The classifier can also provide probabilities.

For example:

    COMMAND       0.96
    LLM_REQUEST   0.03
    AMBIGUOUS     0.01

This can be used for routing, but the probability must not itself authorize a command.

## Keep VoiceCommandParser

Laya should not replace the existing command parser.

The important boundary is:

    Laya
      |
      | "probably a command"
      v
    VoiceCommandParser
      |
      | recognized command
      v
    execute

If Laya says "command" but the deterministic parser cannot identify a valid command, Dictator should not execute anything.

Possible fallback behaviour is to treat the input as an LLM request or ask for clarification.

## Why generic classification in Aidos?

Dictator should ask Aidos for a classification capability rather than know that the model happens to be Laya.

Conceptually:

    Dictator
        |
        v
    IntentClassifier
        |
        v
    Aidos classification API
        |
        v
    Laya (initial implementation)

This leaves room for a different model later without redesigning Dictator.

## Context

The first implementation should classify the transcript itself.

Later, the classifier may benefit from context such as:

- current editor/application;
- whether a document is open;
- whether text is selected;
- active Dictator mode;
- language;
- previous command;
- current interaction state.

Do not add all of this to the first version unless evaluation shows that it is necessary.

## Confidence policy

Routing thresholds should be configurable rather than embedded in command logic.

Conceptually:

    high COMMAND confidence
        -> command parser

    high LLM_REQUEST confidence
        -> LLM

    otherwise
        -> ambiguous handling

The exact thresholds must be established empirically.

In particular, optimize evaluation for false command routing because an incorrectly recognized command can modify user content.

## Three-way classification

A binary COMMAND/LLM split is probably insufficient.

Use an explicit AMBIGUOUS state.

Examples:

    "tämä teksti on aika pitkä"
        -> AMBIGUOUS

    "voisitko tehdä jotain tälle?"
        -> AMBIGUOUS

Ambiguity should never silently become an irreversible command.

## Shadow mode

The first integration should not change live behaviour.

Run the classifier alongside the existing pipeline:

    STT
      |
      +--> existing routing/execution
      |
      +--> Laya classification
              |
              v
            logging

Collect:

- transcript;
- predicted intent;
- probabilities;
- actual existing behaviour;
- latency;
- model loading time;
- memory usage.

Then compare predictions against human labels.

## Finnish evaluation set

Dictator should have a small explicit evaluation corpus containing natural Finnish command and LLM phrasing.

Examples:

    "uusi asiakirja"                       COMMAND
    "avaa uusi dokumentti"                COMMAND
    "poista tämä kappale"                 COMMAND
    "kumoa"                               COMMAND

    "kirjoita tästä johdanto"             LLM_REQUEST
    "tee tästä lyhyempi"                  LLM_REQUEST
    "selitä tämä"                         LLM_REQUEST

    "tämä teksti on aika pitkä"           AMBIGUOUS
    "voisitko tehdä jotain tälle"         AMBIGUOUS

The actual dataset should be substantially larger and should include natural spoken variants.

Do not assume that a general multilingual model is automatically reliable for Dictator's Finnish command vocabulary.

## Safety boundary

Laya must never directly execute a Dictator command.

The chain should be:

    semantic classification
        ->
    deterministic command recognition
        ->
    existing validation
        ->
    execution

This makes Laya a routing aid rather than an authority.

## Performance considerations

The classifier is useful only if it is sufficiently cheaper/faster than sending every utterance to an LLM.

Important measurements:

- cold-start latency;
- warm inference latency;
- memory use;
- battery impact on Android;
- model load/unload time;
- accuracy;
- false command rate;
- false LLM-request rate;
- ambiguous rate.

The model should preferably be managed by Aidos so Dictator does not own a second model runtime.

## Possible future uses

If the generic classification path proves useful, the same mechanism could support:

- command routing;
- editor intent classification;
- voice interaction state;
- clarification detection;
- model selection;
- lightweight semantic routing.

These should remain separate classifier tasks rather than turning Laya into a general-purpose command executor.

## Open questions

- What generic classification API should Aidos expose?
- Does Dictator need only COMMAND/LLM/AMBIGUOUS, or more command categories?
- How much editor context improves classification?
- What confidence calibration is adequate?
- Should ambiguous input go to the LLM or trigger clarification?
- What latency/memory budget is acceptable on Android?
- Should Laya be loaded only while voice mode is active?
- Which Finnish examples should be included in the permanent regression set?
- Should a Dictator-specific Laya fine-tune eventually be considered?

## Current recommendation

Do not immediately replace Dictator's current routing.

First run Laya in shadow mode through Aidos. Establish whether multilingual Laya can reliably distinguish commands from LLM requests in Finnish and measure its resource cost.

If the results are good, add a small IntentClassifier abstraction to Dictator and use Aidos classification as the implementation.

The deterministic VoiceCommandParser remains the final command recognizer and execution boundary.
