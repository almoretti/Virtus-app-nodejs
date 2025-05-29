#!/usr/bin/env node

/**
 * Standalone MCP Server Runner for Virtus Booking System
 * 
 * This script runs the MCP server in standalone mode for direct LLM integration.
 * It can be used by LLM clients like Claude Desktop, OpenAI, etc.
 * 
 * Usage:
 * - Direct execution: node server-runner.ts
 * - With Claude Desktop: Add to claude_desktop_config.json
 * - With API key: VIRTUS_API_KEY=your-key node server-runner.ts
 */

import { server } from './booking-server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

async function main() {
  console.error('Starting Virtus Booking MCP Server...');
  
  try {
    // Create stdio transport for direct LLM communication
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    console.error('✅ Virtus Booking MCP Server is ready!');
    console.error('📋 Available tools:');
    console.error('  - check_availability: Check technician availability for dates');
    console.error('  - create_booking: Create new appointment bookings');
    console.error('  - modify_booking: Modify existing bookings');
    console.error('  - cancel_booking: Cancel appointments');
    console.error('  - get_bookings: Retrieve booking information');
    console.error('');
    console.error('📚 Available resources:');
    console.error('  - technicians://list: List of active technicians');
    console.error('  - installation-types://list: Available installation types');
    console.error('');
    console.error('💡 Available prompts:');
    console.error('  - booking_assistant: Guided booking assistance');
    console.error('');
    console.error('🌐 System: Water filtration technician booking management');
    console.error('🇮🇹 Language: Italian interface (all responses in Italian)');
    console.error('');
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n🛑 Shutting down Virtus Booking MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n🛑 Shutting down Virtus Booking MCP Server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});