// Test dynamic import of MCP SDK classes
async function testDynamicImport() {
  try {
    console.log('Testing dynamic import of MCP SDK...');
    
    const [
      { Server: McpServer },
      { SSEServerTransport }
    ] = await Promise.all([
      import('@modelcontextprotocol/sdk/server/index.js'),
      import('@modelcontextprotocol/sdk/server/sse.js')
    ]);
    
    console.log('✅ Dynamic imports successful');
    console.log('McpServer:', typeof McpServer);
    console.log('SSEServerTransport:', typeof SSEServerTransport);
    
    // Try to create an instance
    const server = new McpServer(
      {
        name: "Test Server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
    
    console.log('✅ MCP Server instance created successfully');
    console.log('Server name:', server.name);
    
  } catch (error) {
    console.error('❌ Dynamic import failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testDynamicImport();