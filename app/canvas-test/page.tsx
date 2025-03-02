"use client"

import { useState } from "react"
import { SimpleCanvasEditor } from "../components/simple-canvas-editor"

export default function CanvasTestPage() {
  const [text, setText] = useState("")

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Canvas Text Editor Test</h1>
      <p className="mb-4">Test the canvas-based text editor below:</p>
      
      <div className="mb-4">
        <SimpleCanvasEditor
          initialText={text}
          onChange={(newText) => setText(newText)}
        />
      </div>
      
      <div className="mt-4 p-4 bg-muted rounded-md">
        <h2 className="text-lg font-semibold mb-2">Current Text Content:</h2>
        <p className="whitespace-pre-wrap">{text || "(empty)"}</p>
      </div>
    </div>
  )
} 