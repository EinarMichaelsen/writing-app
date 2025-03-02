"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Upload, X } from "lucide-react"

// Mock data for sources
const mockSources = [
  {
    id: "s1",
    name: "Research Paper.pdf",
    type: "pdf",
    tags: ["#research", "#paper"],
    content: "This is a sample research paper with important findings...",
  },
  {
    id: "s2",
    name: "Interview Transcript.txt",
    type: "text",
    tags: ["#interview", "#primary"],
    content: "Transcript of interview with industry expert John Doe...",
  },
  {
    id: "s3",
    name: "Statistical Data.txt",
    type: "text",
    tags: ["#data", "#statistics"],
    content: "Statistical analysis of market trends over the past decade...",
  },
]

interface SourcesPanelProps {
  documentId: string
  onInsertReference: (reference: string) => void
}

export function SourcesPanel({ documentId, onInsertReference }: SourcesPanelProps) {
  const [sources, setSources] = useState(mockSources)
  const [activeTab, setActiveTab] = useState("view")
  const [newSourceName, setNewSourceName] = useState("")
  const [newSourceTags, setNewSourceTags] = useState("")

  const handleAddSource = () => {
    if (!newSourceName) return

    const newSource = {
      id: `s${sources.length + 1}`,
      name: newSourceName,
      type: "text",
      tags: newSourceTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
      content: "New source content...",
    }

    setSources([...sources, newSource])
    setNewSourceName("")
    setNewSourceTags("")
    setActiveTab("view")
  }

  const handleRemoveSource = (sourceId: string) => {
    setSources(sources.filter((source) => source.id !== sourceId))
  }

  const handleInsertReference = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId)
    if (source) {
      const reference = ` [Reference: ${source.name} ${source.tags.join(" ")}] `
      onInsertReference(reference)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="p-4 border-b">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">View Sources</TabsTrigger>
            <TabsTrigger value="add">Add Source</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="view" className="flex-1 p-0 m-0">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-4 space-y-4">
              {sources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No sources added yet</p>
                </div>
              ) : (
                sources.map((source) => (
                  <div key={source.id} className="p-3 rounded-md border">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{source.name}</h4>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleInsertReference(source.id)}
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleRemoveSource(source.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {source.tags.map((tag, index) => (
                        <span key={index} className="text-xs bg-muted px-1.5 py-0.5 rounded-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs mt-2 line-clamp-2 text-muted-foreground">{source.content}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="add" className="flex-1 p-0 m-0">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-name">Source Name</Label>
              <Input
                id="source-name"
                placeholder="e.g., Research Paper.pdf"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-tags">Tags (comma separated)</Label>
              <Input
                id="source-tags"
                placeholder="e.g., #research, #paper"
                value={newSourceTags}
                onChange={(e) => setNewSourceTags(e.target.value)}
              />
            </div>
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={handleAddSource}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Source
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Supported file types: .txt, .pdf, .docx</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

