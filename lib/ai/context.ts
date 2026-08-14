import type { AiSession } from './session';

export type SelectionMode = 'full' | 'selected' | 'cursor';

export type InlineEditorSnapshot = {
  title: string;
  language: string;
  wordCount: number;
  text: string;
  selection: string;
  cursorParagraph: string;
  precedingParagraphs: string[];
  selectionMode?: SelectionMode; // New: tracks what was selected
  selectedCharRange?: { start: number; end: number }; // New: exact position
};

export type PanelTurn = {
  role: 'user' | 'assistant';
  content: string;
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
    selectionMode: snapshot.selectionMode || 'full',
  };
}

export function buildPanelContext(snapshot: InlineEditorSnapshot & { fullText: string }) {
  return {
    title: snapshot.title,
    language: snapshot.language,
    wordCount: snapshot.wordCount,
    selection: snapshot.selection,
    cursorParagraph: snapshot.cursorParagraph,
    precedingParagraphs: snapshot.precedingParagraphs,
    fullDocumentText: snapshot.fullText.slice(0, 16000),
    selectionMode: snapshot.selectionMode || 'full',
  };
}

/**
 * Build context from a text selection
 * Only sends selected text with minimal context (current paragraph + immediate vicinity)
 */
export function buildContextFromSelection(
  selectedText: string,
  startIndex: number,
  endIndex: number,
  fullText: string,
  title: string,
  language: string,
): Omit<ReturnType<typeof buildInlineContext>, 'lastAcceptedTurns'> {
  // Get immediate context: 1 paragraph before and after selection
  const paragraphs = fullText.split('\n\n');
  let currentIndex = 0;
  let selectedParagraphIndex = -1;
  const contextParagraphs: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraphStart = currentIndex;
    const paragraphEnd = currentIndex + paragraphs[i].length;

    // Check if selection overlaps with this paragraph
    if (startIndex < paragraphEnd && endIndex > paragraphStart) {
      selectedParagraphIndex = i;

      // Add previous paragraph for context
      if (i > 0) {
        contextParagraphs.push(paragraphs[i - 1]);
      }

      // Add current paragraph
      contextParagraphs.push(paragraphs[i]);

      // Add next paragraph for context
      if (i < paragraphs.length - 1) {
        contextParagraphs.push(paragraphs[i + 1]);
      }

      break;
    }

    currentIndex = paragraphEnd + 2; // Account for \n\n
  }

  const cursorParagraph = selectedParagraphIndex >= 0 ? paragraphs[selectedParagraphIndex] : '';
  const precedingParagraphs =
    selectedParagraphIndex > 0 ? [paragraphs[selectedParagraphIndex - 1]] : [];

  return {
    title,
    language,
    wordCount: selectedText.split(/\s+/).length,
    selection: selectedText,
    cursorParagraph,
    precedingParagraphs,
    text: contextParagraphs.join('\n\n'),
    selectionMode: 'selected',
  };
}
