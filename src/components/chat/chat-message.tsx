import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Bot } from "lucide-react"

export interface ChatMessageProps {
  message: {
    id: string
    content: string
    role: "user" | "assistant"
    timestamp?: Date
  }
  currentUser?: {
    name?: string
    email?: string
    image?: string
  }
}

export function ChatMessage({ message, currentUser }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex gap-3 text-sm",
        isUser && "justify-end"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-blue-100 text-blue-600">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[70%]",
          isUser && "items-end"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-3 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children, className, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match && !props.node?.properties?.className
                    return isInline ? (
                      <code className="px-1 py-0.5 rounded bg-muted text-sm">{children}</code>
                    ) : (
                      <code className="block p-2 rounded bg-muted text-sm overflow-x-auto">{children}</code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {message.timestamp && (
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={currentUser?.image} alt={currentUser?.name || "User"} />
          <AvatarFallback>
            {currentUser?.name?.charAt(0).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}