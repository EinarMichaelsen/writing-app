"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GitCompare, RotateCcw } from "lucide-react"

// Mock data for version history
const mockVersions = [
  {
    id: "v1",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    content:
      "This is the first draft of my document. I'm exploring the concept of artificial intelligence and its impact on society.",
    label: "First draft",
  },
  {
    id: "v2",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    content:
      "This is the second draft of my document. I'm exploring the concept of artificial intelligence and its impact on modern society, focusing on ethical considerations and future implications.",
    label: "Added ethical considerations",
  },
  {
    id: "v3",
    timestamp: new Date().toISOString(),
    content:
      "This is the third draft of my document. I'm exploring the concept of artificial intelligence and its impact on modern society, focusing on ethical considerations, future implications, and potential regulatory frameworks needed to ensure responsible development.",
    label: "Added regulatory frameworks",
  },
]

interface VersionHistoryProps {
  documentId: string
  onSelectVersion: (content: string) => void
}

export function VersionHistory({ documentId, onSelectVersion }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareVersion, setCompareVersion] = useState<string | null>(null)

  const handleSelectVersion = (versionId: string) => {
    if (compareMode) {
      setCompareVersion(versionId)
    } else {
      setSelectedVersion(versionId)
      const version = mockVersions.find((v) => v.id === versionId)
      if (version) {
        onSelectVersion(version.content)
      }
    }
  }

  const toggleCompareMode = () => {
    setCompareMode(!compareMode)
    setCompareVersion(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Version History</h3>
          <Button variant={compareMode ? "default" : "outline"} size="sm" onClick={toggleCompareMode}>
            <GitCompare className="w-4 h-4 mr-2" />
            {compareMode ? "Exit Compare" : "Compare"}
          </Button>
        </div>
        {compareMode && compareVersion && (
          <div className="mt-2 text-xs text-muted-foreground">
            Comparing with: {mockVersions.find((v) => v.id === compareVersion)?.label}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {mockVersions.map((version) => (
            <div
              key={version.id}
              className={`p-3 rounded-md border cursor-pointer transition-colors ${
                selectedVersion === version.id || compareVersion === version.id
                  ? "bg-muted border-primary"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => handleSelectVersion(version.id)}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{version.label}</h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectVersion(version.content)
                  }}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(version.timestamp)}</p>
              <p className="text-xs mt-2 line-clamp-2">{version.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

