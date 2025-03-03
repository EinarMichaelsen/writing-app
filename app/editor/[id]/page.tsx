"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ChevronRight, Clock, Edit3, Hash, MessageSquare, Save, Settings, ChevronLeft, AlertCircle } from "lucide-react"
import { EditorContent } from "@/components/editor-content"
import { ChatInterface } from "@/components/chat-interface"
import { SourcesPanel } from "@/components/sources-panel"
import { VersionHistory } from "@/components/version-history"
import { generateSuggestion, isDeepSeekConfigured } from "@/lib/deepseek-config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function EditorPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState("Untitled Document")
  const [content, setContent] = useState("")
  const [isEditing, setIsEditing] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeTab, setActiveTab] = useState("chat")
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestion, setSuggestion] = useState("")
  const [apiConfigured, setApiConfigured] = useState(true) // Assume true initially
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [suggestionsDisabled, setSuggestionsDisabled] = useState(false)
  const [lastSuggestionTime, setLastSuggestionTime] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Check if DeepSeek API is configured
  useEffect(() => {
    async function checkApiConfig() {
      try {
        const isConfigured = await isDeepSeekConfigured();
        setApiConfigured(isConfigured);
        if (isConfigured) {
          setErrorMessage(null);
        } else {
          setErrorMessage("DeepSeek API not configured. Add your API key to .env.local");
        }
      } catch (error) {
        console.error("Error checking API configuration:", error);
        // Don't show error to user since suggestions can still work with fallbacks
      }
    }
    
    checkApiConfig();
    
    // Recheck API configuration every 60 seconds
    const interval = setInterval(checkApiConfig, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
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
    // Don't generate if suggestions are disabled or too many errors
    if (suggestionsDisabled) return;
    
    // Only generate suggestions after a short delay since the last keystroke
    let debounceTimeout: NodeJS.Timeout;
    
    if (content && isEditing) {
      // Adaptive debounce time - longer when experiencing errors
      const debounceTime = consecutiveErrors > 0 ? 1500 : 800;
      
      // Only generate if it's been at least 2 seconds since the last attempt
      const now = Date.now();
      const timeSinceLastSuggestion = now - lastSuggestionTime;
      
      if (timeSinceLastSuggestion > 2000) {
        debounceTimeout = setTimeout(() => {
          generateNextSuggestion(content);
          setLastSuggestionTime(Date.now());
        }, debounceTime);
      }
    }
    
    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [content, isEditing, suggestionsDisabled, consecutiveErrors, lastSuggestionTime]);

  const generateNextSuggestion = async (currentContent: string) => {
    if (!currentContent || isGenerating || suggestionsDisabled) return;

    setIsGenerating(true);
    try {
      // Use our server-side API endpoint for suggestion generation
      const suggestion = await generateSuggestion(currentContent, {
        maxTokens: 10, // Reduced from 15 to 10
        temperature: 0.4,
        maxRetries: 1,  // Reduced from 2 to 1
        timeout: 8000,  // Reduced from 12000 to 8000
      });
      
      // Only set the suggestion if it's not empty and not just whitespace
      if (suggestion && suggestion.trim()) {
        setSuggestion(suggestion);
        
        // Reset consecutive errors on success
        if (consecutiveErrors > 0) {
          setConsecutiveErrors(0);
          setErrorMessage(null);
        }
      } else {
        // Empty suggestions should not show
        setSuggestion("");
      }
    } catch (error: any) {
      console.error("Error generating suggestion:", error);
      setSuggestion("");
      
      // Increment consecutive errors, but cap at 5
      setConsecutiveErrors(prev => Math.min(prev + 1, 5));
      
      // Handle different error types
      if (error.message?.includes('timed out') || error.message?.includes('504')) {
        // For timeout errors, retry silently up to 3 times
        if (consecutiveErrors >= 3) {
          // After 3 timeouts, show an error and back off
          setErrorMessage("Suggestions are timing out. We'll try again shortly.");
          
          // Temporarily disable suggestions
          setSuggestionsDisabled(true);
          setTimeout(() => {
            setSuggestionsDisabled(false);
            setConsecutiveErrors(0);
            setErrorMessage(null);
          }, 15000); // 15 second backoff
        }
      } else if (error.message?.includes('Authentication')) {
        setErrorMessage("DeepSeek API authentication error. Check your API key.");
        
        // For auth errors, disable suggestions for a longer period
        setSuggestionsDisabled(true);
        setTimeout(() => {
          setSuggestionsDisabled(false);
        }, 30000); // 30 second backoff for auth errors
      } else {
        // For other errors, show a message after multiple failures
        if (consecutiveErrors >= 2) {
          setErrorMessage("Having trouble generating suggestions. Will try again shortly.");
          
          // Exponential backoff based on consecutive errors (2s, 4s, 8s, 16s, etc.)
          const backoffTime = Math.min(2000 * Math.pow(2, consecutiveErrors - 1), 30000);
          
          setSuggestionsDisabled(true);
          setTimeout(() => {
            setSuggestionsDisabled(false);
          }, backoffTime);
        }
      }
    } finally {
      // Always reset generating state
      setIsGenerating(false);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header with navigation and document title */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          {isEditing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium h-9 max-w-md focus-visible:ring-0"
            />
          ) : (
            <h1 className="text-lg font-medium">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "View" : "Edit"}
          </Button>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </header>

      {/* Main content area with editor and sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto">
            <div ref={editorRef} className="relative">
              {/* Editor content */}
              <EditorContent
                content={content}
                suggestion={suggestion}
                onChange={handleContentChange}
              />
              
              {/* API configuration warning */}
              {!apiConfigured && isEditing && (
                <div className="my-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                  <p className="font-medium">DeepSeek API not configured</p>
                  <p>The text completion API is not properly configured. Add your DeepSeek API key to the .env.local file to enable suggestions.</p>
                </div>
              )}
              
              {/* Error message */}
              {errorMessage && isEditing && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Suggestion Service Issue</AlertTitle>
                  <AlertDescription>
                    {errorMessage}
                    {consecutiveErrors >= 3 && " Suggestions paused temporarily."}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="w-full justify-start px-3 pt-3 border-b rounded-none">
                <TabsTrigger value="chat" className="flex items-center gap-1 data-[state=active]:bg-background">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </TabsTrigger>
                <TabsTrigger value="sources" className="flex items-center gap-1 data-[state=active]:bg-background">
                  <Hash className="h-4 w-4" />
                  <span>Sources</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1 data-[state=active]:bg-background">
                  <Clock className="h-4 w-4" />
                  <span>History</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-1 data-[state=active]:bg-background">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 p-0 h-full overflow-auto">
                <ChatInterface 
                  documentContent={content} 
                  onInsertText={(text) => setContent(content + text)} 
                />
              </TabsContent>
              
              <TabsContent value="sources" className="flex-1 p-0 h-full overflow-auto">
                <SourcesPanel 
                  documentId={params.id}
                  onInsertReference={(reference) => setContent(content + reference)}
                />
              </TabsContent>
              
              <TabsContent value="history" className="flex-1 p-0 h-full overflow-auto">
                <VersionHistory 
                  documentId={params.id}
                  onSelectVersion={(versionContent) => setContent(versionContent)}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="h-full overflow-auto">
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-4">Editor Settings</h3>
                  {/* Add settings here */}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Sidebar toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
          onClick={toggleSidebar}
        >
          {showSidebar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

