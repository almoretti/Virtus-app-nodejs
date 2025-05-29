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
}

// Store context per session
const sessionContexts = new Map<string, MCPContext>();

export function setSessionContext(sessionId: string, context: MCPContext): void {
  sessionContexts.set(sessionId, context);
}

export function getSessionContext(sessionId: string): MCPContext | undefined {
  return sessionContexts.get(sessionId);
}

export function removeSessionContext(sessionId: string): void {
  sessionContexts.delete(sessionId);
}

export function getAllSessions(): Map<string, MCPContext> {
  return new Map(sessionContexts);
}