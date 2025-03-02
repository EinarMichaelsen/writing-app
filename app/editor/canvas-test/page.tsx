"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CanvasTestPage() {
  const [text, setText] = useState("")
  const router = useRouter()

  // Fixed canvas implementation that guarantees left-to-right text
  const CanvasEditor = () => {
    // Set up refs and state
    const canvasRef = useRef(null)
    const [canvasText, setCanvasText] = useState("")
    const [cursorPos, setCursorPos] = useState(0)
    const [hasFocus, setHasFocus] = useState(false)
    
    // Initialize canvas on mount and handle resizing
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const setupCanvas = () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        renderCanvas()
      }
      
      setupCanvas()
      
      // Handle window resize
      window.addEventListener("resize", setupCanvas)
      return () => window.removeEventListener("resize", setupCanvas)
    }, [])
    
    // Draw text and cursor on canvas
    const renderCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Configure text settings - explicitly force LTR
      const fontSize = 16
      const lineHeight = fontSize * 1.5
      ctx.font = `${fontSize}px sans-serif`
      ctx.textBaseline = "top"
      ctx.textAlign = "left"
      ctx.direction = "ltr" 
      
      // Draw background to visually debug the text area
      const padding = 10
      ctx.fillStyle = "#f9f9f9"
      ctx.fillRect(padding - 2, padding - 2, canvas.width - 2*padding + 4, lineHeight + 4)
      
      // Draw text (ensuring left-to-right)
      ctx.fillStyle = "#000000"
      ctx.fillText(canvasText, padding, padding)
      
      // Draw cursor if the editor has focus
      if (hasFocus) {
        let cursorX = padding
        
        // Measure the precise width of text before the cursor
        if (cursorPos > 0) {
          const beforeCursor = canvasText.substring(0, cursorPos)
          cursorX += ctx.measureText(beforeCursor).width
        }
        
        // Draw cursor
        ctx.fillRect(cursorX, padding, 1, lineHeight)
      }
    }
    
    // Update rendering whenever state changes
    useEffect(() => {
      renderCanvas()
    }, [canvasText, cursorPos, hasFocus])
    
    // Handle keyboard input
    const handleKeyDown = (e) => {
      // Prevent default browser actions for typing
      if (!["F5", "F12"].includes(e.key) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
      }
      
      switch (e.key) {
        case "ArrowLeft":
          setCursorPos(Math.max(0, cursorPos - 1))
          break
          
        case "ArrowRight":
          setCursorPos(Math.min(canvasText.length, cursorPos + 1))
          break
          
        case "Home":
          setCursorPos(0)
          break
          
        case "End":
          setCursorPos(canvasText.length)
          break
          
        case "Backspace":
          if (cursorPos > 0) {
            // Remove character before cursor
            const newText = canvasText.slice(0, cursorPos - 1) + canvasText.slice(cursorPos)
            setCanvasText(newText)
            setCursorPos(cursorPos - 1)
            setText(newText) // Update parent state
          }
          break
          
        case "Delete":
          if (cursorPos < canvasText.length) {
            // Remove character after cursor
            const newText = canvasText.slice(0, cursorPos) + canvasText.slice(cursorPos + 1)
            setCanvasText(newText)
            setText(newText) // Update parent state
          }
          break
          
        default:
          // Handle regular character input (single characters only)
          if (e.key.length === 1) {
            // Insert character at cursor position
            const newText = canvasText.slice(0, cursorPos) + e.key + canvasText.slice(cursorPos)
            setCanvasText(newText)
            setCursorPos(cursorPos + 1)
            setText(newText) // Update parent state
            
            // Debug output to console to verify text order
            console.log("Current text:", newText)
          }
          break
      }
    }
    
    // Handle mouse clicks for cursor positioning
    const handleClick = (e) => {
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      
      // Get click position relative to canvas
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      
      // Find closest character position
      let closestPos = 0
      const padding = 10
      
      // Configure text settings for measurement
      ctx.font = `16px sans-serif`
      
      // Measure text width for each possible cursor position
      let minDistance = Number.MAX_VALUE
      
      for (let i = 0; i <= canvasText.length; i++) {
        const textWidth = ctx.measureText(canvasText.substring(0, i)).width
        const charX = padding + textWidth
        const distance = Math.abs(clickX - charX)
        
        if (distance < minDistance) {
          minDistance = distance
          closestPos = i
        }
      }
      
      setCursorPos(closestPos)
    }
    
    // Handle paste events
    const handlePaste = (e) => {
      e.preventDefault()
      
      // Get pasted text
      const pasteText = e.clipboardData.getData("text/plain")
      if (!pasteText) return
      
      // Insert at cursor position
      const newText = canvasText.slice(0, cursorPos) + pasteText + canvasText.slice(cursorPos)
      setCanvasText(newText)
      setCursorPos(cursorPos + pasteText.length)
      setText(newText) // Update parent state
    }
    
    return (
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="w-full h-[300px] border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        onPaste={handlePaste}
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
          <h1 className="text-2xl font-bold mb-4">Fixed Canvas Text Editor</h1>
          <p className="mb-4 text-gray-700">
            This editor renders text left-to-right and correctly positions the cursor.
            Type normally and the text should appear just like a regular text editor.
          </p>
          
          <div className="my-8">
            <h2 className="text-lg font-semibold mb-2">Try typing here:</h2>
            <CanvasEditor />
          </div>
          
          <div className="mt-8 p-4 bg-slate-50 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Current Text Content:</h2>
            <div className="whitespace-pre-wrap p-3 bg-white border rounded-md min-h-12">
              {text || "(empty)"}
            </div>
          </div>
          
          <div className="mt-8 border-t pt-4">
            <h3 className="text-md font-medium mb-2">Tips:</h3>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              <li>Use arrow keys to move the cursor</li>
              <li>Click to position the cursor</li>
              <li>Type normally - text should appear left-to-right</li>
              <li>Use Home/End to jump to start/end of text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 