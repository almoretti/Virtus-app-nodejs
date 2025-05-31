"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/api-client"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatProps {
  currentUser?: {
    name?: string
    email?: string
    image?: string
  }
}

export function Chat({ currentUser }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Ciao! Sono il tuo assistente virtuale per le prenotazioni. Posso aiutarti a:\n\n• Prenotare un nuovo appuntamento\n• Verificare la disponibilità dei tecnici\n• Modificare o cancellare appuntamenti esistenti\n• Rispondere a domande sul servizio\n\nCome posso aiutarti oggi?",
      role: "assistant",
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // Generate a unique session ID for this chat session
  const sessionId = useMemo(() => {
    const userPart = currentUser?.email?.replace(/[^a-zA-Z0-9]/g, '-') || 'anonymous'
    const timePart = Date.now()
    return `chat-${userPart}-${timePart}`
  }, [currentUser?.email])

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Send message to our proxy endpoint which forwards to n8n
      const data = await api.post('/api/chat/webhook', {
        message: content,
        sessionId: sessionId,
        userId: currentUser?.email || 'anonymous',
        userName: currentUser?.name || 'Utente',
        conversationHistory: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        timestamp: new Date().toISOString(),
        context: {
          platform: 'Virtus Booking System',
          language: 'Italian',
          capabilities: ['check_availability', 'create_booking', 'modify_booking', 'cancel_booking', 'get_bookings']
        }
      })
      
      // Extract the assistant's response from n8n webhook response
      // The response structure depends on your n8n workflow setup
      let responseContent = ""
      
      // Handle different possible response formats from n8n
      if (typeof data === 'string') {
        responseContent = data
      } else if (data.message) {
        responseContent = data.message
      } else if (data.response) {
        responseContent = data.response
      } else if (data.text) {
        responseContent = data.text
      } else if (data.content) {
        responseContent = data.content
      } else {
        // Fallback if response format is unexpected
        responseContent = "Mi dispiace, ho avuto un problema tecnico. Potresti ripetere la tua richiesta?"
        console.error('Unexpected n8n response format:', data)
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: "assistant",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      console.error('Error calling n8n webhook:', error)
      
      // Fallback response on error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Mi dispiace, sto avendo difficoltà tecniche. Per favore riprova tra qualche istante o contatta il supporto.",
        role: "assistant",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[400px] max-h-[800px] w-full max-w-4xl mx-auto">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Assistente Prenotazioni AI</h2>
        <p className="text-sm text-muted-foreground">
          Prenota, modifica o cancella appuntamenti con l'aiuto dell'intelligenza artificiale
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div ref={scrollAreaRef} className="space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              currentUser={currentUser}
            />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              L'assistente sta pensando...
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder="Scrivi un messaggio..."
      />
    </Card>
  )
}