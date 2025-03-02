"use client"

import type React from "react"
import { forwardRef, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface EditorContentProps {
  content: string
  suggestion?: string
  onChange: (content: string) => void
  className?: string
}

export const EditorContent = forwardRef<HTMLDivElement, EditorContentProps>(
  ({ content, suggestion, onChange, className }, ref) => {
    const editorRef = useRef<HTMLDivElement | null>(null)
    const lastContentRef = useRef(content)

    const syncContent = () => {
      if (!editorRef.current) return
      const currentContent = editorRef.current.textContent || ""
      if (currentContent !== lastContentRef.current) {
        lastContentRef.current = currentContent
        onChange(currentContent)
      }
    }

    // Handle keyboard shortcuts and special keys
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault()
        const selection = window.getSelection()
        if (!selection) return

        document.execCommand('insertText', false, suggestion)
        syncContent()
      }
    }

    // Handle paste events
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
      syncContent()
    }

    // Handle input events
    const handleInput = () => {
      syncContent()
    }

    // Update content when prop changes
    useEffect(() => {
      if (!editorRef.current || content === lastContentRef.current) return

      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      const isAtEnd = range?.startOffset === lastContentRef.current.length

      editorRef.current.textContent = content
      lastContentRef.current = content

      if (isAtEnd && selection && editorRef.current.firstChild) {
        const newRange = document.createRange()
        newRange.setStart(editorRef.current.firstChild, content.length)
        newRange.setEnd(editorRef.current.firstChild, content.length)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }, [content])

    return (
      <div className="relative h-full overflow-auto bg-background">
        <div className="container py-8 mx-auto max-w-3xl">
          <div
            ref={editorRef}
            contentEditable
            className={cn(
              "min-h-[calc(100vh-10rem)] outline-none prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert prose-headings:font-heading focus:outline-none whitespace-pre-wrap break-words",
              className
            )}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            suppressContentEditableWarning
            spellCheck="true"
          >
            {content}
          </div>
          {suggestion && (
            <div className="text-muted-foreground opacity-70 mt-1 pl-1">
              {suggestion} <span className="text-xs">(Press Tab to accept)</span>
            </div>
          )}
        </div>
      </div>
    )
  }
)

EditorContent.displayName = "EditorContent"

