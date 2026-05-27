'use client';

import type { Editor } from '@tiptap/react';

const actions = [
  { label: 'Bold', run: (editor: Editor) => editor.chain().focus().toggleBold().run() },
  { label: 'Italic', run: (editor: Editor) => editor.chain().focus().toggleItalic().run() },
  { label: 'Underline', run: (editor: Editor) => editor.chain().focus().toggleUnderline().run() },
  { label: 'H1', run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'H2', run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'H3', run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Normal', run: (editor: Editor) => editor.chain().focus().setParagraph().run() },
  { label: 'Bullet', run: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { label: 'Numbered', run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
  { label: 'Quote', run: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
  { label: 'Code', run: (editor: Editor) => editor.chain().focus().toggleCode().run() },
  { label: 'Undo', run: (editor: Editor) => editor.chain().focus().undo().run() },
  { label: 'Redo', run: (editor: Editor) => editor.chain().focus().redo().run() },
];

export function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return null;
  }

  return (
    <div className="toolbar">
      {actions.map((action) => (
        <button key={action.label} type="button" onClick={() => action.run(editor)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
