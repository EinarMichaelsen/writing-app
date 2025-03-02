"use client"

import type React from "react"
import { forwardRef, useEffect, useRef, useState } from "react"
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
    const [localContent, setLocalContent] = useState(content)

    // Handle all keyboard events
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Allow default behavior for common keyboard shortcuts
      if (
        (e.metaKey || e.ctrlKey) && // Command/Control key
        ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key.toLowerCase())
      ) {
        return // Let the browser handle these shortcuts
      }

      // Let the contentEditable handle most keys naturally
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Enter' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Tab'
      ) {
        return // Let contentEditable handle these keys
      }
    }

    // Handle content changes
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const newContent = e.currentTarget.textContent || ""
      setLocalContent(newContent)
      onChange(newContent)
    }

    // Handle paste events to strip formatting
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }

    // Update local content when prop changes
    useEffect(() => {
      if (content !== localContent) {
        setLocalContent(content)
      }
    }, [content])

    // Update editor content
    useEffect(() => {
      if (editorRef.current && editorRef.current.textContent !== localContent) {
        editorRef.current.textContent = localContent
      }
    }, [localContent])

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
            style={{
              caretColor: 'auto', // Ensures visible cursor
              WebkitUserModify: 'read-write-plaintext-only', // Prevents formatting on paste in WebKit
            }}
          >
            {localContent}
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

