"use client"

import { useState } from "react"
import { TiptapEditor } from "@/app/components/tiptap-editor"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function TiptapEditorPage() {
  const [content, setContent] = useState("")
  const [plainText, setPlainText] = useState("")
  const router = useRouter()

  const handleEditorChange = (html: string, text: string) => {
    setContent(html)
    setPlainText(text)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tiptap Editor</h1>
        <Button
          onClick={() => router.push("/editor/new")}
        >
          Back to Editor
        </Button>
      </div>

      <div className="mb-6">
        <TiptapEditor 
          onChange={handleEditorChange} 
          placeholder="Type something here..."
          autofocus
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-md bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">HTML Output</h2>
          <pre className="whitespace-pre-wrap text-sm bg-white p-2 rounded border">
            {content || "<empty>"}
          </pre>
        </div>
        
        <div className="p-4 border rounded-md bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Plain Text Output</h2>
          <pre className="whitespace-pre-wrap text-sm bg-white p-2 rounded border">
            {plainText || "<empty>"}
          </pre>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Features</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Rich text editing with correct text direction</li>
          <li>Proper cursor positioning</li>
          <li>Keyboard shortcuts support</li>
          <li>Formatting capabilities (via StarterKit)</li>
          <li>Placeholder text</li>
        </ul>
      </div>
    </div>
  )
} 