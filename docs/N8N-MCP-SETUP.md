# n8n MCP Client Setup Guide

## Overview

This guide explains how to connect n8n to the Virtus Booking MCP server using the standard MCP SSE transport.

## MCP Server Endpoint

The MCP server is available at:
```
https://virtus-app-nodejs-production.up.railway.app/api/mcp/sse
```

## Authentication

You need a valid API token with `read` and `write` scopes from the Virtus Booking system.

## n8n Configuration

### 1. Install MCP Client Node

Make sure you have the MCP Client node available in your n8n instance:
- It's part of the `@n8n/n8n-nodes-langchain` package
- The node is called "MCP Client Tool"

### 2. Create MCP Client Credentials

In n8n:
1. Go to **Credentials**
2. Create new **MCP Client** credential
3. Configure:
   ```
   Name: Virtus Booking MCP
   Transport: SSE (Server-Sent Events)
   Base URL: https://virtus-app-nodejs-production.up.railway.app/api/mcp/sse
   Headers:
     Authorization: Bearer YOUR_API_TOKEN_HERE
   ```

### 3. Use in Workflow

1. Add **MCP Client Tool** node to your workflow
2. Select the "Virtus Booking MCP" credential
3. The node will automatically discover available tools:
   - `check_availability`
   - `create_booking`
   - `modify_booking`
   - `cancel_booking`
   - `get_bookings`

### 4. Example Usage

#### Check Availability
```json
{
  "tool": "check_availability",
  "arguments": {
    "date": "2025-06-15"
  }
}
```

#### Create Booking
```json
{
  "tool": "create_booking",
  "arguments": {
    "date": "2025-06-20",
    "slot": "MORNING",
    "technicianId": "tech-id-here",
    "customer": {
      "name": "Mario Rossi",
      "phone": "+39 123 456 789",
      "email": "mario@example.com",
      "address": "Via Roma 123, Milano"
    },
    "installationType": "Filtro sotto lavello",
    "notes": "Piano 2"
  }
}
```

## Testing the Connection

### Manual Test with cURL

1. Test SSE connection:
```bash
curl -N https://virtus-app-nodejs-production.up.railway.app/api/mcp/sse?sessionId=test-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: text/event-stream"
```

You should see:
```
data: {"type":"connection-established","sessionId":"test-123","timestamp":"..."}
```

2. Send a message:
```bash
curl -X POST https://virtus-app-nodejs-production.up.railway.app/api/mcp/sse?sessionId=test-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

## Troubleshooting

### Connection Refused
- Verify your API token is valid
- Check the token has both `read` and `write` scopes
- Ensure the Bearer prefix is included: `Bearer vb_your_token`

### Session Not Found
- Make sure to use the same sessionId for SSE connection and POST requests
- The session expires after 15 minutes of inactivity

### Tool Not Found
- Use the exact tool names: `check_availability`, `create_booking`, etc.
- Check the tool arguments match the expected schema

### CORS Issues
- The server includes CORS headers for all origins
- If still having issues, check your n8n instance configuration

## Integration with AI Agents

The MCP Client Tool works perfectly with n8n's AI Agent nodes:

1. Add an **AI Agent** node (e.g., OpenAI Agent)
2. Connect the **MCP Client Tool** as a tool for the agent
3. The agent can then use natural language to interact with the booking system

Example agent prompt:
```
You are a booking assistant for Virtus water filtration services.
Use the MCP tools to:
- Check technician availability
- Create bookings for customers
- Modify or cancel existing bookings
Always speak in Italian when responding to users.
```

## Support

For issues specific to:
- **MCP Server**: Check the server logs in Railway
- **n8n Integration**: Check n8n execution logs
- **Authentication**: Verify token in the Virtus Booking system