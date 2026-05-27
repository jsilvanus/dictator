import { describe, expect, it } from 'vitest';

import { resolveAiTurnByPosition, resolveAiTurnRange, type AiSession, type AiTurn } from '@/lib/ai/session';

function createTurn(id: string, afterContent: string, createdAt: number, discardedAt: number | null = null): AiTurn {
  return {
    id,
    request: 'request',
    beforeContent: 'before',
    afterContent,
    docVersion: 1,
    createdAt,
    acceptedAt: createdAt,
    discardedAt,
  };
}

function createEditorMock(text: string) {
  return {
    state: {
      doc: {
        content: { size: text.length + 2 },
        textBetween(from: number, to: number) {
          if (from === 0 && to === text.length + 2) {
            return text;
          }

          const index = from - 1;
          if (index < 0 || index >= text.length) {
            return '';
          }

          return text[index] ?? '';
        },
      },
    },
  } as unknown as Parameters<typeof resolveAiTurnRange>[1];
}

describe('resolveAiTurnByPosition', () => {
  it('resolves last, previous, second, and third turns while skipping discarded', () => {
    const session: AiSession = {
      currentDocVersion: 3,
      turns: [
        createTurn('1', 'first', 10),
        createTurn('2', 'second', 20),
        createTurn('3', 'third', 30),
        createTurn('4', 'discarded', 40, 41),
      ],
    };

    expect(resolveAiTurnByPosition('last', session)?.id).toBe('3');
    expect(resolveAiTurnByPosition('previous', session)?.id).toBe('2');
    expect(resolveAiTurnByPosition('second', session)?.id).toBe('2');
    expect(resolveAiTurnByPosition('third', session)?.id).toBe('1');
  });

  it('returns null when all turns are discarded or session is empty', () => {
    const discardedSession: AiSession = {
      currentDocVersion: 1,
      turns: [createTurn('1', 'value', 10, 20)],
    };

    expect(resolveAiTurnByPosition('last', discardedSession)).toBeNull();
    expect(resolveAiTurnByPosition('last', { currentDocVersion: 1, turns: [] })).toBeNull();
  });
});

describe('resolveAiTurnRange', () => {
  const turn = createTurn('1', 'assistant text', 10);

  it('finds range when text is present', () => {
    const range = resolveAiTurnRange(turn, createEditorMock('before assistant text after'));
    expect(range).not.toBeNull();
    expect(range?.to).toBeGreaterThan(range?.from ?? 0);
  });

  it('returns null when text is not present', () => {
    expect(resolveAiTurnRange(turn, createEditorMock('different content'))).toBeNull();
  });

  it('uses partial anchor match for long content', () => {
    const longTurn = createTurn('2', 'assistant text with extended tail for partial matching check', 11);
    const range = resolveAiTurnRange(longTurn, createEditorMock('before assistant text with extended tail for partial matching check after'));
    expect(range).not.toBeNull();
  });
});
