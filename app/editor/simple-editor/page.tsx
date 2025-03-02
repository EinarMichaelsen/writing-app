"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SimpleEditorPage() {
  const [text, setText] = useState("")
  const router = useRouter()
  const editorRef = useRef(null)

  // Handle editor content changes
  const handleInput = () => {
    if (editorRef.current) {
      const newText = editorRef.current.textContent || ""
      setText(newText)
    }
  }

  // Focus editor when component mounts
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-medium">Simple Text Editor</h1>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Type here:</h2>
            <div 
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              className="min-h-[150px] p-3 border border-gray-200 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{
                direction: "ltr", // Explicitly set left-to-right direction
                textAlign: "left",
                unicodeBidi: "embed" // Additional hint for bidirectional text
              }}
            ></div>
          </div>
          
          <div className="mt-8 p-4 bg-slate-50 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Current Text Content:</h2>
            <div className="whitespace-pre-wrap p-3 bg-white border rounded-md min-h-12">
              {text || "(empty)"}
            </div>
          </div>
          
          <div className="mt-8 border-t pt-4">
            <h3 className="text-md font-medium mb-2">Notes:</h3>
            <p className="text-sm text-gray-600 mb-2">
              This editor uses a normal HTML contenteditable div which should render text correctly from left-to-right.
            </p>
            <p className="text-sm text-gray-600">
              If you're still seeing text issues, this might be related to your browser's text direction settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 