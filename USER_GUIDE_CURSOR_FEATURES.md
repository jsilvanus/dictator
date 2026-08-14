# Cursor System Feature Guide

## Overview

The Dictator cursor system enables granular voice-controlled text selection and navigation at the character, word, or paragraph level. Combined with privacy protections and PII detection, it provides a powerful yet safe way to work with selected content in AI-assisted text editing.

## Features

### 1. Multi-Level Cursor Sizes

The cursor operates at three different granularity levels:

- **Paragraph** (¶): Selects/navigates entire paragraphs (text separated by double newlines)
- **Word** (W): Selects/navigates individual words
- **Character** (C): Selects/navigates single characters

### 2. Voice-Controlled Navigation

Use voice commands to move the cursor:

- **"next"** / **"forward"**: Move cursor to next unit
- **"back"** / **"previous"**: Move cursor to previous unit
- Switch cursor size: **"big"** / **"medium"** / **"small"** or **"paragraph"** / **"word"** / **"character"**

### 3. Selection Commands

Control text selection with voice:

- **"select"**: Start selection mode at current position
- **"select all"**: Select entire document
- **"select start"**: Move selection to document start
- **"select end"**: Move selection to document end
- **"next"** (when selecting): Expand selection forward
- **"back"** (when selecting): Expand selection backward

### 4. Cursor Indicator Display

The cursor indicator shows:

- Current cursor size (paragraph/word/character)
- Current position in document
- Number of units selected
- Visual indicator when in selection mode

### 5. PII Detection & Permissions

Before sending selected text to AI:

1. The system scans for personally identifiable information (PII)
2. Detected PII types are displayed (emails, phone numbers, SSN, API keys, etc.)
3. User must grant permission before sending (once, per-document, or always)
4. Risk level is assessed (low/medium/high) based on confidence

### 6. Settings

Access cursor settings from the Preferences page:

- Set default cursor size preference
- View all available cursor commands by language
- Add custom voice aliases for commands
- Test command recognition

## Usage Examples

### Example 1: Select and Refine a Paragraph

1. Say **"big"** to switch to paragraph mode
2. Say **"select"** to start selection
3. Say **"next"** to expand to next paragraph
4. Say **"next"** again to expand further
5. Selected paragraphs are highlighted

### Example 2: Edit a Specific Word

1. Say **"medium"** to switch to word mode
2. Say **"next next next"** to navigate to target word
3. Say **"select"** to select the word
4. Speak replacement text
5. Say **"small"** to switch to character mode for fine-tuning

### Example 3: Send Selection to AI Safely

1. Select text containing sensitive information
2. System detects PII (e.g., email address)
3. Permission dialog appears asking for consent
4. Grant permission or edit selection
5. Selected text sent to AI only after permission granted

## Language Support

The cursor system includes default commands for:

- **English (en-US)**
- **Finnish (fi-FI)**
- **Swedish (sv-SE)**

Each language has equivalent voice phrases for navigation and selection.

## Custom Aliases

Create your own voice shortcuts:

1. Go to Preferences → Cursor Navigation
2. Enter your custom word (e.g., "go")
3. Select the standard command it maps to (e.g., "next")
4. Use "Test Your Commands" to verify recognition

## Privacy & Security

### PII Detection

The system automatically detects:

- Credit card numbers
- Social Security Numbers
- Phone numbers
- Email addresses
- API keys and tokens
- Authentication tokens
- Passwords
- IP addresses
- License plates
- Bank account numbers

### Permission Scopes

When sending selected text with PII:

- **Once**: Permission valid for this selection only
- **Per Document**: Permission applies to all future selections in this document
- **Always**: Permission applies globally (for this AI provider)

### Confidence Levels

Detections are rated by confidence:

- **High** (90%+): Very likely to be PII
- **Medium** (75-90%): Probably PII
- **Low** (<75%): Possible PII

## Tips & Best Practices

1. **Combine commands**: "select big next next next" works as one command
2. **Switch sizes often**: Change cursor size to match the text scope you need
3. **Test aliases first**: Use "Test Your Commands" before relying on custom aliases
4. **Review PII warnings**: Take the PII detection warnings seriously
5. **Use consistent language**: Keep voice input in your selected language for best recognition

## Troubleshooting

### Commands not recognized

- Check your language setting
- Try the default command phrase (not your custom alias)
- Say commands more clearly with proper pronunciation
- Use "Test Your Commands" to debug

### Selection not expanding

- Make sure you said "select" to start selection mode
- Check that cursor size is appropriate for your text
- Use "back" to reverse direction if needed

### PII detection too aggressive

- Review the detected items (they may be false positives)
- You can still proceed by granting permission
- Edit your text to remove sensitive data

## Architecture

See `CURSOR_SYSTEM_IMPLEMENTATION.md` for technical details on:

- Core cursor system types and functions
- Voice command parsing and execution
- PII detection integration
- React Context provider implementation
- Database schema for cursor preferences
- Android/Kotlin implementation

## API Reference

### Cursor Commands

All cursor commands are processed by the voice recognition system and executed against the document state.

### PII Types

Supported sensitive data types:

```
'credit-card' | 'ssn' | 'phone' | 'email' | 'api-key' | 'password' | 
'jwt-token' | 'ip' | 'license-plate' | 'bank-account' | 'routing-number' | 'url'
```

### Selection Permission Scopes

```
'once' | 'document' | 'always'
```
