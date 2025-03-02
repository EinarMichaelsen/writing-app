"use client"

import { useEffect, useRef, useState } from "react"

export function SimpleCanvasEditor({ initialText = "", onChange }) {
  const canvasRef = useRef(null)
  const [text, setText] = useState(initialText)
  const [cursorPosition, setCursorPosition] = useState(initialText.length)
  const [isFocused, setIsFocused] = useState(false)
  
  // Font settings
  const fontSize = 16
  const fontFamily = "sans-serif"
  const font = `${fontSize}px ${fontFamily}`
  const lineHeight = fontSize * 1.5
  
  // Setup canvas when component mounts
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Set canvas dimensions
    const updateCanvasDimensions = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Force redraw
      renderText()
    }
    
    updateCanvasDimensions()
    window.addEventListener("resize", updateCanvasDimensions)
    
    return () => {
      window.removeEventListener("resize", updateCanvasDimensions)
    }
  }, [])
  
  // Render text and cursor
  const renderText = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Text settings
    ctx.font = font
    ctx.textBaseline = "top"
    ctx.fillStyle = "black"
    ctx.textAlign = "left"
    ctx.direction = "ltr"
    
    // Render text
    const padding = 10
    ctx.fillText(text, padding, padding)
    
    // Draw cursor if focused
    if (isFocused) {
      // Get width of text up to cursor
      let cursorX = padding
      
      if (cursorPosition > 0) {
        const textBeforeCursor = text.substring(0, cursorPosition)
        cursorX += ctx.measureText(textBeforeCursor).width
      }
      
      // Draw cursor line
      ctx.fillRect(cursorX, padding, 1, lineHeight)
    }
  }
  
  // Update rendering when state changes
  useEffect(() => {
    renderText()
  }, [text, cursorPosition, isFocused])
  
  // Handle keyboard input
  const handleKeyDown = (e) => {
    // Prevent default except for special keys
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
  
  // Handle click for cursor positioning
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Calculate click position
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    
    // Find closest character position
    const padding = 10
    let closestPos = 0
    let minDistance = Number.MAX_VALUE
    
    // Check each position to find closest to click
    ctx.font = font
    for (let i = 0; i <= text.length; i++) {
      const textBeforeCursor = text.substring(0, i)
      const charX = padding + ctx.measureText(textBeforeCursor).width
      const distance = Math.abs(x - charX)
      
      if (distance < minDistance) {
        minDistance = distance
        closestPos = i
      }
    }
    
    setCursorPosition(closestPos)
  }
  
  return (
    <canvas
      ref={canvasRef}
      className="outline-none border border-gray-300 rounded-md"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleCanvasClick}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{ width: "100%", height: "300px" }}
    />
  )
} 