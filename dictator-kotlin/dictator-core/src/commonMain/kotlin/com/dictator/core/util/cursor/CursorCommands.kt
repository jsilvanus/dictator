/**
 * Cursor Commands Execution Engine for Android
 * Executes parsed cursor commands with state management
 */

package com.dictator.core.util.cursor

import com.dictator.core.domain.entity.CursorPosition
import com.dictator.core.domain.entity.CursorSize
import com.dictator.core.domain.entity.CursorState
import com.dictator.core.domain.entity.CursorOperationResult
import com.dictator.core.domain.entity.SelectionState

/**
 * Cursor commands execution engine
 */
object CursorCommandExecutor {
    
    /**
     * Parse a single cursor command string into structured command
     */
    fun parseSingleCommand(command: String): Pair<String, String?> {
        val lowerCommand = command.lowercase().trim()
        
        return when {
            lowerCommand in setOf("big", "paragraph", "large") -> "setCursorSize" to "PARAGRAPH"
            lowerCommand in setOf("medium", "word") -> "setCursorSize" to "WORD"
            lowerCommand in setOf("small", "character", "tiny") -> "setCursorSize" to "CHARACTER"
            lowerCommand in setOf("next", "forward", "go forward", "move forward") -> "moveCursor" to "next"
            lowerCommand in setOf("back", "previous", "go back", "move back", "backward") -> "moveCursor" to "prev"
            lowerCommand in setOf("select", "highlight") -> "toggleSelectMode" to null
            lowerCommand == "select all" -> "selectAll" to null
            lowerCommand == "select start" -> "selectStart" to null
            lowerCommand == "select end" -> "selectEnd" to null
            else -> "unknown" to null
        }
    }
    
    /**
     * Execute a single cursor command on the current state
     */
    fun executeSingleCommand(
        text: String,
        command: String,
        parameter: String?,
        state: CursorState,
        userLanguage: String = "en-US"
    ): CursorOperationResult {
        return when (command) {
            "setCursorSize" -> {
                val newSize = when (parameter) {
                    "PARAGRAPH" -> CursorSize.PARAGRAPH
                    "WORD" -> CursorSize.WORD
                    "CHARACTER" -> CursorSize.CHARACTER
                    else -> state.current.size
                }
                
                val newPos = state.current.copy(size = newSize)
                val newState = state.copy(current = newPos, lastAction = "cursorSize")
                
                val sizeName = when (newSize) {
                    CursorSize.PARAGRAPH -> "paragraph"
                    CursorSize.WORD -> "word"
                    CursorSize.CHARACTER -> "character"
                }
                
                CursorOperationResult(
                    newState = newState,
                    feedback = "Cursor size: $sizeName",
                    selectedText = null,
                    isAtBoundary = false
                )
            }
            
            "moveCursor" -> {
                val direction = parameter ?: "next"
                val newPos = moveCursorInDirection(text, state.current, direction)
                val isAtBoundary = newPos.startChar == state.current.startChar
                
                val newState = state.copy(current = newPos, lastAction = "move")
                
                val feedback = if (isAtBoundary) {
                    when (direction) {
                        "next" -> "At end of document"
                        "prev" -> "At beginning of document"
                        else -> "Cursor moved"
                    }
                } else {
                    "Cursor moved"
                }
                
                CursorOperationResult(
                    newState = newState,
                    feedback = feedback,
                    selectedText = getTextAtCursor(text, newPos),
                    isAtBoundary = isAtBoundary
                )
            }
            
            "toggleSelectMode" -> {
                val newSelection = if (state.selection?.isActive == true) {
                    state.selection.copy(isActive = false)
                } else {
                    SelectionState(
                        startPos = state.current,
                        endPos = state.current,
                        isActive = true
                    )
                }
                
                val newState = state.copy(selection = newSelection, lastAction = "select")
                
                val feedback = if (newSelection.isActive) {
                    "Selection started"
                } else {
                    "Selection ended"
                }
                
                CursorOperationResult(
                    newState = newState,
                    feedback = feedback,
                    selectedText = if (newSelection.isActive) getTextAtCursor(text, state.current) else null,
                    isAtBoundary = false
                )
            }
            
            "selectAll" -> {
                val startPos = CursorPosition(0, 0, state.current.size)
                val endPos = CursorPosition(text.length, text.length, state.current.size)
                
                val newSelection = SelectionState(
                    startPos = startPos,
                    endPos = endPos,
                    isActive = true
                )
                
                val newState = state.copy(selection = newSelection, lastAction = "selectAll")
                
                CursorOperationResult(
                    newState = newState,
                    feedback = "All text selected",
                    selectedText = text,
                    isAtBoundary = false
                )
            }
            
            "selectStart" -> {
                val startPos = CursorPosition(0, 0, state.current.size)
                
                val newSelection = if (state.selection?.isActive == true) {
                    state.selection.copy(startPos = startPos)
                } else {
                    SelectionState(
                        startPos = startPos,
                        endPos = state.current,
                        isActive = true
                    )
                }
                
                val newState = state.copy(selection = newSelection, lastAction = "selectStart")
                
                CursorOperationResult(
                    newState = newState,
                    feedback = "Selection set to start",
                    selectedText = getSelectionText(text, newSelection),
                    isAtBoundary = false
                )
            }
            
            "selectEnd" -> {
                val endPos = CursorPosition(text.length, text.length, state.current.size)
                
                val newSelection = if (state.selection?.isActive == true) {
                    state.selection.copy(endPos = endPos)
                } else {
                    SelectionState(
                        startPos = state.current,
                        endPos = endPos,
                        isActive = true
                    )
                }
                
                val newState = state.copy(selection = newSelection, lastAction = "selectEnd")
                
                CursorOperationResult(
                    newState = newState,
                    feedback = "Selection set to end",
                    selectedText = getSelectionText(text, newSelection),
                    isAtBoundary = false
                )
            }
            
            else -> {
                // Unknown command
                CursorOperationResult(
                    newState = state,
                    feedback = "Unknown command: $command",
                    selectedText = null,
                    isAtBoundary = false
                )
            }
        }
    }
    
    /**
     * Execute multiple cursor commands in sequence
     */
    fun executeCursorCommands(
        text: String,
        commands: List<String>,
        initialState: CursorState,
        userLanguage: String = "en-US"
    ): CursorOperationResult {
        var currentState = initialState
        var lastResult: CursorOperationResult? = null
        
        for (cmd in commands) {
            val (commandName, parameter) = parseSingleCommand(cmd)
            
            // Skip unknown commands but continue processing
            if (commandName == "unknown") continue
            
            lastResult = executeSingleCommand(
                text = text,
                command = commandName,
                parameter = parameter,
                state = currentState,
                userLanguage = userLanguage
            )
            
            currentState = lastResult.newState
        }
        
        return lastResult ?: CursorOperationResult(
            newState = initialState,
            feedback = "No commands executed",
            selectedText = null,
            isAtBoundary = false
        )
    }
    
    /**
     * High-level handler for cursor command from voice input
     * Parses and executes voice text as cursor commands
     */
    suspend fun handleCursorCommand(
        text: String,
        voiceInput: String,
        currentState: CursorState,
        userLanguage: String = "en-US"
    ): CursorOperationResult {
        // Parse voice input into cursor commands
        val commands = CursorCommandParser.parseCursorCommandsFromText(voiceInput)
        
        if (commands.isEmpty()) {
            return CursorOperationResult(
                newState = currentState,
                feedback = "No cursor commands recognized",
                selectedText = null,
                isAtBoundary = false
            )
        }
        
        // Execute all commands
        return executeCursorCommands(
            text = text,
            commands = commands,
            initialState = currentState,
            userLanguage = userLanguage
        )
    }
    
    /**
     * Get text at cursor position (one unit)
     */
    private fun getTextAtCursor(text: String, position: CursorPosition): String {
        val start = position.startChar.coerceIn(0, text.length)
        val end = position.endChar.coerceIn(start, text.length)
        return if (start < end) text.substring(start, end) else ""
    }
    
    /**
     * Get currently selected text
     */
    private fun getSelectionText(text: String, selection: SelectionState): String {
        val start = selection.startPos.startChar.coerceIn(0, text.length)
        val end = selection.endPos.endChar.coerceIn(start, text.length)
        return if (start < end) text.substring(start, end) else ""
    }
}
