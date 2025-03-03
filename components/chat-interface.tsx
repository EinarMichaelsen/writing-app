"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowUp } from "lucide-react"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  documentContent: string
  onInsertText: (text: string) => void
}

export function ChatInterface({ documentContent, onInsertText }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI writing assistant. How can I help you with your document today?"
    }
  ])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput("")
    
    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    
    // Add empty assistant message that will be filled with the streamed response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])
    
    setIsStreaming(true)

    try {
      // Create context from current document content
      const context = documentContent
        ? `The current document content is: "${documentContent.substring(0, 1000)}${documentContent.length > 1000 ? "..." : ""}"`
        : "The document is currently empty."

      // Stream response using fetch
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and append to message
        const text = new TextDecoder().decode(value);
        
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content += text;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error streaming response:", error)
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage.role === "assistant") {
          lastMessage.content += " Sorry, there was an error generating a response."
        }
        return newMessages
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInsertText = (text: string) => {
    onInsertText(text)
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === "assistant" ? "items-start" : "items-start"}`}>
              <Avatar className="w-8 h-8 mt-1">
                {message.role === "assistant" ? (
                  <>
                    <AvatarFallback>AI</AvatarFallback>
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  </>
                ) : (
                  <>
                    <AvatarFallback>U</AvatarFallback>
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  </>
                )}
              </Avatar>
              <div className="flex flex-col gap-1 w-full">
                <div className="text-sm font-medium">{message.role === "assistant" ? "Assistant" : "You"}</div>
                <div className="text-sm">{message.content}</div>
                {message.role === "assistant" && message.content && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => handleInsertText(message.content)}>
                      Insert into document
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isStreaming && <div className="text-sm text-muted-foreground animate-pulse">Assistant is typing...</div>}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="relative">
          <Textarea
            placeholder="Ask for suggestions or help with your writing..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none pr-12"
          />
          <Button
            size="icon"
            className="absolute bottom-3 right-3"
            onClick={handleSendMessage}
            disabled={!input.trim() || isStreaming}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

