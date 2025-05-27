import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface ApiEndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  path: string
  description?: string
  children?: React.ReactNode
}

export function ApiEndpoint({ method, path, description, children }: ApiEndpointProps) {
  const methodColors = {
    GET: "bg-blue-500",
    POST: "bg-green-500",
    PUT: "bg-yellow-500",
    DELETE: "bg-red-500",
    PATCH: "bg-purple-500"
  }

  return (
    <div className="my-6 rounded-lg border">
      <div className="flex items-center gap-3 border-b bg-muted/50 p-4">
        <Badge className={cn("text-white", methodColors[method])}>
          {method}
        </Badge>
        <code className="text-sm font-mono">{path}</code>
      </div>
      {description && (
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}
      {children && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}

interface ApiParamProps {
  name: string
  type: string
  required?: boolean
  description?: string
}

export function ApiParam({ name, type, required = false, description }: ApiParamProps) {
  return (
    <div className="flex items-start gap-4 py-2">
      <div className="flex items-center gap-2 min-w-[200px]">
        <code className="text-sm font-mono">{name}</code>
        {required && <Badge variant="outline" className="text-xs">Richiesto</Badge>}
      </div>
      <div className="flex-1">
        <Badge variant="secondary" className="text-xs mb-1">{type}</Badge>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  )
}