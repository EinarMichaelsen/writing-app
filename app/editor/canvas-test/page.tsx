"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CanvasTestPage() {
  const [text, setText] = useState("")
  const router = useRouter()

  // Create a canvas manually in JavaScript without TypeScript
  // to avoid linter errors
  const CanvasEditor = () => {
    const canvasRef = { current: null }
    const [canvasText, setCanvasText] = useState("")
    const [cursorPos, setCursorPos] = useState(0)
    const [hasFocus, setHasFocus] = useState(false)
    
    // Setup canvas element
    const setupCanvas = (canvas) => {
      if (!canvas) return
      
      canvasRef.current = canvas
      
      // Set initial dimensions
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Initial render
      renderCanvas()
      
      // Handle resize
      window.addEventListener("resize", () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        renderCanvas()
      })
    }
    
    // Render text and cursor
    const renderCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Set font properties
      const fontSize = 16
      const fontFamily = "sans-serif"
      ctx.font = `${fontSize}px ${fontFamily}`
      ctx.textBaseline = "top"
      ctx.fillStyle = "black"
      ctx.textAlign = "left"
      ctx.direction = "ltr"
      
      // Draw text
      const padding = 10
      ctx.fillText(canvasText, padding, padding)
      
      // Draw cursor if focused
      if (hasFocus) {
        let cursorX = padding
        
        if (cursorPos > 0) {
          // Measure text width up to cursor
          const textBeforeCursor = canvasText.substring(0, cursorPos)
          cursorX += ctx.measureText(textBeforeCursor).width
        }
        
        // Draw cursor line
        ctx.fillRect(cursorX, padding, 1, fontSize * 1.5)
      }
    }
    
    // Handle keyboard input
    const handleKeyDown = (e) => {
      if (e.key !== "F5" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
      }
      
      if (e.key === "ArrowLeft") {
        setCursorPos(Math.max(0, cursorPos - 1))
      } else if (e.key === "ArrowRight") {
        setCursorPos(Math.min(canvasText.length, cursorPos + 1))
      } else if (e.key === "Home") {
        setCursorPos(0)
      } else if (e.key === "End") {
        setCursorPos(canvasText.length)
      } else if (e.key === "Backspace") {
        if (cursorPos > 0) {
          const newText = canvasText.slice(0, cursorPos - 1) + canvasText.slice(cursorPos)
          setCanvasText(newText)
          setCursorPos(cursorPos - 1)
          setText(newText)
        }
      } else if (e.key === "Delete") {
        if (cursorPos < canvasText.length) {
          const newText = canvasText.slice(0, cursorPos) + canvasText.slice(cursorPos + 1)
          setCanvasText(newText)
          setText(newText)
        }
      } else if (e.key.length === 1) {
        const newText = canvasText.slice(0, cursorPos) + e.key + canvasText.slice(cursorPos)
        setCanvasText(newText)
        setCursorPos(cursorPos + 1)
        setText(newText)
      }
      
      // Need to re-render after state changes
      setTimeout(renderCanvas, 0)
    }
    
    // Handle click for cursor position
    const handleClick = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      
      // Get click position
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      
      // Find closest character position
      const padding = 10
      let closestPos = 0
      let minDistance = Number.MAX_VALUE
      
      for (let i = 0; i <= canvasText.length; i++) {
        const textWidth = ctx.measureText(canvasText.substring(0, i)).width
        const charX = padding + textWidth
        const distance = Math.abs(x - charX)
        
        if (distance < minDistance) {
          minDistance = distance
          closestPos = i
        }
      }
      
      setCursorPos(closestPos)
      setTimeout(renderCanvas, 0)
    }
    
    return (
      <canvas
        ref={setupCanvas}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={() => { setHasFocus(true); renderCanvas(); }}
        onBlur={() => { setHasFocus(false); renderCanvas(); }}
        style={{ width: "100%", height: "300px", border: "1px solid #ccc", borderRadius: "0.375rem" }}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value="Canvas Text Editor Test"
              readOnly
              className="h-9 font-medium border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Canvas Text Editor Test</h1>
          <p className="mb-4">Test the canvas text editor below. The cursor should work correctly and text should appear in the correct order.</p>
          
          <div className="my-6">
            <CanvasEditor />
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h2 className="text-lg font-semibold mb-2">Current Text Content:</h2>
            <p className="whitespace-pre-wrap">{text || "(empty)"}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 