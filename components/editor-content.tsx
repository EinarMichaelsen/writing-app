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

    // Handle keydown events to prevent text reversal
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      const offset = range?.startOffset || 0
      
      // Handle regular input
      if (e.key.length === 1) { // Single character
        e.preventDefault()
        const before = target.textContent?.slice(0, offset) || ""
        const after = target.textContent?.slice(offset) || ""
        const newContent = before + e.key + after
        
        setLocalContent(newContent)
        onChange(newContent)
        
        // Move cursor position
        requestAnimationFrame(() => {
          const newRange = document.createRange()
          newRange.setStart(target.firstChild || target, offset + 1)
          newRange.setEnd(target.firstChild || target, offset + 1)
          selection?.removeAllRanges()
          selection?.addRange(newRange)
        })
      }
      
      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault()
        if (offset > 0) {
          const before = target.textContent?.slice(0, offset - 1) || ""
          const after = target.textContent?.slice(offset) || ""
          const newContent = before + after
          
          setLocalContent(newContent)
          onChange(newContent)
          
          // Move cursor position
          requestAnimationFrame(() => {
            const newRange = document.createRange()
            newRange.setStart(target.firstChild || target, offset - 1)
            newRange.setEnd(target.firstChild || target, offset - 1)
            selection?.removeAllRanges()
            selection?.addRange(newRange)
          })
        }
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
              "min-h-[calc(100vh-10rem)] outline-none prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert prose-headings:font-heading focus:outline-none",
              className
            )}
            onKeyDown={handleKeyDown}
            suppressContentEditableWarning
            spellCheck="true"
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

