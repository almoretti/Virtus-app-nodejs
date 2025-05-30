#!/usr/bin/env node

/**
 * Test Authentication for MCP Server
 * 
 * This script tests that the MCP server properly requires and validates authentication.
 */

async function testMCPAuthentication() {
  // console.log('🔐 Testing MCP Server Authentication...\n');
  
  const baseUrl = 'http://localhost:3000/api/mcp';
  
  // Test 1: Attempt without authentication
  // console.log('1️⃣ Testing request without authentication...');
  try {
    const response = await fetch(`${baseUrl}/status`);
    // console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      // console.log('   ✅ Correctly rejected unauthenticated request\n');
    } else {
      // console.log('   ❌ Expected 401, got ' + response.status + '\n');
    }
  } catch (error) {
    // console.log(`   ❌ Error: ${error}\n`);
  }
  
  // Test 2: Attempt SSE without authentication
  // console.log('2️⃣ Testing SSE connection without authentication...');
  try {
    const sessionId = crypto.randomUUID();
    const response = await fetch(`${baseUrl}?sessionId=${sessionId}`);
    // console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      // console.log('   ✅ Correctly rejected unauthenticated SSE request');
      const error = await response.json();
      // console.log(`   Error: ${error.error}\n`);
    } else {
      // console.log('   ❌ Expected 401, got ' + response.status + '\n');
    }
  } catch (error) {
    // console.log(`   ❌ Error: ${error}\n`);
  }
  
  // Test 3: Test with invalid token
  // console.log('3️⃣ Testing with invalid bearer token...');
  try {
    const response = await fetch(`${baseUrl}/status`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345'
      }
    });
    // console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      // console.log('   ✅ Correctly rejected invalid token');
      const error = await response.json();
      // console.log(`   Error: ${error.error}\n`);
    } else {
      // console.log('   ❌ Expected 401, got ' + response.status + '\n');
    }
  } catch (error) {
    // console.log(`   ❌ Error: ${error}\n`);
  }
  
  // Test 4: Test MCP message without authentication
  // console.log('4️⃣ Testing MCP message without authentication...');
  try {
    const message = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "check_availability",
        arguments: {
          date: new Date().toISOString().split('T')[0]
        }
      }
    };
    
    const response = await fetch(`${baseUrl}?sessionId=test-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
    
    // console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      // console.log('   ✅ Correctly rejected unauthenticated MCP message');
      const error = await response.json();
      // console.log(`   Error: ${error.error}\n`);
    } else {
      // console.log('   ❌ Expected 401, got ' + response.status + '\n');
    }
  } catch (error) {
    // console.log(`   ❌ Error: ${error}\n`);
  }
  
  // console.log('\n📋 Summary:');
  // console.log('- MCP server requires authentication for all endpoints');
  // console.log('- Use Bearer token in Authorization header');
  // console.log('- Same tokens as REST API work with MCP');
  // console.log('- Appropriate scopes (read/write) are enforced');
  
  // console.log('\n💡 To use the MCP server:');
  // console.log('1. Generate an API token through the admin interface');
  // console.log('2. Include it in all requests: Authorization: Bearer YOUR_TOKEN');
  // console.log('3. Ensure token has appropriate scopes for operations');
}

// Run tests
testMCPAuthentication()
  .then(() => {
    // console.log('\n✅ Authentication test completed!');
  })
  .catch((error) => {
    // console.error('\n❌ Test failed:', error);
    process.exit(1);
  });