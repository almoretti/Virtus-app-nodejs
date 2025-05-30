# n8n MCP Integration Troubleshooting Guide

## Connection URL
```
https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1
```

## Required Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_API_TOKEN"
}
```

## Common Issues and Solutions

### 1. Authentication Errors
- **Issue**: 401 Unauthorized or "Token API non valido"
- **Solution**: Ensure you're using a valid API token created from the /api-tokens page
- **Check**: The token should have the correct scopes (read/write)

### 2. CORS Errors
- **Issue**: Cross-Origin Request Blocked
- **Solution**: The v1 endpoint now includes CORS headers allowing all origins
- **Headers Added**:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

### 3. JSON-RPC Format
The endpoint expects standard JSON-RPC 2.0 format:
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {},
  "id": 1
}
```

### 4. Available Methods
- `initialize` - Initialize connection
- `tools/list` - Get available tools
- `tools/call` - Execute a tool

### 5. Testing the Connection

#### Using cURL:
```bash
# Test initialize
curl -X POST https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'

# Test tools list
curl -X POST https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
```

#### Using Node.js test script:
```bash
node test-n8n-connection.js
```

### 6. Debugging Steps
1. Check the server logs for incoming requests
2. Verify the API token is active and not expired
3. Ensure the request body is valid JSON
4. Check if the method name is correct
5. Look for console.log outputs in the server logs

### 7. n8n Configuration
In n8n's HTTP Request node:
- **Method**: POST
- **URL**: `https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1`
- **Authentication**: Header Auth
  - **Name**: Authorization
  - **Value**: Bearer YOUR_TOKEN
- **Headers**:
  - Content-Type: application/json
- **Body**: JSON with the JSON-RPC request

### 8. Rate Limiting
The API has rate limiting:
- 30 requests per minute per IP
- If you get 429 errors, wait before retrying

### 9. Example n8n Workflow
```json
{
  "nodes": [
    {
      "name": "MCP Initialize",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://virtus-app-nodejs-production.up.railway.app/api/mcp/v1",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "httpHeaderAuth": {
          "name": "Authorization",
          "value": "Bearer YOUR_TOKEN"
        },
        "options": {
          "headers": {
            "Content-Type": "application/json"
          }
        },
        "jsonBody": {
          "jsonrpc": "2.0",
          "method": "initialize",
          "params": {},
          "id": 1
        }
      }
    }
  ]
}
```

## Changes Made to Fix Connection Issues

1. **Added CORS headers** to allow cross-origin requests from n8n
2. **Added OPTIONS handler** for CORS preflight requests
3. **Added request/response logging** for better debugging
4. **Consistent error response format** with proper headers
5. **Fixed error handling** to always include CORS headers
6. **Added Content-Type header** to all responses

## Next Steps
1. Deploy these changes to production
2. Test with the provided cURL commands or Node.js script
3. Check server logs for any remaining issues
4. Verify n8n can now connect successfully