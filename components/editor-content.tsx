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

      // Handle single character input
      if (e.key.length === 1) {
        e.preventDefault()
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        const offset = range?.startOffset || 0
        
        const target = e.currentTarget
        const before = target.textContent?.slice(0, offset) || ""
        const after = target.textContent?.slice(offset) || ""
        const newContent = before + e.key + after
        
        setLocalContent(newContent)
        onChange(newContent)

        // Move cursor position
        requestAnimationFrame(() => {
          const newRange = document.createRange()
          const textNode = target.firstChild || target
          const newPosition = offset + 1
          newRange.setStart(textNode, newPosition)
          newRange.setEnd(textNode, newPosition)
          selection?.removeAllRanges()
          selection?.addRange(newRange)
        })
      }
    }

    // Handle content changes
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const newContent = target.textContent || ""
      
      // Only update if content actually changed
      if (newContent !== localContent) {
        setLocalContent(newContent)
        onChange(newContent)
      }
    }

    // Handle paste events to strip formatting
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      
      if (range) {
        range.deleteContents()
        const textNode = document.createTextNode(text)
        range.insertNode(textNode)
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        selection?.removeAllRanges()
        selection?.addRange(range)
        
        const newContent = editorRef.current?.textContent || ""
        setLocalContent(newContent)
        onChange(newContent)
      }
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
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        const offset = range?.startOffset || 0
        
        editorRef.current.textContent = localContent
        
        if (selection && editorRef.current.firstChild) {
          const newRange = document.createRange()
          const newPosition = Math.min(offset, localContent.length)
          newRange.setStart(editorRef.current.firstChild, newPosition)
          newRange.setEnd(editorRef.current.firstChild, newPosition)
          selection.removeAllRanges()
          selection.addRange(newRange)
        }
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

