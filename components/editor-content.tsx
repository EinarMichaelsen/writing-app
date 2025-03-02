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
    const [selectionRange, setSelectionRange] = useState<Range | null>(null)
    const [isComposing, setIsComposing] = useState(false)

    // Combine ref from forwardRef with local ref
    useEffect(() => {
      if (typeof ref === "function") {
        ref(editorRef.current)
      } else if (ref) {
        ref.current = editorRef.current
      }
    }, [ref])

    // Handle content edits
    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      if (isComposing) return // Skip if we're in IME composition
      const newContent = e.currentTarget.textContent || ""
      onChange(newContent)
    }

    const handleCompositionStart = () => {
      setIsComposing(true)
    }

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>) => {
      setIsComposing(false)
      const newContent = e.currentTarget.textContent || ""
      onChange(newContent)
    }

    // Save selection range when it changes
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        if (editorRef.current?.contains(range.commonAncestorContainer)) {
          setSelectionRange(range.cloneRange())
        }
      }
    }

    useEffect(() => {
      document.addEventListener("selectionchange", handleSelectionChange)
      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange)
      }
    }, [])

    // Update editor content when content prop changes
    useEffect(() => {
      if (editorRef.current) {
        const selection = window.getSelection()
        const currentContent = editorRef.current.textContent

        if (currentContent !== content) {
          const cursorPosition = selection?.getRangeAt(0)?.startOffset || 0
          editorRef.current.textContent = content

          // Restore cursor position
          if (selection && editorRef.current.firstChild) {
            const range = document.createRange()
            const newPosition = Math.min(cursorPosition, content.length)
            range.setStart(editorRef.current.firstChild, newPosition)
            range.setEnd(editorRef.current.firstChild, newPosition)
            selection.removeAllRanges()
            selection.addRange(range)
          }
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
            onInput={handleInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
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

