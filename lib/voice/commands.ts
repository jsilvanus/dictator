import type { Editor } from '@tiptap/react';

import {
  markDiscarded,
  resolveAiTurnByPosition,
  resolveAiTurnRange,
  type AiSession,
  type AiTurn,
  type AiTurnPosition,
  textOffsetToRange,
} from '@/lib/ai/session';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type TriggerSegment = {
  type: 'text' | 'command' | 'ai';
  content: string;
};

export function parseTriggers(text: string, commandTrigger: string, aiTrigger: string): TriggerSegment[] {
  const source = text.trim();

  if (!source) {
    return [];
  }

  const triggerDefinitions = [
    { value: commandTrigger.trim(), type: 'command' as const },
    { value: aiTrigger.trim(), type: 'ai' as const },
  ].filter((entry) => entry.value.length > 0);

  if (triggerDefinitions.length === 0) {
    return [{ type: 'text', content: source }];
  }

  const pattern = new RegExp(
    `\\b(${triggerDefinitions
      .sort((a, b) => b.value.length - a.value.length)
      .map((entry) => escapeRegex(entry.value))
      .join('|')})\\b\\s*[,:-]?\\s*`,
    'gi',
  );

  const segments: TriggerSegment[] = [];
  let cursor = 0;
  let match = pattern.exec(source);

  while (match) {
    const start = match.index;
    const end = pattern.lastIndex;

    if (start > cursor) {
      const before = source.slice(cursor, start).trim();
      if (before) {
        segments.push({ type: 'text', content: before });
      }
    }

    const next = pattern.exec(source);
    const chunk = source.slice(end, next ? next.index : source.length).trim();
    const trigger = match[1].toLowerCase();
    const triggerType = triggerDefinitions.find((entry) => entry.value.toLowerCase() === trigger)?.type;

    if (chunk && triggerType) {
      segments.push({ type: triggerType, content: chunk });
    }

    cursor = next ? next.index : source.length;
    match = next;
  }

  if (segments.length === 0) {
    return [{ type: 'text', content: source }];
  }

  if (cursor < source.length) {
    const trailing = source.slice(cursor).trim();
    if (trailing) {
      segments.push({ type: 'text', content: trailing });
    }
  }

  return segments;
}

type CommandOptions = {
  lastDictatedRange: { from: number; to: number } | null;
  setStatus?: (status: string) => void;
  onSave?: () => Promise<void> | void;
  onCreateDocument?: () => Promise<void> | void;
  onSetTitle?: (title: string) => void;
  onPrint?: () => void;
  onMicStop?: () => void;
  onMicPause?: () => void;
  onMicResume?: () => void;
  onOpenHelp?: (category?: string) => void;
  onTemporaryTriggerChange?: (next: string | null) => void;
  onSpeak?: (text: string) => void;
  clearDocumentConfirmUntil: number | null;
  setClearDocumentConfirmUntil: (next: number | null) => void;
};

function setSelectionRange(editor: Editor, from: number, to: number) {
  editor.chain().focus().setTextSelection({ from, to }).run();
}

function deleteCurrentWord(editor: Editor) {
  const { selection } = editor.state;
  if (!selection.empty) {
    editor.chain().focus().deleteSelection().run();
    return;
  }

  const parent = selection.$from.parent;
  const offset = selection.$from.parentOffset;
  const text = parent.textBetween(0, offset, '', '');
  const match = text.match(/(?:^|\s)(\S+)\s*$/);

  if (!match) {
    return;
  }

  const start = offset - match[0].length + (match[0].startsWith(' ') ? 1 : 0);
  const from = selection.$from.start() + Math.max(start, 0);
  const to = selection.from;

  editor.chain().focus().deleteRange({ from, to }).run();
}

function deleteCurrentSentence(editor: Editor) {
  const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n');
  const cursorRange = textOffsetToRange(editor, 0, Math.max(text.length, 1));

  if (!cursorRange) {
    return;
  }

  const cursorTextOffset = text.slice(0, editor.state.selection.from).length;
  const before = text.slice(0, cursorTextOffset);
  const sentenceStart = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?')) + 1;
  const fromOffset = Math.max(0, sentenceStart);
  const toOffset = cursorTextOffset;

  if (toOffset <= fromOffset) {
    return;
  }

  const range = textOffsetToRange(editor, fromOffset, toOffset - fromOffset);
  if (!range) {
    return;
  }

  editor.chain().focus().deleteRange(range).run();
}

function getParagraphRange(editor: Editor) {
  const { $from } = editor.state.selection;
  return { from: $from.start(), to: $from.end() };
}

function findTextRange(editor: Editor, target: string) {
  const haystack = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n').toLowerCase();
  const offset = haystack.indexOf(target.toLowerCase());
  if (offset === -1) {
    return null;
  }

  return textOffsetToRange(editor, offset, target.length);
}

function resolveAiReference(
  editor: Editor,
  session: AiSession,
  position: AiTurnPosition,
  options: CommandOptions,
): { turn: AiTurn; range: { from: number; to: number } } | null {
  const turn = resolveAiTurnByPosition(position, session);
  if (!turn) {
    options.setStatus?.('No assistant edits have been made in this session.');
    options.onSpeak?.('No assistant edits have been made in this session.');
    return null;
  }

  const range = resolveAiTurnRange(turn, editor);
  if (!range) {
    options.setStatus?.('That edit no longer exists in the document.');
    options.onSpeak?.('That edit no longer exists in the document.');
    return null;
  }

  return { turn, range };
}

function runAiReferenceCommand(editor: Editor, session: AiSession, command: string, options: CommandOptions): boolean {
  const normalized = command.toLowerCase().trim();

  const restoreMatch = normalized.match(/^restore\s+the\s+last\s+(assistant|ai)\s+(edit|change|addition|insertion)$/);
  if (restoreMatch) {
    const discardedTurn = [...session.turns]
      .filter((turn) => turn.discardedAt !== null)
      .sort((a, b) => (b.discardedAt ?? 0) - (a.discardedAt ?? 0))[0];

    if (!discardedTurn) {
      options.setStatus?.('No assistant edits have been made in this session.');
      options.onSpeak?.('No assistant edits have been made in this session.');
      return true;
    }

    editor.chain().focus().insertContent(discardedTurn.afterContent).run();
    discardedTurn.discardedAt = null;
    discardedTurn.acceptedAt = Date.now();
    options.setStatus?.('Assistant edit restored.');
    return true;
  }

  const genericMatch = normalized.match(
    /^(select|go to|delete|bold|italic|underline|replace|undo)\s+(?:the\s+)?(last|previous|second|third)\s+(assistant|ai)\s+(edit|change|addition|insertion)$/,
  );

  if (genericMatch) {
    const operation = genericMatch[1];
    const position = genericMatch[2] as AiTurnPosition;
    const resolved = resolveAiReference(editor, session, position, options);

    if (!resolved) {
      return true;
    }

    const { turn, range } = resolved;

    if (operation === 'select' || operation === 'replace') {
      setSelectionRange(editor, range.from, range.to);
      options.setStatus?.('Assistant edit selected.');
      return true;
    }

    if (operation === 'go to') {
      editor.chain().focus().setTextSelection(range.from).run();
      options.setStatus?.('Moved to assistant edit.');
      return true;
    }

    if (operation === 'delete') {
      editor.chain().focus().deleteRange(range).run();
      markDiscarded(session, turn.id);
      options.setStatus?.('Assistant edit deleted.');
      return true;
    }

    if (operation === 'undo') {
      editor.chain().focus().deleteRange(range).insertContentAt(range.from, turn.beforeContent).run();
      markDiscarded(session, turn.id);
      options.setStatus?.('Assistant edit undone.');
      return true;
    }

    setSelectionRange(editor, range.from, range.to);

    if (operation === 'bold') {
      editor.chain().focus().toggleBold().run();
      return true;
    }

    if (operation === 'italic') {
      editor.chain().focus().toggleItalic().run();
      return true;
    }

    if (operation === 'underline') {
      editor.chain().focus().toggleUnderline().run();
      return true;
    }
  }

  const headingMatch = normalized.match(
    /^heading\s+([1-3])\s+(?:the\s+)?(last|previous|second|third)\s+(assistant|ai)\s+(edit|change|addition|insertion)$/,
  );

  if (headingMatch) {
    const level = Number(headingMatch[1]) as 1 | 2 | 3;
    const position = headingMatch[2] as AiTurnPosition;
    const resolved = resolveAiReference(editor, session, position, options);

    if (!resolved) {
      return true;
    }

    setSelectionRange(editor, resolved.range.from, resolved.range.to);
    editor.chain().focus().toggleHeading({ level }).run();
    options.setStatus?.('Heading applied to assistant edit.');
    return true;
  }

  return false;
}

export function executeCommand(command: string, editor: Editor, session: AiSession, options: CommandOptions): boolean {
  const normalized = command.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  if (runAiReferenceCommand(editor, session, command, options)) {
    return true;
  }

  if (normalized === 'delete word') {
    deleteCurrentWord(editor);
    return true;
  }

  if (normalized === 'delete sentence') {
    deleteCurrentSentence(editor);
    return true;
  }

  if (normalized === 'delete paragraph' || normalized === 'delete line') {
    editor.chain().focus().deleteRange(getParagraphRange(editor)).run();
    return true;
  }

  if (normalized === 'delete selection') {
    editor.chain().focus().deleteSelection().run();
    return true;
  }

  if (normalized === 'delete that') {
    if (options.lastDictatedRange) {
      editor.chain().focus().deleteRange(options.lastDictatedRange).run();
      options.setStatus?.('Deleted last dictated text.');
      return true;
    }

    options.setStatus?.('No prior dictated range to delete.');
    return true;
  }

  if (normalized === 'clear document') {
    options.setClearDocumentConfirmUntil(Date.now() + 5000);
    options.setStatus?.('Say “confirm” within 5 seconds to clear the document.');
    return true;
  }

  if (normalized === 'confirm') {
    if (options.clearDocumentConfirmUntil && options.clearDocumentConfirmUntil >= Date.now()) {
      editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
      options.setClearDocumentConfirmUntil(null);
      options.setStatus?.('Document cleared.');
      return true;
    }

    options.setStatus?.('No pending confirmation.');
    return true;
  }

  if (normalized === 'undo') {
    editor.chain().focus().undo().run();
    return true;
  }

  if (normalized === 'redo') {
    editor.chain().focus().redo().run();
    return true;
  }

  if (normalized === 'select word') {
    const { $from } = editor.state.selection;
    const text = $from.parent.textBetween(0, $from.parent.textContent.length, '', '');
    const cursor = $from.parentOffset;
    const start = text.slice(0, cursor).search(/\S+\s*$/);
    const right = text.slice(cursor).match(/^\s*\S+/)?.[0] ?? '';
    const from = $from.start() + Math.max(start, 0);
    const to = $from.start() + cursor + right.length;
    setSelectionRange(editor, from, Math.max(from + 1, to));
    return true;
  }

  if (normalized === 'select sentence') {
    const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n');
    const cursor = text.slice(0, editor.state.selection.from).length;
    const sentenceStart = Math.max(text.slice(0, cursor).lastIndexOf('.'), text.slice(0, cursor).lastIndexOf('!'), text.slice(0, cursor).lastIndexOf('?')) + 1;
    const right = text.slice(cursor);
    const sentenceEndRelative = right.search(/[.!?]/);
    const sentenceEnd = sentenceEndRelative === -1 ? text.length : cursor + sentenceEndRelative + 1;
    const range = textOffsetToRange(editor, Math.max(sentenceStart, 0), Math.max(1, sentenceEnd - sentenceStart));
    if (range) {
      setSelectionRange(editor, range.from, range.to);
    }
    return true;
  }

  if (normalized === 'select paragraph') {
    const range = getParagraphRange(editor);
    setSelectionRange(editor, range.from, range.to);
    return true;
  }

  if (normalized === 'select all') {
    editor.chain().focus().selectAll().run();
    return true;
  }

  if (normalized === 'go to start') {
    editor.chain().focus().setTextSelection(1).run();
    return true;
  }

  if (normalized === 'go to end') {
    editor.chain().focus().setTextSelection(editor.state.doc.content.size).run();
    return true;
  }

  if (normalized === 'beginning of paragraph') {
    editor.chain().focus().setTextSelection(editor.state.selection.$from.start()).run();
    return true;
  }

  if (normalized === 'end of paragraph') {
    editor.chain().focus().setTextSelection(editor.state.selection.$from.end()).run();
    return true;
  }

  if (normalized === 'next paragraph') {
    const nextPos = Math.min(editor.state.doc.content.size, editor.state.selection.$from.after());
    editor.chain().focus().setTextSelection(nextPos).run();
    return true;
  }

  if (normalized === 'previous paragraph') {
    const previousPos = Math.max(1, editor.state.selection.$from.before());
    editor.chain().focus().setTextSelection(previousPos).run();
    return true;
  }

  if (normalized.startsWith('find ')) {
    const target = command.slice(5).trim();
    const range = findTextRange(editor, target);

    if (!range) {
      options.setStatus?.(`No match for “${target}”.`);
      return true;
    }

    setSelectionRange(editor, range.from, range.to);
    return true;
  }

  if (normalized === 'bold') {
    editor.chain().focus().toggleBold().run();
    return true;
  }

  if (normalized === 'italic') {
    editor.chain().focus().toggleItalic().run();
    return true;
  }

  if (normalized === 'underline') {
    editor.chain().focus().toggleUnderline().run();
    return true;
  }

  if (normalized === 'normal text') {
    editor.chain().focus().setParagraph().run();
    return true;
  }

  if (normalized === 'bullet list') {
    editor.chain().focus().toggleBulletList().run();
    return true;
  }

  if (normalized === 'numbered list') {
    editor.chain().focus().toggleOrderedList().run();
    return true;
  }

  if (normalized === 'blockquote') {
    editor.chain().focus().toggleBlockquote().run();
    return true;
  }

  if (normalized === 'code') {
    editor.chain().focus().toggleCode().run();
    return true;
  }

  if (normalized === 'code block') {
    editor.chain().focus().toggleCodeBlock().run();
    return true;
  }

  if (normalized === 'save') {
    void options.onSave?.();
    return true;
  }

  if (normalized === 'new document') {
    void options.onCreateDocument?.();
    return true;
  }

  if (normalized === 'print') {
    options.onPrint?.();
    return true;
  }

  if (normalized === 'stop') {
    options.onMicStop?.();
    return true;
  }

  if (normalized === 'pause') {
    options.onMicPause?.();
    return true;
  }

  if (normalized === 'resume') {
    options.onMicResume?.();
    return true;
  }

  if (normalized === 'reset trigger') {
    options.onTemporaryTriggerChange?.(null);
    options.setStatus?.('Command trigger reset.');
    return true;
  }

  if (normalized === 'help') {
    options.onOpenHelp?.();
    return true;
  }

  const helpCategoryMatch = normalized.match(/^help\s+(navigation|editing|formatting|document|ai|triggers)$/);
  if (helpCategoryMatch) {
    options.onOpenHelp?.(helpCategoryMatch[1]);
    return true;
  }

  const triggerMatch = command.match(/^change\s+trigger\s+to\s+([a-zA-Z0-9_-]+)$/i);
  if (triggerMatch) {
    options.onTemporaryTriggerChange?.(triggerMatch[1]);
    options.setStatus?.(`Trigger changed to ${triggerMatch[1]}.`);
    return true;
  }

  const headingMatch = normalized.match(/^heading\s+([1-3])$/);
  if (headingMatch) {
    const level = Number(headingMatch[1]) as 1 | 2 | 3;
    editor.chain().focus().toggleHeading({ level }).run();
    return true;
  }

  if (normalized.startsWith('set title ')) {
    const title = command.slice('set title '.length).trim();
    if (title) {
      options.onSetTitle?.(title);
      return true;
    }
  }

  return false;
}
