"use client"

import { useState, useRef, useEffect } from "react"
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
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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

    // Simulate AI response (mock for now)
    setTimeout(() => {
      let responseContent = ""
      
      // Simple keyword-based responses for demo
      const lowerContent = content.toLowerCase()
      
      if (lowerContent.includes("prenot") || lowerContent.includes("appuntamento")) {
        responseContent = "Certamente! Per prenotare un appuntamento ho bisogno di alcune informazioni:\n\n1. Qual è il tuo nome completo?\n2. Il tuo indirizzo?\n3. Quale giorno preferisci?\n4. Quale fascia oraria preferisci? (Mattina 10-12, Pomeriggio 13-15, o Sera 16-18)\n\nPuoi fornirmi queste informazioni?"
      } else if (lowerContent.includes("disponibilità") || lowerContent.includes("quando")) {
        responseContent = "Sto verificando la disponibilità dei nostri tecnici...\n\nEcco le prossime disponibilità:\n• Lunedì: Mattina e Pomeriggio\n• Martedì: Tutte le fasce orarie\n• Mercoledì: Pomeriggio e Sera\n• Giovedì: Mattina\n• Venerdì: Pomeriggio e Sera\n\nQuale giorno e fascia oraria preferisci?"
      } else if (lowerContent.includes("cancell") || lowerContent.includes("annull")) {
        responseContent = "Per cancellare un appuntamento, ho bisogno del numero di prenotazione o della data dell'appuntamento. Puoi fornirmelo?"
      } else if (lowerContent.includes("modific")) {
        responseContent = "Per modificare un appuntamento esistente, forniscimi il numero di prenotazione o la data attuale dell'appuntamento."
      } else if (lowerContent.includes("ciao") || lowerContent.includes("salve")) {
        responseContent = "Ciao! Come posso aiutarti con le prenotazioni oggi?"
      } else if (lowerContent.includes("grazie")) {
        responseContent = "Prego! Se hai bisogno di altro aiuto con le prenotazioni, sono qui per te."
      } else {
        responseContent = "Posso aiutarti con:\n• Prenotare nuovi appuntamenti\n• Verificare disponibilità\n• Modificare prenotazioni esistenti\n• Cancellare appuntamenti\n\nCosa vorresti fare?"
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: "assistant",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
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
              L'assistente sta scrivendo...
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