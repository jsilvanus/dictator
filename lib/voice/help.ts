export type HelpCategory = 'navigation' | 'editing' | 'formatting' | 'document' | 'AI' | 'triggers';

export type HelpItem = {
  command: string;
  description: string;
  example: string;
};

export const helpEntries: Record<HelpCategory, HelpItem[]> = {
  navigation: [
    { command: 'go to start', description: 'Moves cursor to start of document.', example: 'Computer, go to start' },
    { command: 'go to end', description: 'Moves cursor to end of document.', example: 'Computer, go to end' },
    {
      command: 'beginning of paragraph',
      description: 'Moves cursor to start of current paragraph.',
      example: 'Computer, beginning of paragraph',
    },
    {
      command: 'end of paragraph',
      description: 'Moves cursor to end of current paragraph.',
      example: 'Computer, end of paragraph',
    },
    { command: 'next paragraph', description: 'Moves to next paragraph.', example: 'Computer, next paragraph' },
    { command: 'previous paragraph', description: 'Moves to previous paragraph.', example: 'Computer, previous paragraph' },
    { command: 'find [text]', description: 'Finds and selects matching text.', example: 'Computer, find budget summary' },
  ],
  editing: [
    { command: 'delete word', description: 'Deletes previous word.', example: 'Computer, delete word' },
    { command: 'delete sentence', description: 'Deletes previous sentence.', example: 'Computer, delete sentence' },
    { command: 'delete paragraph', description: 'Deletes current paragraph.', example: 'Computer, delete paragraph' },
    { command: 'delete selection', description: 'Deletes selected text.', example: 'Computer, delete selection' },
    { command: 'delete that', description: 'Deletes last dictated range.', example: 'Computer, delete that' },
    { command: 'delete line', description: 'Deletes current line/paragraph.', example: 'Computer, delete line' },
    { command: 'clear document', description: 'Requires confirm within 5s.', example: 'Computer, clear document' },
    { command: 'confirm', description: 'Confirms staged destructive action.', example: 'Computer, confirm' },
    { command: 'undo', description: 'Undo latest editor action.', example: 'Computer, undo' },
    { command: 'redo', description: 'Redo latest undone action.', example: 'Computer, redo' },
    { command: 'select all', description: 'Selects the entire document.', example: 'Computer, select all' },
  ],
  formatting: [
    { command: 'bold', description: 'Applies bold formatting.', example: 'Computer, bold' },
    { command: 'italic', description: 'Applies italic formatting.', example: 'Computer, italic' },
    { command: 'underline', description: 'Applies underline formatting.', example: 'Computer, underline' },
    { command: 'heading [1-3]', description: 'Sets heading level.', example: 'Computer, heading 2' },
    { command: 'normal text', description: 'Sets paragraph style.', example: 'Computer, normal text' },
    { command: 'bullet list', description: 'Toggles bullet list.', example: 'Computer, bullet list' },
    { command: 'numbered list', description: 'Toggles numbered list.', example: 'Computer, numbered list' },
    { command: 'blockquote', description: 'Toggles blockquote.', example: 'Computer, blockquote' },
    { command: 'code', description: 'Toggles inline code.', example: 'Computer, code' },
    { command: 'code block', description: 'Toggles code block.', example: 'Computer, code block' },
  ],
  document: [
    { command: 'save', description: 'Saves current document immediately.', example: 'Computer, save' },
    { command: 'new document', description: 'Creates a new document.', example: 'Computer, new document' },
    { command: 'set title [text]', description: 'Updates document title.', example: 'Computer, set title Meeting Notes' },
    { command: 'print', description: 'Opens print dialog.', example: 'Computer, print' },
    { command: 'stop', description: 'Stops microphone listening.', example: 'Computer, stop' },
    { command: 'pause', description: 'Pauses microphone.', example: 'Computer, pause' },
    { command: 'resume', description: 'Resumes microphone.', example: 'Computer, resume' },
  ],
  AI: [
    {
      command: 'select/go to/delete ... assistant edit',
      description: 'Targets a specific assistant edit by relative position.',
      example: 'Computer, delete the last assistant edit',
    },
    {
      command: 'bold/italic/underline/heading ... assistant edit',
      description: 'Formats targeted assistant edit range.',
      example: 'Computer, bold the previous assistant edit',
    },
    {
      command: 'undo the last assistant edit',
      description: 'Restores original text for targeted assistant edit.',
      example: 'Computer, undo the last assistant edit',
    },
    {
      command: 'restore the last assistant edit',
      description: 'Re-inserts the most recently discarded assistant edit.',
      example: 'Computer, restore the last assistant edit',
    },
    {
      command: 'replace the last assistant edit',
      description: 'Selects AI edit so next dictation can replace it.',
      example: 'Computer, replace the last assistant edit',
    },
  ],
  triggers: [
    {
      command: 'change trigger to [word]',
      description: 'Overrides command trigger for this tab session.',
      example: 'Computer, change trigger to Captain',
    },
    { command: 'reset trigger', description: 'Clears trigger override.', example: 'Computer, reset trigger' },
    {
      command: 'help',
      description: "Say '[trigger], help' to open this panel.",
      example: 'Computer, help',
    },
    {
      command: 'help [category]',
      description: 'Opens help pre-filtered to a category.',
      example: 'Computer, help formatting',
    },
  ],
};

export const helpCategories = Object.keys(helpEntries) as HelpCategory[];
