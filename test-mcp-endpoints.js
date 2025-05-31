// Quick test script for MCP server endpoints
const MCP_URL = 'https://fortunate-manifestation-production.up.railway.app';
const API_TOKEN = 'YOUR_API_TOKEN_HERE'; // Replace with your actual token

async function testEndpoints() {
  console.log('Testing MCP Server Endpoints...\n');

  // 1. Test health check
  console.log('1. Testing /health endpoint:');
  try {
    const healthRes = await fetch(`${MCP_URL}/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // 2. Test info endpoint
  console.log('\n2. Testing /mcp/info endpoint:');
  try {
    const infoRes = await fetch(`${MCP_URL}/mcp/info`);
    const infoData = await infoRes.json();
    console.log('✅ MCP info:', infoData);
  } catch (error) {
    console.log('❌ MCP info failed:', error.message);
  }

  // 3. Test SSE endpoint with auth
  console.log('\n3. Testing /mcp/sse endpoint (with auth):');
  try {
    const sseRes = await fetch(`${MCP_URL}/mcp/sse`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'text/event-stream'
      }
    });
    
    if (sseRes.ok) {
      console.log('✅ SSE endpoint responded with status:', sseRes.status);
      console.log('   Headers:', Object.fromEntries(sseRes.headers.entries()));
      
      // For SSE, we'd normally set up an EventSource, but for testing just check the response
      const text = await sseRes.text();
      console.log('   First 200 chars:', text.substring(0, 200));
    } else {
      console.log('❌ SSE endpoint failed with status:', sseRes.status);
      const error = await sseRes.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('❌ SSE endpoint error:', error.message);
  }

  // 4. Test POST to SSE endpoint (JSON-RPC)
  console.log('\n4. Testing POST /mcp/sse endpoint (JSON-RPC):');
  try {
    const rpcRes = await fetch(`${MCP_URL}/mcp/sse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });
    
    if (rpcRes.ok) {
      const rpcData = await rpcRes.json();
      console.log('✅ JSON-RPC response:', JSON.stringify(rpcData, null, 2));
    } else {
      console.log('❌ JSON-RPC failed with status:', rpcRes.status);
      const error = await rpcRes.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('❌ JSON-RPC error:', error.message);
  }
}

// Run tests
testEndpoints().then(() => {
  console.log('\nTests completed!');
}).catch(error => {
  console.error('Test script error:', error);
});