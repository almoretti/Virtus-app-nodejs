# MCP Server Testing Guide

## Testing with MCP Inspector

### 1. Install MCP Inspector

First, install the MCP Inspector tool:

```bash
npm install -g @modelcontextprotocol/inspector
```

### 2. Create API Token

1. Go to https://virtus-app-nodejs-production.up.railway.app/api-tokens
2. Create a new token with `read` and `write` scopes
3. Copy the token (starts with `vb_`)

### 3. Update Configuration

Edit `mcp-inspector-config.json` and replace `YOUR_API_TOKEN_HERE` with your actual token:

```json
{
  "servers": {
    "virtus-booking-http": {
      "transport": {
        "type": "http",
        "config": {
          "url": "https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1",
          "headers": {
            "Authorization": "Bearer vb_YOUR_ACTUAL_TOKEN_HERE",
            "Content-Type": "application/json"
          }
        }
      }
    }
  }
}
```

### 4. Run MCP Inspector

```bash
mcp-inspector mcp-inspector-config.json
```

### 5. Test the Connection

In MCP Inspector:
1. Select "virtus-booking-http" server
2. Click "Connect"
3. You should see the available tools listed

### 6. Test Tools

Try these test commands:

#### Check Availability
```json
{
  "name": "check_availability",
  "arguments": {
    "date": "2025-06-15"
  }
}
```

#### Get Bookings
```json
{
  "name": "get_bookings",
  "arguments": {
    "from": "2025-06-01",
    "to": "2025-06-30"
  }
}
```

## Manual Testing with cURL

### 1. Test Authentication
```bash
curl -X GET https://virtus-app-nodejs-production.up.railway.app/api/mcp/test \
  -H "Authorization: Bearer vb_YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Test Initialize
```bash
curl -X POST https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1 \
  -H "Authorization: Bearer vb_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }'
```

### 3. List Tools
```bash
curl -X POST https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1 \
  -H "Authorization: Bearer vb_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'
```

### 4. Call a Tool
```bash
curl -X POST https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1 \
  -H "Authorization: Bearer vb_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "check_availability",
      "arguments": {
        "date": "2025-06-15"
      }
    },
    "id": 3
  }'
```

## Common Issues

### 1. 401 Unauthorized
- Check your API token is correct
- Ensure the token is active in the system
- Verify the "Bearer " prefix is included

### 2. CORS Errors
- The server includes CORS headers for browser requests
- If testing from a browser, ensure you're using the correct URL

### 3. 404 Not Found
- Verify the URL is correct: `/api/mcp/v1`
- Ensure the deployment includes the latest code

### 4. 500 Internal Server Error
- Check server logs for detailed error messages
- Verify the request body is valid JSON-RPC format

## n8n Configuration

For n8n integration, use these settings in the HTTP Request node:

- **Method**: POST
- **URL**: `https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1`
- **Authentication**: Generic Header Auth
  - **Header Name**: `Authorization`
  - **Header Value**: `Bearer vb_YOUR_TOKEN`
- **Headers**:
  - `Content-Type`: `application/json`
- **Body**: (JSON)
  ```json
  {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "check_availability",
      "arguments": {
        "date": "{{$json.date}}"
      }
    },
    "id": {{$randomInt}}
  }
  ```

## Debugging Tips

1. **Enable Server Logging**: Check Railway logs for server-side errors
2. **Test Incrementally**: Start with authentication test, then initialize, then tools
3. **Verify Token Scopes**: Ensure your token has both `read` and `write` scopes
4. **Check Response Format**: MCP expects specific JSON-RPC response format

If the MCP Inspector shows connection errors, try the manual cURL tests first to isolate the issue.