"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowUp } from "lucide-react"
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

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
      content: "Hi! I'm your writing assistant. How can I help you with your document today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages]) //Corrected dependency

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage = input.trim()
    setInput("")

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])

    // Add empty assistant message that will be filled with the stream
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    setIsStreaming(true)

    try {
      // Create context from current document content
      const context = documentContent
        ? `The current document content is: "${documentContent.substring(0, 1000)}${documentContent.length > 1000 ? "..." : ""}"`
        : "The document is currently empty."

      // Stream the response
      const result = streamText({
        model: openai("gpt-4o"),
        system: `You are an AI writing assistant helping a user with their document. 
                Be concise, helpful, and focus on improving the user's writing. 
                Provide specific suggestions when asked.
                ${context}`,
        prompt: userMessage,
        onChunk: ({ chunk }) => {
          if (chunk.type === "text-delta") {
            setMessages((prev) => {
              const newMessages = [...prev]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage.role === "assistant") {
                lastMessage.content += chunk.text
              }
              return newMessages
            })
          }
        },
      })

      await result.text
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

