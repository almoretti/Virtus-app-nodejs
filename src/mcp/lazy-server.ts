/**
 * Lazy initialization wrapper for MCP server
 * Prevents server initialization during build time
 */

let serverInstance: any = null;

export function getServer() {
  if (!serverInstance) {
    // Only initialize server when actually needed (runtime)
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
      const { server } = require('./booking-server');
      serverInstance = server;
    }
  }
  return serverInstance;
}

export const server = new Proxy({}, {
  get(target, prop) {
    const actualServer = getServer();
    if (actualServer && prop in actualServer) {
      return actualServer[prop];
    }
    // Return a no-op function during build
    if (prop === 'connect' || prop === 'tool' || prop === 'prompt') {
      return () => {};
    }
    return undefined;
  }
});