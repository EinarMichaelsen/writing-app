"use client"

import type React from "react"
import { forwardRef, useEffect, useRef, useState } from "react"
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
    const [showInlineSuggestion, setShowInlineSuggestion] = useState(false)
    const suggestionSpanRef = useRef<HTMLSpanElement | null>(null)

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
          
          // Remove inline suggestion when text changes
          setShowInlineSuggestion(false)
        }
      },
      onSelectionUpdate: ({ editor }) => {
        // Show suggestion only when cursor is at the end of the text
        const editorText = editor.getText();
        const { from } = editor.state.selection;
        const isAtEnd = from === editorText.length;
        
        // Only show suggestion if we're at the end of the text and have a suggestion
        setShowInlineSuggestion(isAtEnd && !!suggestion);
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
          setShowInlineSuggestion(false)
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

    // Position the inline suggestion span after the editor content updates
    useEffect(() => {
      if (!editor || !suggestion || !showInlineSuggestion) return;
      
      const updateSuggestionPosition = () => {
        if (!suggestionSpanRef.current) return;
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Calculate position - this needs to be relative to the editor container
        const editorContainer = document.querySelector('.ProseMirror');
        if (!editorContainer) return;
        
        const editorRect = editorContainer.getBoundingClientRect();
        
        suggestionSpanRef.current.style.left = `${rect.right - editorRect.left}px`;
        suggestionSpanRef.current.style.top = `${rect.top - editorRect.top}px`;
      };
      
      // Update position initially and on window resize
      updateSuggestionPosition();
      window.addEventListener('resize', updateSuggestionPosition);
      
      return () => {
        window.removeEventListener('resize', updateSuggestionPosition);
      };
    }, [editor, suggestion, showInlineSuggestion]);

    return (
      <div className="relative h-full overflow-auto bg-background" onKeyDown={handleKeyDown} ref={ref}>
        <div className="container py-8 mx-auto max-w-3xl">
          <div className="relative">
            <TiptapEditorContent 
              editor={editor} 
              className={cn(
                "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert prose-headings:font-heading focus:outline-none",
                className
              )}
            />
            
            {/* Inline suggestion that appears within the editor */}
            {suggestion && showInlineSuggestion && (
              <div className="tiptap-suggestion">
                <span ref={suggestionSpanRef} className="suggestion-text">
                  {suggestion}
                </span>
              </div>
            )}
          </div>
          
          {/* Bottom suggestion (as fallback) */}
          {suggestion && !showInlineSuggestion && (
            <div className="text-muted-foreground opacity-70 mt-1 pl-1">
              {suggestion} <span className="text-xs">(Press Tab to accept)</span>
            </div>
          )}
        </div>
        <style jsx global>{`
          .ProseMirror {
            min-height: calc(100vh - 10rem);
            outline: none;
            position: relative;
          }
          
          .is-editor-empty:before {
            color: #adb5bd;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
          
          .tiptap-suggestion {
            position: absolute;
            pointer-events: none;
          }
          
          .suggestion-text {
            position: absolute;
            color: #6c757d;
            opacity: 0.8;
            font-family: inherit;
            font-size: inherit;
            white-space: pre;
          }
        `}</style>
      </div>
    )
  }
)

EditorContent.displayName = "EditorContent"

