"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface TiptapEditorProps {
  content?: string
  onChange?: (html: string, text: string) => void
  className?: string
  placeholder?: string
  autofocus?: boolean
}

export function TiptapEditor({
  content = '',
  onChange,
  className = '',
  placeholder = 'Start writing...',
  autofocus = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[150px] prose prose-sm sm:prose lg:prose-lg max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getText())
    },
    autofocus,
  })

  // Ensure proper editor cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div className={`tiptap-editor w-full p-4 border rounded-md ${className}`}>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .is-editor-empty:before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
} 