"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function TextDirectionFixPage() {
  const [text, setText] = useState("")
  const [cursorPosition, setCursorPosition] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)

  // Focus editor on mount
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [])

  // Handle key input to build text in the correct order
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Special keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "ArrowRight") {
        // Cmd+Right arrow - move cursor to end
        e.preventDefault()
        setCursorPosition(text.length)
        return
      } else if (e.key === "ArrowLeft") {
        // Cmd+Left arrow - move cursor to start
        e.preventDefault()
        setCursorPosition(0)
        return
      } else if (e.key === "a") {
        // Cmd+A - select all (not implemented, but prevent default)
        e.preventDefault()
        return
      }
      return // Let other Cmd shortcuts pass through
    }

    if (e.key === "Backspace") {
      // Handle backspace
      if (cursorPosition > 0) {
        e.preventDefault()
        setText(text.slice(0, cursorPosition - 1) + text.slice(cursorPosition))
        setCursorPosition(cursorPosition - 1)
      }
    } else if (e.key === "Delete") {
      // Handle delete
      if (cursorPosition < text.length) {
        e.preventDefault()
        setText(text.slice(0, cursorPosition) + text.slice(cursorPosition + 1))
      }
    } else if (e.key === "ArrowLeft") {
      // Move cursor left
      e.preventDefault()
      if (cursorPosition > 0) {
        setCursorPosition(cursorPosition - 1)
      }
    } else if (e.key === "ArrowRight") {
      // Move cursor right
      e.preventDefault()
      if (cursorPosition < text.length) {
        setCursorPosition(cursorPosition + 1)
      }
    } else if (e.key === "Home") {
      // Move cursor to start
      e.preventDefault()
      setCursorPosition(0)
    } else if (e.key === "End") {
      // Move cursor to end
      e.preventDefault()
      setCursorPosition(text.length)
    } else if (e.key.length === 1) {
      // Add character at cursor position
      e.preventDefault()
      setText(text.slice(0, cursorPosition) + e.key + text.slice(cursorPosition))
      setCursorPosition(cursorPosition + 1)
    }
  }

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData("text")
    if (pastedText) {
      const newText = text.slice(0, cursorPosition) + pastedText + text.slice(cursorPosition)
      setText(newText)
      setCursorPosition(cursorPosition + pastedText.length)
    }
  }

  // Render text with cursor at correct position
  const renderText = () => {
    const beforeCursor = text.slice(0, cursorPosition)
    const afterCursor = text.slice(cursorPosition)

    return (
      <div className="relative min-h-[24px]">
        <div dir="ltr" lang="en" className="whitespace-pre-wrap break-words">
          <span>{beforeCursor}</span>
          <span className="border-r-2 border-black animate-blink h-6 inline-block">&nbsp;</span>
          <span>{afterCursor}</span>
        </div>
        {text.length === 0 && editorRef.current && !editorRef.current.contains(document.activeElement) && (
          <div className="absolute top-0 left-0 text-gray-400 pointer-events-none">
            Type something...
          </div>
        )}
      </div>
    )
  }

  // Handle click for cursor positioning
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const editorRect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - editorRect.left
    
    // If clicked at very beginning, set cursor to 0
    if (clickX < 10) {
      setCursorPosition(0)
      return
    }
    
    // Calculate cursor position based on click position
    const textElement = e.currentTarget.querySelector("div > span:first-child")
    if (!textElement) {
      setCursorPosition(0)
      return
    }
    
    // Calculate the best position based on character widths
    let bestPosition = 0
    let bestDistance = Number.MAX_VALUE
    
    for (let i = 0; i <= text.length; i++) {
      // Create a temporary span to measure text width
      const testSpan = document.createElement('span')
      testSpan.style.visibility = 'hidden'
      testSpan.style.position = 'absolute'
      testSpan.style.whiteSpace = 'pre'
      testSpan.style.font = window.getComputedStyle(textElement).font
      testSpan.textContent = text.slice(0, i)
      
      document.body.appendChild(testSpan)
      const width = testSpan.getBoundingClientRect().width
      document.body.removeChild(testSpan)
      
      const distance = Math.abs(width - clickX)
      if (distance < bestDistance) {
        bestDistance = distance
        bestPosition = i
      }
    }
    
    setCursorPosition(bestPosition)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Text Direction Fix</h1>
        <Button
          onClick={() => {
            const router = useRouter()
            router.push("/editor/new")
          }}
        >
          Back to Editor
        </Button>
      </div>

      <div 
        ref={editorRef}
        className="editor-container w-full min-h-[200px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        contentEditable={false} // We're handling our own editing
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onPaste={handlePaste}
        tabIndex={0}
      >
        {renderText()}
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
        <p>Current Text: "{text}"</p>
        <p>Cursor Position: {cursorPosition}</p>
        <p>Text Length: {text.length}</p>
        <div className="mt-2">
          <p className="font-medium">Instructions:</p>
          <ul className="list-disc list-inside">
            <li>Type to add text</li>
            <li>Use arrow keys to move cursor</li>
            <li>Use backspace/delete to remove characters</li>
            <li>Click anywhere to position cursor</li>
            <li>Use Cmd+Left Arrow to jump to start</li>
            <li>Use Cmd+Right Arrow to jump to end</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 