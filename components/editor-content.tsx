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
      const newContent = e.currentTarget.innerText
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
    }, []) // Removed handleSelectionChange from dependencies

    // Update editor content when content prop changes
    useEffect(() => {
      if (editorRef.current) {
        // Only update if the content is different to avoid cursor jumping
        if (editorRef.current.innerText !== content) {
          editorRef.current.innerText = content
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
              "min-h-[calc(100vh-10rem)] outline-none prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert prose-headings:font-heading focus:outline-none",
              className,
            )}
            onInput={handleInput}
            suppressContentEditableWarning
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
  },
)

EditorContent.displayName = "EditorContent"

