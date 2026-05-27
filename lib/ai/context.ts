import type { AiSession } from './session';

export type InlineEditorSnapshot = {
  title: string;
  language: string;
  wordCount: number;
  text: string;
  selection: string;
  cursorParagraph: string;
  precedingParagraphs: string[];
};

export function buildInlineContext(snapshot: InlineEditorSnapshot, session: AiSession) {
  const acceptedTurns = session.turns
    .filter((turn) => turn.acceptedAt !== null && turn.discardedAt === null)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
    .map((turn) => ({
      request: turn.request,
      result: turn.afterContent,
      docVersionDelta:
        session.currentDocVersion === turn.docVersion ? 'same-version' : `delta-${session.currentDocVersion - turn.docVersion}`,
    }));

  return {
    title: snapshot.title,
    language: snapshot.language,
    wordCount: snapshot.wordCount,
    selection: snapshot.selection,
    cursorParagraph: snapshot.cursorParagraph,
    precedingParagraphs: snapshot.precedingParagraphs,
    text: snapshot.text,
    lastAcceptedTurns: acceptedTurns,
  };
}
