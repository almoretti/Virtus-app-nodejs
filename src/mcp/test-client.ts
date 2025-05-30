#!/usr/bin/env node

/**
 * Test Client for Virtus Booking MCP Server
 * 
 * This script tests the MCP server functionality by sending sample requests
 * and verifying responses.
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testMCPServer() {
  // console.log('🧪 Testing Virtus Booking MCP Server...\n');
  
  try {
    // Create client and transport
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', './src/mcp/server-runner.ts']
    });
    
    const client = new Client({
      name: "virtus-booking-test-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });
    
    await client.connect(transport);
    // console.log('✅ Connected to MCP server\n');
    
    // Test 1: List available tools
    // console.log('📋 Testing tool listing...');
    const tools = await client.listTools();
    // console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      // console.log(`  - ${tool.name}: ${tool.description}`);
    });
    // console.log('');
    
    // Test 2: List available resources
    // console.log('📚 Testing resource listing...');
    const resources = await client.listResources();
    // console.log(`Found ${resources.resources.length} resources:`);
    resources.resources.forEach(resource => {
      // console.log(`  - ${resource.uri}`);
    });
    // console.log('');
    
    // Test 3: Read technicians resource
    // console.log('👷 Testing technicians resource...');
    try {
      const techniciansResult = await client.readResource({ uri: 'technicians://list' });
      const technicians = JSON.parse(techniciansResult.contents[0].text);
      // console.log(`Found ${technicians.length} active technicians:`);
      technicians.forEach((tech: any) => {
        // console.log(`  - ${tech.name} (${tech.email}) - Color: ${tech.color}`);
      });
    } catch (error) {
      // console.log(`❌ Error reading technicians: ${error instanceof Error ? error.message : error}`);
    }
    // console.log('');
    
    // Test 4: Check availability for today
    // console.log('📅 Testing availability check...');
    const today = new Date().toISOString().split('T')[0];
    try {
      const availabilityResult = await client.callTool({
        name: 'check_availability',
        arguments: { date: today }
      });
      
      // console.log('Availability result:');
      // console.log(availabilityResult.content[0].text);
    } catch (error) {
      // console.log(`❌ Error checking availability: ${error instanceof Error ? error.message : error}`);
    }
    // console.log('');
    
    // Test 5: Get recent bookings
    // console.log('📋 Testing booking retrieval...');
    try {
      const bookingsResult = await client.callTool({
        name: 'get_bookings',
        arguments: { 
          from: today,
          to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Next 7 days
        }
      });
      
      // console.log('Recent bookings:');
      // console.log(bookingsResult.content[0].text);
    } catch (error) {
      // console.log(`❌ Error getting bookings: ${error instanceof Error ? error.message : error}`);
    }
    // console.log('');
    
    // Test 6: Test prompt
    // console.log('💡 Testing booking assistant prompt...');
    try {
      const prompts = await client.listPrompts();
      // console.log(`Found ${prompts.prompts.length} prompts:`);
      prompts.prompts.forEach(prompt => {
        // console.log(`  - ${prompt.name}: ${prompt.description || 'No description'}`);
      });
      
      if (prompts.prompts.length > 0) {
        const promptResult = await client.getPrompt({
          name: 'booking_assistant',
          arguments: {
            customerInfo: 'Mario Rossi, tel: 123456789',
            preferredDate: today
          }
        });
        
        // console.log('Prompt result:');
        // console.log(promptResult.messages[0].content.text);
      }
    } catch (error) {
      // console.log(`❌ Error testing prompt: ${error instanceof Error ? error.message : error}`);
    }
    // console.log('');
    
    // console.log('✅ All tests completed!\n');
    
    // Close connection
    await client.close();
    
  } catch (error) {
    // console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testMCPServer()
  .then(() => {
    // console.log('🎉 MCP Server test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    // console.error('💥 Test suite failed:', error);
    process.exit(1);
  });