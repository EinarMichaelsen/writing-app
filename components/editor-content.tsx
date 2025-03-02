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

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Allow all standard keyboard shortcuts
      if (e.metaKey || e.ctrlKey) {
        return
      }

      // Handle Tab key for suggestions
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault()
        const selection = window.getSelection()
        if (!selection) return

        const range = selection.getRangeAt(0)
        const target = e.currentTarget
        const offset = range.startOffset
        const before = target.textContent?.slice(0, offset) || ""
        const after = target.textContent?.slice(offset) || ""
        const newContent = before + suggestion + after

        target.textContent = newContent
        onChange(newContent)
        setLocalContent(newContent)

        // Set cursor position after suggestion
        const newRange = document.createRange()
        const textNode = target.firstChild || target
        const newPosition = offset + suggestion.length
        newRange.setStart(textNode, newPosition)
        newRange.setEnd(textNode, newPosition)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }

    // Handle content changes
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const newContent = e.currentTarget.textContent || ""
      if (newContent !== localContent) {
        setLocalContent(newContent)
        onChange(newContent)
      }
    }

    // Handle paste events to strip formatting
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
      
      const newContent = e.currentTarget.textContent || ""
      setLocalContent(newContent)
      onChange(newContent)
    }

    // Update local content when prop changes
    useEffect(() => {
      if (content !== localContent && editorRef.current) {
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        const isAtEnd = range?.startOffset === localContent.length

        editorRef.current.textContent = content
        setLocalContent(content)

        // Restore cursor position if it was at the end
        if (isAtEnd && selection && editorRef.current.firstChild) {
          const newRange = document.createRange()
          newRange.setStart(editorRef.current.firstChild, content.length)
          newRange.setEnd(editorRef.current.firstChild, content.length)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
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
            dir="ltr"
            style={{
              caretColor: 'auto',
              WebkitUserModify: 'read-write-plaintext-only',
              unicodeBidi: 'isolate',
              direction: 'ltr'
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

