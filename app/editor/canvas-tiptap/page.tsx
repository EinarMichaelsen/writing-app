"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CanvasTextEditor } from "@/app/components/canvas-text-editor"

interface TextNode {
  id: string
  content: string
  position: { x: number; y: number }
}

export default function CanvasTiptapPage() {
  const [textNodes, setTextNodes] = useState<TextNode[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Set up canvas size on mount and resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        setCanvasSize({
          width: canvasContainerRef.current.offsetWidth,
          height: canvasContainerRef.current.offsetHeight,
        })
      }
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [])

  // Add a new text node at the canvas center
  const addTextNode = () => {
    const newNode: TextNode = {
      id: `text-${Date.now()}`,
      content: '',
      position: {
        x: canvasSize.width / 2 - 100,
        y: canvasSize.height / 2 - 50,
      },
    }
    setTextNodes([...textNodes, newNode])
  }

  // Update text node content
  const updateTextNodeContent = (id: string, content: string) => {
    setTextNodes(
      textNodes.map((node) => 
        node.id === id ? { ...node, content } : node
      )
    )
  }

  // Update text node position
  const updateTextNodePosition = (id: string, position: { x: number; y: number }) => {
    setTextNodes(
      textNodes.map((node) => 
        node.id === id ? { ...node, position } : node
      )
    )
  }

  // Remove a text node
  const removeTextNode = (id: string) => {
    setTextNodes(textNodes.filter((node) => node.id !== id))
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">Canvas with Tiptap</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addTextNode}>
            Add Text
          </Button>
          <Button
            onClick={() => router.push("/editor/new")}
          >
            Back to Editor
          </Button>
        </div>
      </div>

      <div 
        ref={canvasContainerRef}
        className="flex-1 bg-gray-100 relative overflow-hidden"
      >
        {textNodes.map((node) => (
          <div key={node.id} className="absolute" style={{ left: node.position.x, top: node.position.y }}>
            <CanvasTextEditor
              initialContent={node.content}
              position={node.position}
              onChange={(content) => updateTextNodeContent(node.id, content)}
              onPositionChange={(position) => updateTextNodePosition(node.id, position)}
              className="min-w-[200px]"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-0 right-0 h-6 w-6 translate-x-1/2 -translate-y-1/2 rounded-full"
              onClick={() => removeTextNode(node.id)}
            >
              ✕
            </Button>
          </div>
        ))}

        {textNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No text elements yet</p>
              <Button variant="default" onClick={addTextNode}>
                Add Text
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Click <strong>Add Text</strong> to add a new text editor to the canvas</li>
          <li>Drag the text editor by its header to reposition</li>
          <li>Click the × button to remove a text editor</li>
          <li>Type in the text editor to add content</li>
        </ul>
      </div>
    </div>
  )
} 