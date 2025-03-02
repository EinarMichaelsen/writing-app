"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface CanvasEditorProps {
  initialText?: string
  onChange?: (text: string) => void
  className?: string
}

export function CanvasEditor({ initialText = "", onChange, className }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [text, setText] = useState(initialText)
  const [cursorPosition, setCursorPosition] = useState(initialText.length)
  const [isFocused, setIsFocused] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(0)
  const [canvasHeight, setCanvasHeight] = useState(0)
  
  // Font settings
  const fontSize = 16
  const fontFamily = "sans-serif"
  const font = `${fontSize}px ${fontFamily}`
  const lineHeight = fontSize * 1.5
  
  // Set up the canvas and handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      // Set canvas dimensions accounting for devicePixelRatio
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      
      // Scale canvas context to match devicePixelRatio
      ctx.scale(dpr, dpr)
      
      // Set display size to match the element
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      
      setCanvasWidth(rect.width)
      setCanvasHeight(rect.height)
      
      // Update the rendering
      renderText()
    }
    
    // Initial setup
    resizeCanvas()
    
    // Listen for window resize
    window.addEventListener("resize", resizeCanvas)
    
    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])
  
  // Render the text and cursor
  const renderText = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio)
    
    // Set text properties
    ctx.font = font
    ctx.textBaseline = "top"
    ctx.fillStyle = "black"
    ctx.textAlign = "left"
    ctx.direction = "ltr"
    
    // Render text
    const padding = 10
    ctx.fillText(text, padding, padding)
    
    // Draw cursor if editor is focused
    if (isFocused) {
      // Calculate cursor position
      let cursorX = padding
      
      if (cursorPosition > 0) {
        // Measure text width up to cursor position
        const textBeforeCursor = text.substring(0, cursorPosition)
        cursorX += ctx.measureText(textBeforeCursor).width
      }
      
      // Draw cursor line
      ctx.fillStyle = "#000"
      ctx.fillRect(cursorX, padding, 1, lineHeight)
    }
  }
  
  // Re-render when text or cursor position changes
  useEffect(() => {
    renderText()
  }, [text, cursorPosition, isFocused, canvasWidth, canvasHeight])
  
  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    // Prevent default browser behavior for most keys
    if (e.key !== "F5" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
    }
    
    if (e.key === "ArrowLeft") {
      // Move cursor left
      setCursorPosition(Math.max(0, cursorPosition - 1))
    } else if (e.key === "ArrowRight") {
      // Move cursor right
      setCursorPosition(Math.min(text.length, cursorPosition + 1))
    } else if (e.key === "Home") {
      // Move cursor to start
      setCursorPosition(0)
    } else if (e.key === "End") {
      // Move cursor to end
      setCursorPosition(text.length)
    } else if (e.key === "Backspace") {
      // Handle backspace
      if (cursorPosition > 0) {
        const newText = text.slice(0, cursorPosition - 1) + text.slice(cursorPosition)
        setText(newText)
        setCursorPosition(cursorPosition - 1)
        onChange?.(newText)
      }
    } else if (e.key === "Delete") {
      // Handle delete
      if (cursorPosition < text.length) {
        const newText = text.slice(0, cursorPosition) + text.slice(cursorPosition + 1)
        setText(newText)
        onChange?.(newText)
      }
    } else if (e.key.length === 1) {
      // Handle character input
      const newText = text.slice(0, cursorPosition) + e.key + text.slice(cursorPosition)
      setText(newText)
      setCursorPosition(cursorPosition + 1)
      onChange?.(newText)
    }
  }
  
  // Handle mouse click for cursor positioning
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Get the click position relative to the canvas
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Set text properties for measurement
    ctx.font = font
    
    // Find the closest character position
    const padding = 10
    let closestPos = 0
    let minDistance = Number.MAX_VALUE
    
    for (let i = 0; i <= text.length; i++) {
      const textWidth = ctx.measureText(text.substring(0, i)).width
      const charX = padding + textWidth
      const distance = Math.abs(x - charX)
      
      if (distance < minDistance) {
        minDistance = distance
        closestPos = i
      }
    }
    
    setCursorPosition(closestPos)
  }
  
  // Prevent losing focus when clicking inside the canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent canvas from taking focus away
    canvasRef.current?.focus()
    setIsFocused(true)
  }
  
  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const pasteText = e.clipboardData.getData("text/plain")
    if (!pasteText) return
    
    const newText = text.slice(0, cursorPosition) + pasteText + text.slice(cursorPosition)
    setText(newText)
    setCursorPosition(cursorPosition + pasteText.length)
    onChange?.(newText)
  }
  
  return (
    <canvas
      ref={canvasRef}
      className={cn("outline-none border border-input rounded-md", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPaste={handlePaste}
      style={{ width: "100%", height: "300px" }}
    />
  )
} 