"use client"

import { useRef, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Scrivi un messaggio..." 
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const message = textareaRef.current?.value.trim()
    if (message && !disabled) {
      onSendMessage(message)
      if (textareaRef.current) {
        textareaRef.current.value = ""
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <div className="flex items-end gap-2 p-4 border-t">
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className={cn(
          "flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2",
          "text-sm placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[40px] max-h-[120px]"
        )}
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={disabled}
        size="icon"
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}