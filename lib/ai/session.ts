import type { Editor } from '@tiptap/react';

export type AiTurn = {
  id: string;
  request: string;
  beforeContent: string;
  afterContent: string;
  docVersion: number;
  createdAt: number;
  acceptedAt: number | null;
  discardedAt: number | null;
};

export type AiSession = {
  turns: AiTurn[];
  currentDocVersion: number;
};

export type AiTurnPosition = 'last' | 'previous' | 'second' | 'third';

export function resolveAiTurnByPosition(position: AiTurnPosition, session: AiSession): AiTurn | null {
  const activeTurns = session.turns.filter((turn) => turn.discardedAt === null);

  if (activeTurns.length === 0) {
    return null;
  }

  const ordered = [...activeTurns].sort((a, b) => b.createdAt - a.createdAt);

  if (position === 'last') {
    return ordered[0] ?? null;
  }

  if (position === 'previous' || position === 'second') {
    return ordered[1] ?? null;
  }

  return ordered[2] ?? null;
}

export function recordTurn(session: AiSession, turn: Omit<AiTurn, 'createdAt' | 'acceptedAt' | 'discardedAt'>) {
  const now = Date.now();
  session.turns.push({
    ...turn,
    createdAt: now,
    acceptedAt: now,
    discardedAt: null,
  });
}

export function markAccepted(session: AiSession, turnId: string) {
  const turn = session.turns.find((entry) => entry.id === turnId);
  if (!turn) {
    return;
  }

  turn.acceptedAt = Date.now();
  turn.discardedAt = null;
}

export function markDiscarded(session: AiSession, turnId: string) {
  const turn = session.turns.find((entry) => entry.id === turnId);
  if (!turn) {
    return;
  }

  turn.discardedAt = Date.now();
}

export function textOffsetToRange(editor: Editor, offset: number, length: number): { from: number; to: number } | null {
  if (offset < 0 || length <= 0) {
    return null;
  }

  const doc = editor.state.doc;
  const positions: number[] = [];

  for (let pos = 1; pos <= doc.content.size; pos += 1) {
    const chunk = doc.textBetween(pos, pos + 1, '\n', '\n');
    if (!chunk) {
      continue;
    }

    for (let index = 0; index < chunk.length; index += 1) {
      positions.push(pos + index);
    }
  }

  const start = positions[offset];
  const end = positions[offset + length - 1];

  if (!start || !end) {
    return null;
  }

  return { from: start, to: end + 1 };
}

export function resolveAiTurnRange(turn: AiTurn, editor: Editor): { from: number; to: number } | null {
  const needle = turn.afterContent.trim();
  if (!needle) {
    return null;
  }

  const text = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n');
  const anchor = needle.slice(0, 60);
  const offset = text.indexOf(anchor);

  if (offset === -1) {
    return null;
  }

  return textOffsetToRange(editor, offset, needle.length);
}
