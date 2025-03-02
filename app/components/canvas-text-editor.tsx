"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useState } from 'react'

interface CanvasTextEditorProps {
  initialContent?: string
  onChange?: (text: string) => void
  onBlur?: () => void
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  style?: React.CSSProperties
  className?: string
  autoFocus?: boolean
}

export function CanvasTextEditor({
  initialContent = '',
  onChange,
  onBlur,
  position = { x: 0, y: 0 },
  onPositionChange,
  style = {},
  className = '',
  autoFocus = true,
}: CanvasTextEditorProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  
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
        placeholder: 'Type here...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'focus:outline-none p-2 min-w-[100px]',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getText())
    },
    onBlur: () => {
      onBlur?.()
    },
    autofocus: autoFocus,
  })

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('editor-drag-handle')) {
      setIsDragging(true)
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      onPositionChange?.({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
    }
  }

  // Add and remove event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // Clean up editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div 
      ref={containerRef}
      className={`canvas-text-editor absolute bg-white border rounded-md shadow-sm ${className}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        ...style 
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="editor-drag-handle h-6 bg-gray-100 border-b flex items-center justify-center cursor-grab px-2 text-xs text-gray-500">
        Drag to move
      </div>
      <EditorContent editor={editor} />
      <style jsx global>{`
        .canvas-text-editor .is-editor-empty:before {
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