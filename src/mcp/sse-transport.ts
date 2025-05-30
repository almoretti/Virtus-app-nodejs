import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse, JSONRPCError } from "@modelcontextprotocol/sdk/types.js";
import { EventEmitter } from "events";

interface SSESession {
  id: string;
  response: Response;
  controller: ReadableStreamDefaultController;
  lastActivity: Date;
  subscriptions: Set<string>;
}

export class SSEServerTransport extends EventEmitter implements Transport {
  private sessions = new Map<string, SSESession>();
  private messageHandlers = new Map<string, (message: JSONRPCMessage) => Promise<void>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    
    // Clean up inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupInactiveSessions() {
    const now = new Date();
    const maxAge = 15 * 60 * 1000; // 15 minutes

    for (const [sessionId, session] of this.sessions) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.closeSession(sessionId);
      }
    }
  }

  private closeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.controller.close();
      } catch (error) {
        // console.error(`Error closing session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
      this.emit("session-closed", sessionId);
    }
  }

  // Create a new SSE connection
  createSSEConnection(sessionId: string): Response {
    if (this.sessions.has(sessionId)) {
      this.closeSession(sessionId);
    }

    const stream = new ReadableStream({
      start: (controller) => {
        const session: SSESession = {
          id: sessionId,
          response: new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Credentials': 'true',
            },
          }),
          controller,
          lastActivity: new Date(),
          subscriptions: new Set()
        };

        this.sessions.set(sessionId, session);

        // Send initial connection message
        this.sendToSession(sessionId, {
          type: 'connection-established',
          sessionId,
          timestamp: new Date().toISOString()
        });

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          if (this.sessions.has(sessionId)) {
            this.sendToSession(sessionId, { type: 'ping' });
          } else {
            clearInterval(keepAlive);
          }
        }, 30000);

        this.emit("session-created", sessionId);
      },
      cancel: () => {
        this.closeSession(sessionId);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  // Handle incoming messages (from POST requests)
  async handleMessage(sessionId: string, message: JSONRPCMessage): Promise<JSONRPCResponse | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.lastActivity = new Date();

    try {
      if ('method' in message) {
        // This is a request
        const request = message as JSONRPCRequest;
        
        // Handle special MCP methods
        switch (request.method) {
          case 'subscribe':
            return this.handleSubscribe(sessionId, request);
          case 'unsubscribe':
            return this.handleUnsubscribe(sessionId, request);
          default:
            // Forward to message handlers
            const handler = this.messageHandlers.get(request.method);
            if (handler) {
              await handler(message);
              return {
                jsonrpc: "2.0",
                id: request.id,
                result: { success: true }
              };
            } else {
              return {
                jsonrpc: "2.0",
                id: request.id,
                error: {
                  code: -32601,
                  message: `Method not found: ${request.method}`
                }
              };
            }
        }
      } else {
        // This is a response or notification
        this.emit("message", message);
        return null;
      }
    } catch (error) {
      if ('id' in message) {
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error'
          }
        };
      }
      throw error;
    }
  }

  private handleSubscribe(sessionId: string, request: JSONRPCRequest): JSONRPCResponse {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32603, message: "Session not found" }
      };
    }

    const { resource } = request.params as { resource: string };
    session.subscriptions.add(resource);

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { subscribed: resource }
    };
  }

  private handleUnsubscribe(sessionId: string, request: JSONRPCRequest): JSONRPCResponse {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32603, message: "Session not found" }
      };
    }

    const { resource } = request.params as { resource: string };
    session.subscriptions.delete(resource);

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { unsubscribed: resource }
    };
  }

  // Send message to specific session
  sendToSession(sessionId: string, data: any): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      session.controller.enqueue(new TextEncoder().encode(message));
      session.lastActivity = new Date();
      return true;
    } catch (error) {
      // console.error(`Error sending to session ${sessionId}:`, error);
      this.closeSession(sessionId);
      return false;
    }
  }

  // Broadcast to all sessions
  broadcast(data: any): void {
    for (const sessionId of this.sessions.keys()) {
      this.sendToSession(sessionId, data);
    }
  }

  // Broadcast to sessions subscribed to a specific resource
  broadcastToSubscribers(resource: string, data: any): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.subscriptions.has(resource)) {
        this.sendToSession(sessionId, data);
      }
    }
  }

  // Send notification about booking changes
  notifyBookingChange(type: 'created' | 'updated' | 'cancelled', booking: any): void {
    const notification = {
      type: 'booking-notification',
      event: type,
      booking,
      timestamp: new Date().toISOString()
    };

    this.broadcast(notification);
  }

  // Send availability updates
  notifyAvailabilityChange(date: string, technicianId?: string): void {
    const notification = {
      type: 'availability-update',
      date,
      technicianId,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers('availability', notification);
  }

  // Register message handler
  onMessage(method: string, handler: (message: JSONRPCMessage) => Promise<void>): void {
    this.messageHandlers.set(method, handler);
  }

  // Get active sessions count
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  // Get session info
  getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);
    return session ? {
      id: session.id,
      lastActivity: session.lastActivity,
      subscriptions: Array.from(session.subscriptions)
    } : null;
  }

  // Close all sessions and cleanup
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    this.sessions.clear();
    this.messageHandlers.clear();
  }

  // Transport interface methods
  async start(): Promise<void> {
    // SSE transport is ready immediately
    this.emit("ready");
  }

  async send(message: JSONRPCMessage): Promise<void> {
    // For SSE, we broadcast messages to all sessions
    this.broadcast({
      type: 'mcp-message',
      message,
      timestamp: new Date().toISOString()
    });
  }

  async close_connection(): Promise<void> {
    this.close();
  }
}

export default SSEServerTransport;