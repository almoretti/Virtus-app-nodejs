"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Generate a unique session ID for this chat session
  const sessionId = useMemo(() => {
    const userPart = currentUser?.email?.replace(/[^a-zA-Z0-9]/g, '-') || 'anonymous'
    const timePart = Date.now()
    return `chat-${userPart}-${timePart}`
  }, [currentUser?.email])

  const scrollToBottom = () => {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  useEffect(() => {
    // Scroll to bottom when new messages are added or loading state changes
    scrollToBottom()
  }, [messages, isLoading])

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
      // Send message directly to n8n webhook using GET (as configured in n8n)
      const baseUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.moretti.cc/webhook/f2d9fc80-ccdb-4bf6-ac48-27ada5830139'
      
      // Create simple query parameters for GET request
      const params = new URLSearchParams({
        message: content,
        sessionId: sessionId,
        userId: currentUser?.email || 'anonymous',
        userName: currentUser?.name || 'Utente',
        timestamp: new Date().toISOString()
      })
      
      const webhookUrl = `${baseUrl}?${params.toString()}`
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error('Errore nella risposta del webhook')
      }
      
      const data = await response.json()
      
      // Extract the assistant's response from n8n webhook response
      // The response structure depends on your n8n workflow setup
      let responseContent = ""
      
      // Handle different possible response formats from n8n
      if (typeof data === 'string') {
        responseContent = data
      } else if (Array.isArray(data) && data.length > 0 && data[0].output) {
        // n8n returns array with output field
        responseContent = data[0].output
      } else if (data.output) {
        responseContent = data.output
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
      
    } catch (error: any) {
      console.error('Error calling n8n webhook:', error)
      
      // Extract specific error message if available
      let errorContent = "Mi dispiace, sto avendo difficoltà tecniche. Per favore riprova tra qualche istante o contatta il supporto."
      
      if (error?.error) {
        errorContent = error.error
        if (error.details) {
          errorContent += `\n\n${error.details}`
        }
      }
      
      // Fallback response on error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
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
        <div className="space-y-4">
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
          <div ref={messagesEndRef} />
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