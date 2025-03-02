"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

export default function CleanCanvasPage() {
  const [content, setContent] = useState("")
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing here...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'outline-none p-8 min-h-full max-w-none canvas-editor',
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    autofocus: true,
    immediatelyRender: false,
  })

  // Clean up editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <h1 className="text-2xl font-bold">Canvas Editor</h1>
        <Button onClick={() => router.push("/editor/new")}>
          Back to Editor
        </Button>
      </div>

      <div 
        ref={canvasContainerRef}
        className="flex-1 bg-gray-50 relative overflow-auto p-4"
      >
        <div className="bg-white rounded-lg shadow-sm min-h-full mx-auto max-w-4xl">
          <EditorContent editor={editor} className="min-h-full" />
        </div>
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 100%;
          font-size: 1rem;
          line-height: 1.5;
        }
        
        .is-editor-empty:before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .canvas-editor p {
          margin-bottom: 0.75rem;
        }
        
        .canvas-editor:focus {
          outline: none;
        }
      `}</style>
    </div>
  )
} 