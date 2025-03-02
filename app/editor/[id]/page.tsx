"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ChevronRight, Clock, Edit3, Hash, MessageSquare, Save, Settings, ChevronLeft } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { EditorContent } from "@/components/editor-content"
import { ChatInterface } from "@/components/chat-interface"
import { SourcesPanel } from "@/components/sources-panel"
import { VersionHistory } from "@/components/version-history"

export default function EditorPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState("Untitled Document")
  const [content, setContent] = useState("")
  const [isEditing, setIsEditing] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeTab, setActiveTab] = useState("chat")
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestion, setSuggestion] = useState("")
  const editorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    // Ensure we're getting the content in the correct order
    console.log('New content:', newContent) // Add this debug log
    setContent(newContent)
  }

  // Handle Tab key for accepting suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && suggestion && !e.shiftKey) {
        e.preventDefault()
        setContent(content + suggestion)
        setSuggestion("")
        generateNextSuggestion(content + suggestion)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [content, suggestion])

  // Generate next word suggestion when content changes
  useEffect(() => {
    if (content && isEditing) {
      generateNextSuggestion(content)
    }
  }, [content, isEditing])

  const generateNextSuggestion = async (currentContent: string) => {
    if (!currentContent || isGenerating) return

    setIsGenerating(true)
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Continue the following text with a natural suggestion (just a few words, not a full sentence): "${currentContent.slice(-100)}"`,
        maxTokens: 10,
      })

      setSuggestion(text)
    } catch (error) {
      console.error("Error generating suggestion:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
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
            <Edit3 className="w-5 h-5" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 font-medium border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          <div className="relative h-full">
            <EditorContent content={content} suggestion={suggestion} onChange={handleContentChange} ref={editorRef} />
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b">
                <TabsList className="w-full justify-start rounded-none border-b px-2 h-12">
                  <TabsTrigger value="chat" className="data-[state=active]:bg-muted">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="versions" className="data-[state=active]:bg-muted">
                    <Clock className="w-4 h-4 mr-2" />
                    Versions
                  </TabsTrigger>
                  <TabsTrigger value="sources" className="data-[state=active]:bg-muted">
                    <Hash className="w-4 h-4 mr-2" />
                    Sources
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chat" className="flex-1 p-0 m-0 overflow-hidden">
                <ChatInterface documentContent={content} onInsertText={(text) => setContent(content + text)} />
              </TabsContent>

              <TabsContent value="versions" className="flex-1 p-0 m-0 overflow-hidden">
                <VersionHistory
                  documentId={params.id}
                  onSelectVersion={(versionContent) => setContent(versionContent)}
                />
              </TabsContent>

              <TabsContent value="sources" className="flex-1 p-0 m-0 overflow-hidden">
                <SourcesPanel
                  documentId={params.id}
                  onInsertReference={(reference) => setContent(content + reference)}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
          onClick={toggleSidebar}
        >
          {showSidebar ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}

