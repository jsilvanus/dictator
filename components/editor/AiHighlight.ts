import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';

const aiHighlightKey = new PluginKey<DecorationSet>('ai-highlight');

type HighlightMeta = { type: 'set'; from: number; to: number } | { type: 'clear' };

export const AiHighlight = Extension.create({
  name: 'aiHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const mapped = old.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(aiHighlightKey) as HighlightMeta | undefined;

            if (!meta) {
              return mapped;
            }

            if (meta.type === 'clear') {
              return DecorationSet.empty;
            }

            return DecorationSet.create(tr.doc, [Decoration.inline(meta.from, meta.to, { class: 'ai-highlighted-range' })]);
          },
        },
        props: {
          decorations: (state) => aiHighlightKey.getState(state),
        },
      }),
    ];
  },
});

export function setAiHighlight(editor: Editor, from: number, to: number) {
  editor.view.dispatch(editor.state.tr.setMeta(aiHighlightKey, { type: 'set', from, to }));
}

export function clearAiHighlight(editor: Editor) {
  editor.view.dispatch(editor.state.tr.setMeta(aiHighlightKey, { type: 'clear' }));
}
