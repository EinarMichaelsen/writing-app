"use client"

import type React from "react"
import { forwardRef, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface EditorContentProps {
  content: string
  suggestion?: string
  onChange: (content: string) => void
  className?: string
}

export const EditorContent = forwardRef<HTMLDivElement, EditorContentProps>(
  ({ content, suggestion, onChange, className }, ref) => {
    const lastContentRef = useRef(content)

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {},
          bulletList: {},
          orderedList: {},
          listItem: {},
          codeBlock: false,
          horizontalRule: false,
          blockquote: {},
        }),
        Placeholder.configure({
          placeholder: 'Start writing here...',
          emptyEditorClass: 'is-editor-empty',
        }),
      ],
      content,
      editorProps: {
        attributes: {
          class: 'outline-none min-h-[calc(100vh-10rem)] max-w-none',
        },
      },
      onUpdate: ({ editor }) => {
        const newContent = editor.getText()
        if (newContent !== lastContentRef.current) {
          lastContentRef.current = newContent
          onChange(newContent)
        }
      },
      autofocus: true,
    })

    // Apply suggestions when Tab is pressed
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault()
        if (editor) {
          editor.commands.insertContent(suggestion)
          lastContentRef.current = editor.getText()
          onChange(lastContentRef.current)
        }
      }
    }

    // Update editor content when prop changes
    useEffect(() => {
      if (!editor || content === lastContentRef.current) return
      
      editor.commands.setContent(content)
      lastContentRef.current = content
    }, [content, editor])

    // Clean up editor on unmount
    useEffect(() => {
      return () => {
        editor?.destroy()
      }
    }, [editor])

    return (
      <div className="relative h-full overflow-auto bg-background" onKeyDown={handleKeyDown} ref={ref}>
        <div className="container py-8 mx-auto max-w-3xl">
          <TiptapEditorContent 
            editor={editor} 
            className={cn(
              "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert prose-headings:font-heading focus:outline-none",
              className
            )}
          />
          {suggestion && (
            <div className="text-muted-foreground opacity-70 mt-1 pl-1">
              {suggestion} <span className="text-xs">(Press Tab to accept)</span>
            </div>
          )}
        </div>
        <style jsx global>{`
          .ProseMirror {
            min-height: calc(100vh - 10rem);
            outline: none;
          }
          
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
)

EditorContent.displayName = "EditorContent"

