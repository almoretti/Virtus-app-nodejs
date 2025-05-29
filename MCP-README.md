# Virtus Booking MCP Server

This is a Model Context Protocol (MCP) server for the Virtus booking system, enabling LLMs to interact with your water filtration technician booking system through natural language.

## 🌟 Features

- **Real-time availability checking** across multiple technicians and time slots
- **Booking management** (create, modify, cancel appointments)
- **Server-Sent Events (SSE)** for real-time updates
- **Multi-language support** (Italian interface)
- **Comprehensive booking workflow** from availability to confirmation
- **Integration with existing APIs** (no need to rebuild your current system)

## 🛠️ Technical Architecture

### MCP Tools Available

1. **`check_availability`** - Check technician availability for specific dates
   - Parameters: `date` (YYYY-MM-DD), optional `technicianId`
   - Returns: Formatted availability matrix showing free/busy slots

2. **`create_booking`** - Create new appointment bookings
   - Parameters: `date`, `slot`, `technicianId`, `customer`, `installationType`, optional `notes`
   - Returns: Confirmation with booking details

3. **`modify_booking`** - Modify existing bookings
   - Parameters: `bookingId`, optional `date`, `slot`, `technicianId`, `notes`
   - Returns: Updated booking information

4. **`cancel_booking`** - Cancel appointments
   - Parameters: `bookingId`, optional `reason`
   - Returns: Cancellation confirmation

5. **`get_bookings`** - Retrieve booking information
   - Parameters: optional filters (`date`, `from`/`to`, `status`, `technicianId`)
   - Returns: List of matching bookings

### MCP Resources Available

1. **`technicians://list`** - Live list of active technicians
2. **`installation-types://list`** - Available installation types

### MCP Prompts Available

1. **`booking_assistant`** - Guided booking assistance workflow
   - Parameters: optional `customerInfo`, `preferredDate`
   - Returns: Structured prompt for booking assistance

## 🚀 Quick Start

### Option 1: Standalone MCP Server (Recommended for LLM Integration)

```bash
# Run the MCP server directly
node src/mcp/server-runner.ts

# Or test it first
node src/mcp/test-client.ts
```

### Option 2: HTTP + SSE Integration

The MCP server is also available via HTTP with Server-Sent Events:

```bash
# Start your Next.js development server
npm run dev

# The MCP server will be available at:
# - POST http://localhost:3000/api/mcp
# - GET http://localhost:3000/api/mcp?sessionId=your-session-id (SSE)
# - GET http://localhost:3000/api/mcp/status (Health check)
```

## 🔧 Configuration

### Claude Desktop Integration

Add to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "virtus-booking": {
      "command": "node",
      "args": ["./src/mcp/server-runner.ts"],
      "cwd": "/path/to/your/virtus-booking",
      "env": {
        "DATABASE_URL": "file:./prisma/dev.db"
      }
    }
  }
}
```

### Environment Variables

```bash
DATABASE_URL=file:./prisma/dev.db          # Database connection
VIRTUS_API_KEY=your-api-key               # Optional API authentication
```

## 📡 Real-time Features

The MCP server supports real-time updates through Server-Sent Events:

### Client Connection (JavaScript Example)

```javascript
// Establish SSE connection
const sessionId = crypto.randomUUID();
const eventSource = new EventSource(`/api/mcp?sessionId=${sessionId}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'booking-notification':
      console.log(`Booking ${data.event}:`, data.booking);
      break;
    case 'availability-update':
      console.log(`Availability changed for ${data.date}`);
      break;
  }
};

// Send MCP messages
async function sendMCPMessage(message) {
  const response = await fetch(`/api/mcp?sessionId=${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  
  return response.json();
}
```

## 🔍 API Examples

### Check Availability

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_availability",
    "arguments": {
      "date": "2025-01-15"
    }
  }
}
```

### Create Booking

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_booking",
    "arguments": {
      "date": "2025-01-15",
      "slot": "MORNING",
      "technicianId": "tech-123",
      "customer": {
        "name": "Mario Rossi",
        "phone": "+39 123 456 7890",
        "email": "mario@example.com",
        "address": "Via Roma 123, Milano"
      },
      "installationType": "Filtro sotto lavello",
      "notes": "Cliente preferisce mattina presto"
    }
  }
}
```

## 📅 Time Slots

The system uses three daily time slots:

- **MORNING**: 10:00-12:00
- **AFTERNOON**: 13:00-15:00  
- **EVENING**: 16:00-18:00

## 🌍 Language Support

- **Interface Language**: Italian
- **Date Format**: Italian convention (d MMMM yyyy)
- **Time Format**: 24-hour format
- All user-facing messages and responses are in Italian

## 🔒 Security

The MCP server **requires authentication** using the same bearer tokens as your REST APIs:

### Authentication Setup

1. **Generate an API Token**: 
   ```bash
   # Use your existing token management UI or API
   # Tokens should have appropriate scopes (read/write)
   ```

2. **Include Bearer Token in Requests**:
   ```javascript
   // For SSE connection
   const eventSource = new EventSource('/api/mcp?sessionId=my-session', {
     headers: {
       'Authorization': 'Bearer YOUR_API_TOKEN'
     }
   });
   
   // For MCP messages
   fetch('/api/mcp?sessionId=my-session', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer YOUR_API_TOKEN',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify(mcpMessage)
   });
   ```

3. **Required Scopes**:
   - `read`: For check_availability, get_bookings, and resource access
   - `write`: For create_booking, modify_booking, cancel_booking

### Security Features

- **Token Validation**: All requests require valid bearer tokens
- **Scope-based Permissions**: Operations check for appropriate read/write scopes
- **User Context**: Bookings are created with the authenticated user as creator
- **Input Validation**: Zod schemas validate all inputs
- **SQL Injection Protection**: Prisma ORM prevents SQL injection
- **CORS Configuration**: Controlled cross-origin access

## 📊 Monitoring

Check server health and status:

```bash
curl http://localhost:3000/api/mcp/status
```

Response includes:
- Database connectivity
- Active technicians count
- Recent booking statistics
- Available tools and resources

## 🧪 Testing

Run the test suite to verify MCP server functionality:

```bash
node src/mcp/test-client.ts
```

This will test:
- Tool and resource listing
- Availability checking
- Booking retrieval
- Prompt functionality

## 🔧 Integration with LLMs

### Claude (Anthropic)

1. Add server configuration to Claude Desktop
2. Claude will automatically discover available tools
3. Use natural language: "Check availability for tomorrow" or "Book an appointment for Mario Rossi"

### OpenAI GPT

1. Use the HTTP API endpoints
2. Implement MCP client using the OpenAI SDK
3. Pass tool definitions to function calling

### Other LLMs

The MCP server follows the standard Model Context Protocol specification and should work with any MCP-compatible LLM client.

## 🛟 Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure `DATABASE_URL` is correct and database is migrated
2. **Tool not found**: Check that the tool name matches exactly (case-sensitive)
3. **Authentication errors**: Verify API token if authentication is enabled
4. **SSE connection drops**: Check network connectivity and implement reconnection logic

### Debug Mode

Enable detailed logging by setting environment variables:

```bash
DEBUG=mcp:* node src/mcp/server-runner.ts
```

## 📈 Performance

- **Concurrent connections**: Supports multiple SSE sessions
- **Database queries**: Optimized with Prisma indexes
- **Memory usage**: Session cleanup every 5 minutes
- **Response time**: Typically <100ms for availability checks

## 🚀 Deployment

### Production Considerations

1. **Database**: Switch from SQLite to PostgreSQL for production
2. **Authentication**: Implement proper API token management
3. **Monitoring**: Add logging and error tracking
4. **Scaling**: Use Redis for session storage in multi-instance deployments
5. **SSL**: Ensure HTTPS for SSE connections

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 License

This MCP server is part of the Virtus booking system and follows the same licensing terms.

## 🤝 Contributing

1. Test your changes with the test client
2. Ensure Italian language consistency
3. Add appropriate error handling
4. Update documentation for new features

---

For more information about the Model Context Protocol, visit: https://modelcontextprotocol.io/