/**
 * TipTap Extension: ParagraphIdentity
 * 
 * Automatically assigns stable, unique IDs to all paragraphs in the document.
 * 
 * This extension:
 * - Assigns p_<uuid> IDs to all paragraph nodes
 * - Preserves IDs through edits, undo/redo, reordering
 * - Provides methods to query and manage paragraph identities
 * - Integrates with the provenance system
 * 
 * Usage:
 * ```typescript
 * editor.commands.setContent(html, {
 *   parseOptions: {
 *     preserveWhitespace: 'full',
 *   },
 * });
 * 
 * // All paragraphs automatically get IDs assigned via extension
 * const paragraphIds = editor.storage.paragraphIdentity.getParagraphIds();
 * ```
 */

import { CommandProps, Editor, Extension } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { generateParagraphId, isParagraphId } from '@/lib/provenance/paragraph-id';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphIdentity: {
      /** Assign a fresh paragraph ID to the block at the selection. */
      assignParagraphId: () => ReturnType;
      /** Mark a paragraph as needing a database write. */
      markParagraphForSave: (options: { paragraphId: string }) => ReturnType;
    };
  }
}

interface ParagraphIdentityStorage {
  paragraphIds: Map<string, string>; // maps node content hash to paragraph ID
  nodesPendingSave: Set<string>; // paragraph IDs that need to be saved to DB
}

interface ParagraphIdentityOptions {
  documentId: string | null;
  userId: string | null;
  onParagraphCreated?: (paragraphId: string, content: string) => void;
  onParagraphEdited?: (
    paragraphId: string,
    oldContent: string,
    newContent: string
  ) => void;
}

/**
 * Node types that should have paragraph IDs.
 * Includes block-level elements that can carry provenance.
 */
const PARAGRAPH_NODE_TYPES = ['paragraph', 'heading', 'blockquote'];

/**
 * Helper: Ensure all paragraphs in a document have IDs.
 */
function ensureAllParagraphsHaveIds(doc: ProseMirrorNode, editor: Editor) {
  let needsUpdate = false;
  const tr = editor.state.tr;

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (PARAGRAPH_NODE_TYPES.includes(node.type.name)) {
      const paragraphId = node.attrs?.paragraphId;
      if (!paragraphId || !isParagraphId(paragraphId)) {
        const newId = generateParagraphId();
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          paragraphId: newId,
        });
        needsUpdate = true;
      }
    }
  });

  if (needsUpdate && editor.view) {
    editor.view.dispatch(tr);
  }
}

/**
 * Helper: Get the paragraph ID from a node.
 */
function getParagraphId(node: ProseMirrorNode): string | null {
  const paragraphId = node.attrs?.paragraphId;
  if (paragraphId && isParagraphId(paragraphId)) {
    return paragraphId;
  }
  return null;
}

/**
 * TipTap Extension for paragraph identity management.
 */
export const ParagraphIdentity = Extension.create<
  ParagraphIdentityOptions,
  ParagraphIdentityStorage
>({
  name: 'paragraphIdentity',

  addOptions() {
    return {
      documentId: null,
      userId: null,
      onParagraphCreated: undefined,
      onParagraphEdited: undefined,
    };
  },

  addStorage() {
    return {
      paragraphIds: new Map(),
      nodesPendingSave: new Set(),
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('paragraphIdentity'),

        /**
         * Initialize paragraph IDs on document load or creation.
         */
        state: {
          init(config, state) {
            ensureAllParagraphsHaveIds(state.doc, extension.editor);
            return null;
          },

          apply(tr, value, oldState, newState) {
            // Ensure new paragraphs get IDs
            ensureAllParagraphsHaveIds(newState.doc, extension.editor);
            return null;
          },
        },

        /**
         * Detect paragraph edits and trigger callbacks.
         */
        appendTransaction(transactions, oldState, newState) {
          // Check for paragraph edits
          oldState.doc.descendants((oldNode, oldPos) => {
            if (!PARAGRAPH_NODE_TYPES.includes(oldNode.type.name)) {
              return;
            }

            const newNode = newState.doc.nodeAt(oldPos);
            if (!newNode) {
              return;
            }

            const oldContent = oldNode.textContent;
            const newContent = newNode.textContent;

            // Content changed
            if (oldContent !== newContent) {
              const paragraphId = getParagraphId(newNode);
              if (paragraphId && extension.options.onParagraphEdited) {
                extension.options.onParagraphEdited(
                  paragraphId,
                  oldContent,
                  newContent
                );
              }
            }
          });

          return null;
        },
      }),
    ];
  },

  addCommands() {
    return {
      /**
       * Manually assign a paragraph ID to the current node.
       */
      assignParagraphId: () => ({ commands, editor }: CommandProps) => {
        const { $from } = editor.state.selection;
        const node = $from.node($from.depth);

        if (!PARAGRAPH_NODE_TYPES.includes(node.type.name)) {
          return false;
        }

        const paragraphId = generateParagraphId();
        return commands.updateAttributes(node.type.name, {
          paragraphId,
        });
      },

      /**
       * Mark a paragraph as needing to be saved to the database.
       */
      markParagraphForSave: ({ paragraphId: _paragraphId }: { paragraphId: string }) => () => {
        // This would be handled by the extension storage
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // No special keyboard shortcuts for paragraph identity
      // The extension works transparently
    };
  },
});

/**
 * Read the paragraph ID at the current selection, or null if the block has none.
 *
 * Not a TipTap command: commands must return boolean, and this returns a value.
 * It was declared inside addCommands and had no callers, so it never worked.
 */
export function getParagraphIdAtSelection(editor: Editor): string | null {
  const { $from } = editor.state.selection;

  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (PARAGRAPH_NODE_TYPES.includes(node.type.name)) {
      const paragraphId = node.attrs?.paragraphId;
      if (paragraphId && isParagraphId(paragraphId)) {
        return paragraphId;
      }
    }
  }

  return null;
}

/**
 * Every paragraph ID in the document, in document order.
 *
 * Not a TipTap command, for the same reason as above.
 */
export function getAllParagraphIds(editor: Editor): string[] {
  const ids: string[] = [];

  editor.state.doc.descendants((node: ProseMirrorNode) => {
    if (PARAGRAPH_NODE_TYPES.includes(node.type.name)) {
      const paragraphId = node.attrs?.paragraphId;
      if (paragraphId && isParagraphId(paragraphId)) {
        ids.push(paragraphId);
      }
    }
  });

  return ids;
}

/**
 * Helper: Add paragraph ID attributes to node specs.
 * 
 * Call this when defining node specs to add the paragraphId attribute.
 * 
 * Example:
 * ```typescript
 * Paragraph.extend({
 *   addAttributes() {
 *     return {
 *       ...this.parent?.(),
 *       ...addParagraphIdAttribute(),
 *     };
 *   },
 * })
 * ```
 */
export function addParagraphIdAttribute() {
  return {
    paragraphId: {
      default: null,
      // Parse from HTML data attribute
      parseHTML: (element: any) => {
        const id = element.getAttribute('data-paragraph-id');
        if (id && isParagraphId(id)) {
          return id;
        }
        // Assign new ID if missing
        return generateParagraphId();
      },
      // Serialize to HTML data attribute
      renderHTML: (attrs: any) => {
        if (attrs.paragraphId && isParagraphId(attrs.paragraphId)) {
          return {
            'data-paragraph-id': attrs.paragraphId,
          };
        }
        return {};
      },
    },
  };
}

/**
 * Helper: Assign IDs to existing paragraphs in an editor.
 * 
 * Use this when you have an existing editor without IDs.
 * Migrates all paragraphs to have stable IDs.
 */
export function migrateParagraphIds(editor: any): Map<string, string> {
  const idMap = new Map<string, string>();
  const tr = editor.state.tr;
  let changed = false;

  editor.state.doc.nodesBetween(0, editor.state.doc.content.size, (node: ProseMirrorNode, pos: number) => {
    if (PARAGRAPH_NODE_TYPES.includes(node.type.name)) {
      const existingId = node.attrs?.paragraphId;

      if (!existingId || !isParagraphId(existingId)) {
        const newId = generateParagraphId();
        idMap.set(node.textContent.substring(0, 50), newId);

        // Update the node with the new ID
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          paragraphId: newId,
        });

        changed = true;
      } else {
        idMap.set(node.textContent.substring(0, 50), existingId);
      }
    }
  });

  if (changed) {
    editor.view.dispatch(tr);
  }

  return idMap;
}

/**
 * Helper: Get paragraph ID for text content.
 * 
 * Searches the document for a paragraph containing the given text
 * and returns its ID.
 */
export function getParagraphIdForContent(
  editor: any,
  text: string
): string | null {
  let foundId: string | null = null;

  editor.state.doc.descendants((node: ProseMirrorNode) => {
    if (node.textContent.includes(text)) {
      const id = node.attrs?.paragraphId;
      if (id && isParagraphId(id)) {
        foundId = id;
      }
    }
  });

  return foundId;
}

/**
 * Helper: Get all paragraph IDs and their contents.
 * 
 * Returns a map of paragraph IDs to their text content.
 * Useful for serialization and provenance tracking.
 */
export function getAllParagraphsWithIds(editor: any): Map<string, string> {
  const paragraphs = new Map<string, string>();

  editor.state.doc.descendants((node: ProseMirrorNode) => {
    if (PARAGRAPH_NODE_TYPES.includes(node.type.name)) {
      const id = node.attrs?.paragraphId;
      if (id && isParagraphId(id)) {
        paragraphs.set(id, node.textContent);
      }
    }
  });

  return paragraphs;
}
