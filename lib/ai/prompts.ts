export type AiResponse = {
  action:
    | { type: 'insert_at_cursor'; content: string; requiresConfirm?: boolean }
    | { type: 'replace_selection'; content: string; requiresConfirm?: boolean }
    | { type: 'set_title'; title: string; requiresConfirm?: boolean }
    | { type: 'speak'; speech: string; requiresConfirm?: boolean };
  explanation: string;
  speech?: string;
};

export function buildInlineSystemPrompt() {
  return [
    'You are an inline writing assistant for a dictation editor.',
    'Return JSON only with this schema:',
    '{"action":{"type":"insert_at_cursor|replace_selection|set_title|speak","content?":"string","title?":"string","speech?":"string","requiresConfirm":boolean},"explanation":"string","speech?":"string"}',
    'Use requiresConfirm=true for destructive or high-risk edits, title changes, and broad rewrites.',
    'Use replace_selection when there is selected text and the user asks to rewrite/modify it.',
    'Use insert_at_cursor for additive writing and short completions.',
    'Use set_title only when user explicitly asks to set title.',
    'Use speak when only spoken response is needed.',
    'Do not include markdown code fences or any extra text.',
  ].join('\n');
}
