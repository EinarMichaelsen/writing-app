"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { generateMarkdownFromNode } from "../../lib/markdown-utils"
import { isDeepSeekConfigured } from "@/lib/deepseek-config"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type CursorPosition = {
  top: number;
  left: number;
};

export default function EditorPage({ params }: { params: { id: string } }) {
  // State
  const [content, setContent] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [consecutiveErrors, setConsecutiveErrors] = useState(0)
  const [suggestionsDisabled, setSuggestionsDisabled] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [apiConfigured, setApiConfigured] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [lastSuggestionTime, setLastSuggestionTime] = useState(0)
  const [currentSuggestion, setCurrentSuggestion] = useState("")
  const [displayedSuggestion, setDisplayedSuggestion] = useState("")
  const [suggestionVisible, setSuggestionVisible] = useState(false)
  const [userTyping, setUserTyping] = useState(false)
  const [lastContent, setLastContent] = useState("")
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  
  // Refs
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const streamTimer = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Add debug info
  const addDebugInfo = useCallback((info: string) => {
    console.log(info)
    setDebugInfo(prev => [...prev.slice(-9), info])
  }, [])

  // Initialize the editor with TipTap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // Convert editor content to markdown for better AI prompting
      const markdown = generateMarkdownFromNode(editor.state.doc)
      handleContentChange(markdown)
      
      // For debugging
      addDebugInfo(`Content converted to Markdown: ${markdown.length} chars`)
    },
    onSelectionUpdate: () => {
      // Update cursor position when selection changes
      setTimeout(() => updateCursorPosition(), 0)
    },
    onFocus: () => {
      // Update cursor position when editor gets focus
      setTimeout(() => updateCursorPosition(), 0)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    // Fix hydration issues
    immediatelyRender: false,
  })

  // Replace the updateCursorPosition function for better positioning
  useEffect(() => {
    if (!editor || !editorRef.current) return;

    const updateCursorPosition = () => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      
      if (rects.length > 0) {
        const lastRect = rects[rects.length - 1];
        
        // Get the editor container's position
        const editorRect = editorRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
        
        // Calculate position relative to the editor
        const top = lastRect.top - editorRect.top + window.scrollY;
        const left = lastRect.right - editorRect.left + window.scrollX;
        
        console.log("Cursor position updated:", { top, left });
        addDebugInfo(`Cursor position: (${Math.round(top)}, ${Math.round(left)})`);
        
        setCursorPosition({ top, left });
      }
    };

    const handleSelectionChange = () => {
      // Only update if editor is focused
      if (document.activeElement === editor.view.dom) {
        updateCursorPosition();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    editor.on('focus', updateCursorPosition);
    editor.on('blur', updateCursorPosition);
    editor.on('update', updateCursorPosition);

    // Update cursor position immediately
    updateCursorPosition();

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editor.off('focus', updateCursorPosition);
      editor.off('blur', updateCursorPosition);
      editor.off('update', updateCursorPosition);
    };
  }, [editor, addDebugInfo]);

  // Check if DeepSeek API is configured
  useEffect(() => {
    checkApiConfig()
  }, [])

  async function checkApiConfig() {
    try {
      const configured = await isDeepSeekConfigured()
      addDebugInfo(`DeepSeek API configured: ${configured}`)
      setApiConfigured(configured)
    } catch (error) {
      console.error("Error checking API configuration:", error)
      setApiConfigured(false)
    }
  }

  // Track when the user is actively typing
  const handleUserActivity = useCallback(() => {
    setUserTyping(true)
    
    // Clear any existing timer
    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
    }
    
    // Set a new timer to detect when typing stops
    typingTimer.current = setTimeout(() => {
      setUserTyping(false)
      addDebugInfo("User stopped typing")
    }, 250) // Consider user stopped typing after 250ms of inactivity (faster than before)
  }, [addDebugInfo])

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    // Update content state
    setContent(newContent)
    
    // Track user activity
    handleUserActivity()
    
    // Don't generate suggestions if they're disabled
    if (suggestionsDisabled) {
      addDebugInfo("Suggestions are disabled")
      return
    }
    
    // Don't generate suggestions if the content is too similar to the last content
    // This prevents generating suggestions for very small changes
    if (Math.abs(newContent.length - lastContent.length) < 2 && 
        newContent.slice(-30) === lastContent.slice(-30)) {
      return
    }
    
    // Update last content
    setLastContent(newContent)
    
    // Clear any existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Set a new debounce timer
    debounceTimer.current = setTimeout(() => {
      // Only generate a suggestion if the user has stopped typing
      if (!userTyping && !isGenerating) {
        // Don't generate suggestions if typing pause is too short
        const timeSinceLastInput = Date.now() - lastSuggestionTime;
        if (timeSinceLastInput < 150) { // Very short pause
          return;
        }
        
        addDebugInfo("Triggering suggestion generation")
        generateNextSuggestion(newContent)
      }
    }, 150) // Ultra-short debounce time (150ms) for faster suggestions
  }, [addDebugInfo, handleUserActivity, isGenerating, lastContent, lastSuggestionTime, suggestionsDisabled, userTyping])

  // Generate the next suggestion with improved speed and accuracy
  const generateNextSuggestion = useCallback(async (currentContent: string) => {
    // Don't generate suggestions if they're disabled
    if (suggestionsDisabled) {
      addDebugInfo("Suggestions are disabled")
      return
    }
    
    // Don't generate suggestions if we're already generating one
    if (isGenerating) {
      addDebugInfo("Already generating a suggestion")
      return
    }
    
    // Don't generate suggestions if the content is empty
    if (!currentContent.trim()) {
      addDebugInfo("Content is empty")
      return
    }
    
    // Don't generate suggestions too frequently
    const now = Date.now()
    if (now - lastSuggestionTime < 200) { // 200ms cooldown (reduced from 300ms)
      addDebugInfo("Generating too frequently")
      return
    }
    
    // Update the last suggestion time
    setLastSuggestionTime(now)
    
    // Set generating state
    setIsGenerating(true)
    addDebugInfo(`Starting suggestion generation with ${currentContent.length} characters`)
    
    try {
      // Generate a suggestion with minimal timeout (faster response)
      const response = await fetch("/api/generate-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: currentContent,
          isMarkdown: true,
          maxTokens: 15, // Increased for more complete suggestions
          temperature: 0.2, // Slightly higher temperature for more varied completions
        }),
        signal: AbortSignal.timeout(5000), // Reduced timeout for faster failure/retry
      })
      
      if (!response.ok) {
        throw new Error(`Failed to generate suggestion: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Get the suggestion and analytical data
      const suggestion = data.suggestion || ""
      const timeTaken = data.timeTaken || 0
      const analysis = data.analysis || {}
      
      addDebugInfo(`Received completion in ${timeTaken}ms: "${suggestion}"`)
      
      // Only show non-empty suggestions
      if (suggestion && suggestion.length > 1) {
        setCurrentSuggestion(suggestion)
        setDisplayedSuggestion("") // Reset displayed suggestion
        
        // Force cursor position update before showing suggestion
        setTimeout(() => {
          updateCursorPosition()
          setSuggestionVisible(true)
          addDebugInfo(`Showing suggestion: "${suggestion}"`)
        }, 5) // Reduced from 10ms
        
        setConsecutiveErrors(0)
        
        // Stream the suggestion character by character with adaptive speed
        // Faster streaming for short suggestions, slightly slower for longer ones
        let charIndex = 0
        if (streamTimer.current) {
          clearInterval(streamTimer.current)
        }
        
        // Calculate streaming speed based on suggestion length
        const streamSpeed = suggestion.length < 10 ? 5 : 8; // 5ms for short suggestions, 8ms for longer ones
        
        streamTimer.current = setInterval(() => {
          if (charIndex < suggestion.length) {
            // Exponential streaming: show more characters as we progress
            const charsToShow = Math.min(
              charIndex + 1 + Math.floor(charIndex / 5), // Add 1 more char per 5 chars already shown
              suggestion.length
            );
            setDisplayedSuggestion(suggestion.substring(0, charsToShow))
            charIndex = charsToShow
          } else {
            if (streamTimer.current) {
              clearInterval(streamTimer.current)
            }
          }
        }, streamSpeed)
      } else {
        setSuggestionVisible(false)
        addDebugInfo("Empty suggestion received")
      }
    } catch (error: any) {
      handleSuggestionError(error)
    } finally {
      // Reset generating state
      setIsGenerating(false)
    }
  }, [addDebugInfo, isGenerating, lastSuggestionTime, suggestionsDisabled, updateCursorPosition])

  // Handle suggestion errors
  const handleSuggestionError = useCallback((error: any) => {
    addDebugInfo(`Error generating suggestion: ${error.message || error}`)
    
    // Increment consecutive errors
    setConsecutiveErrors(prev => prev + 1)
    
    // Hide the suggestion
    setSuggestionVisible(false)
    
    // If we've had too many consecutive errors, disable suggestions temporarily
    if (consecutiveErrors >= 2) { // Reduced from 3 to 2
      addDebugInfo("Too many consecutive errors, disabling suggestions for 15 seconds")
      setSuggestionsDisabled(true)
      setErrorMessage("Suggestions temporarily disabled due to errors. Will try again shortly.")
      
      // Re-enable suggestions after 15 seconds
      setTimeout(() => {
        setSuggestionsDisabled(false)
        setConsecutiveErrors(0)
        setErrorMessage(null)
        addDebugInfo("Re-enabling suggestions after timeout")
      }, 15000) // Reduced from 30s to 15s
    }
  }, [addDebugInfo, consecutiveErrors])

  // Accept the current suggestion
  const acceptSuggestion = useCallback(() => {
    if (!currentSuggestion || !suggestionVisible || !editor) {
      addDebugInfo("Cannot accept suggestion: conditions not met")
      return
    }
    
    addDebugInfo(`Accepting suggestion: "${currentSuggestion}"`)
    
    // Clear any streaming timer
    if (streamTimer.current) {
      clearInterval(streamTimer.current)
      streamTimer.current = null
    }
    
    // Insert the suggestion at the current position
    // Check if we're using Markdown mode
    if (editor.storage.markdown) {
      editor.commands.insertContent(currentSuggestion)
    } else {
      editor.commands.insertContent(currentSuggestion)
    }
    
    // Clear the suggestion
    setCurrentSuggestion("")
    setDisplayedSuggestion("")
    setSuggestionVisible(false)
    
    // Focus the editor
    editor.commands.focus()
    
    // Generate a new suggestion after accepting the current one
    setTimeout(() => {
      if (editor) {
        const content = editor.storage.markdown 
          ? editor.storage.markdown.getMarkdown()
          : editor.getHTML()
        generateNextSuggestion(content)
      }
    }, 300) // Generate next suggestion more quickly after accepting
  }, [addDebugInfo, currentSuggestion, editor, generateNextSuggestion, suggestionVisible])

  // Handle key down events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Accept suggestion with Tab
    if (e.key === "Tab" && currentSuggestion && suggestionVisible) {
      e.preventDefault()
      acceptSuggestion()
    }
    
    // Reject suggestion with Escape
    if (e.key === "Escape" && suggestionVisible) {
      e.preventDefault()
      
      // Clear any streaming timer
      if (streamTimer.current) {
        clearInterval(streamTimer.current)
        streamTimer.current = null
      }
      
      setSuggestionVisible(false)
      setCurrentSuggestion("")
      setDisplayedSuggestion("")
      addDebugInfo("Suggestion rejected with Escape")
    }
    
    // Toggle debug panel with Alt+D
    if (e.key === "d" && e.altKey) {
      e.preventDefault()
      setShowDebug(prev => !prev)
    }
    
    // Track user activity
    handleUserActivity()
  }, [acceptSuggestion, addDebugInfo, currentSuggestion, handleUserActivity, suggestionVisible])

  const toggleSidebar = useCallback(() => {
    setShowSidebar(!showSidebar)
  }, [showSidebar])

  // Set up event listeners
  useEffect(() => {
    // Add key down event listener
    window.addEventListener("keydown", handleKeyDown)
    
    // Add click listener to detect editor clicks for cursor position updates
    const editorElement = editorRef.current
    if (editorElement) {
      editorElement.addEventListener("click", updateCursorPosition)
    }
    
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (editorElement) {
        editorElement.removeEventListener("click", updateCursorPosition)
      }
    }
  }, [handleKeyDown, updateCursorPosition])

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
      if (streamTimer.current) {
        clearInterval(streamTimer.current)
      }
    }
  }, [])

  // Force a suggestion generation when the editor is ready
  useEffect(() => {
    if (editor && apiConfigured && !suggestionsDisabled) {
      const timer = setTimeout(() => {
        addDebugInfo("Forcing initial suggestion generation")
        // Generate markdown from editor content
        const markdown = generateMarkdownFromNode(editor.state.doc)
        generateNextSuggestion(markdown)
      }, 1000) // Reduced from 1500ms to 1000ms
      
      return () => clearTimeout(timer)
    }
  }, [editor, apiConfigured, suggestionsDisabled, addDebugInfo, generateNextSuggestion])

  // Make sure the suggestion is properly displayed right at the cursor
  const SuggestionOverlay = () => {
    useEffect(() => {
      if (suggestionVisible && displayedSuggestion && cursorPosition) {
        console.log("RENDERING SUGGESTION:", {
          visible: suggestionVisible,
          text: displayedSuggestion,
          position: cursorPosition
        });
      }
    }, [suggestionVisible, displayedSuggestion, cursorPosition]);

    if (!suggestionVisible || !cursorPosition || !displayedSuggestion) {
      return null;
    }

    return (
      <div 
        ref={suggestionRef}
        className="absolute text-gray-500 pointer-events-none font-sans"
        style={{
          position: 'fixed',
          top: `${cursorPosition.top}px`,
          left: `${cursorPosition.left}px`,
          zIndex: 9999,
          opacity: 0.8,
          backgroundColor: 'transparent',
          whiteSpace: 'pre',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          fontFamily: 'inherit',
        }}
      >
        {displayedSuggestion}
      </div>
    );
  };

  // Add debugging for when the suggestion is displayed/hidden
  useEffect(() => {
    if (suggestionVisible) {
      console.log("Suggestion should be visible:", displayedSuggestion);
      console.log("Cursor position:", cursorPosition);
    }
  }, [suggestionVisible, displayedSuggestion, cursorPosition]);

  // Make the suggestion visible as soon as it's received
  useEffect(() => {
    if (currentSuggestion && !suggestionVisible && cursorPosition) {
      addDebugInfo(`Making suggestion visible: "${currentSuggestion.slice(0, 20)}..."`);
      setSuggestionVisible(true);
    }
  }, [currentSuggestion, suggestionVisible, cursorPosition, addDebugInfo]);

  const handleSave = useCallback(() => {
    if (editor) {
      const markdown = editor.storage.markdown ? editor.storage.markdown.getMarkdown() : editor.getHTML()
      // Handle saving the content
      console.log("Saving content:", markdown)
    }
  }, [editor])

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-semibold">
          {params.id === "new" ? "Untitled Document" : params.id}
        </h1>
        
        <div className="flex items-center space-x-2">
          {isGenerating && <span className="text-sm text-gray-500">Generating...</span>}
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto relative">
        <div ref={editorRef} className="h-full p-4">
          {editor && <EditorContent editor={editor} />}
          
          {/* Position the suggestion overlay at the fixed position */}
          {suggestionVisible && displayedSuggestion && cursorPosition && (
            <SuggestionOverlay />
          )}
          
          {/* Keyboard hint when suggestion is visible */}
          {suggestionVisible && displayedSuggestion && (
            <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-2 py-1 rounded text-xs shadow-lg">
              Press <kbd className="px-1 py-0.5 bg-gray-700 rounded border border-gray-600">Tab</kbd> to accept
            </div>
          )}
          
          {errorMessage && (
            <Alert className="m-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          {!apiConfigured && (
            <Alert className="m-4">
              <AlertTitle>API Not Configured</AlertTitle>
              <AlertDescription>DeepSeek API key is not configured. Please set the DEEPSEEK_API_KEY environment variable.</AlertDescription>
            </Alert>
          )}
          
          {showDebug && (
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-2 text-xs font-mono z-50 max-h-60 overflow-auto">
              <h3 className="font-bold">Debug Info:</h3>
              <div className="mb-1">Cursor Position: {cursorPosition ? `(${Math.round(cursorPosition.top)}, ${Math.round(cursorPosition.left)})` : "None"}</div>
              <div className="mb-1">Suggestion Visible: {suggestionVisible ? "Yes" : "No"}</div>
              <div className="mb-1">Current Suggestion: {currentSuggestion ? `"${currentSuggestion.slice(0, 30)}..."` : "None"}</div>
              <div className="mb-1">Displayed Suggestion: {displayedSuggestion ? `"${displayedSuggestion.slice(0, 30)}..."` : "None"}</div>
              <div className="mb-1">Is Generating: {isGenerating ? "Yes" : "No"}</div>
              <div className="mb-1">Editor Status: {editor ? "Loaded" : "Not Loaded"}</div>
              <h4 className="font-bold mt-2">Recent Events:</h4>
              <ul>
                {debugInfo.map((info, i) => (
                  <li key={i}>{info}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

