"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

export default function HybridCanvasPage() {
  const [content, setContent] = useState("")
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // State for canvas drawing
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingMode, setDrawingMode] = useState<'none' | 'pencil'>('none')
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })

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
        placeholder: 'Click anywhere and start typing...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'outline-none p-8 min-h-full max-w-none canvas-editor',
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML())
    },
    autofocus: true,
    immediatelyRender: false,
  })

  // Setup canvas when component mounts
  useEffect(() => {
    const setupCanvas = () => {
      const canvas = canvasRef.current
      const container = canvasContainerRef.current
      
      if (!canvas || !container) return
      
      // Set canvas size to match container
      canvas.width = container.offsetWidth
      canvas.height = container.offsetHeight
      
      // Clear canvas with white background
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
    
    setupCanvas()
    window.addEventListener('resize', setupCanvas)
    
    return () => {
      window.removeEventListener('resize', setupCanvas)
    }
  }, [])

  // Clean up editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  // Canvas drawing handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'none') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsDrawing(true)
    setLastPosition({ x, y })
  }
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || drawingMode === 'none') return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    ctx.beginPath()
    ctx.moveTo(lastPosition.x, lastPosition.y)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.closePath()
    
    setLastPosition({ x, y })
  }
  
  const handleCanvasMouseUp = () => {
    setIsDrawing(false)
  }
  
  const handleCanvasMouseLeave = () => {
    setIsDrawing(false)
  }

  const toggleDrawingMode = () => {
    setDrawingMode(drawingMode === 'none' ? 'pencil' : 'none')
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <h1 className="text-2xl font-bold">Hybrid Canvas Editor</h1>
        <div className="flex gap-2">
          <Button 
            variant={drawingMode === 'pencil' ? "default" : "outline"} 
            onClick={toggleDrawingMode}
          >
            {drawingMode === 'pencil' ? 'Drawing Mode' : 'Text Mode'}
          </Button>
          <Button variant="outline" onClick={clearCanvas}>
            Clear Drawing
          </Button>
          <Button onClick={() => router.push("/editor/new")}>
            Back to Editor
          </Button>
        </div>
      </div>

      <div 
        ref={canvasContainerRef}
        className="flex-1 bg-gray-50 relative overflow-hidden p-4"
      >
        {/* Text editor layer */}
        <div 
          ref={editorRef}
          className="bg-white rounded-lg shadow-sm min-h-full mx-auto max-w-4xl relative z-10"
          style={{ pointerEvents: drawingMode === 'none' ? 'auto' : 'none' }}
        >
          <EditorContent editor={editor} className="min-h-full" />
        </div>
        
        {/* Canvas overlay layer */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
          style={{ pointerEvents: drawingMode === 'pencil' ? 'auto' : 'none' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
        />
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 100%;
          font-size: 1rem;
          line-height: 1.5;
        }
        
        .is-editor-empty:before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .canvas-editor p {
          margin-bottom: 0.75rem;
        }
        
        .canvas-editor:focus {
          outline: none;
        }
      `}</style>
    </div>
  )
} 