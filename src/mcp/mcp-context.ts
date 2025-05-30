/**
 * MCP Context Management
 * 
 * This module manages the authentication context for MCP operations,
 * allowing the MCP server to know which user is making requests.
 */

export interface MCPContext {
  userId: string;
  userEmail: string;
  userRole: string;
  scopes: string[];
  createdAt: Date;
  lastActivity: Date;
}

// Store context per session
const sessionContexts = new Map<string, MCPContext>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Cleanup old sessions periodically
const cleanupInterval = setInterval(() => {
  const now = new Date();
  const timeout = SESSION_TIMEOUT_MS;
  
  for (const [sessionId, context] of sessionContexts.entries()) {
    if (now.getTime() - context.lastActivity.getTime() > timeout) {
      sessionContexts.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Run cleanup every 5 minutes

// Clear interval when module is unloaded
if (typeof process !== 'undefined') {
  process.on('exit', () => clearInterval(cleanupInterval));
}

export function setSessionContext(sessionId: string, context: Omit<MCPContext, 'createdAt' | 'lastActivity'>): void {
  const now = new Date();
  sessionContexts.set(sessionId, {
    ...context,
    createdAt: now,
    lastActivity: now
  });
}

export function getSessionContext(sessionId: string): MCPContext | undefined {
  const context = sessionContexts.get(sessionId);
  if (context) {
    // Update last activity on access
    context.lastActivity = new Date();
  }
  return context;
}

export function removeSessionContext(sessionId: string): void {
  sessionContexts.delete(sessionId);
}

export function getAllSessions(): Map<string, MCPContext> {
  return new Map(sessionContexts);
}