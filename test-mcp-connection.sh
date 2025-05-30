#!/bin/bash

# Test MCP Connection Script
# Usage: ./test-mcp-connection.sh YOUR_API_TOKEN

TOKEN=$1
BASE_URL="https://virtus-app-nodejs-production.up.railway.app"

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 YOUR_API_TOKEN"
    echo "Example: $0 vb_your_token_here"
    exit 1
fi

echo "🔍 Testing MCP Server Connection..."
echo "=================================="
echo ""

# Test 1: Test endpoint
echo "1️⃣ Testing authentication with /api/mcp/test..."
echo "Request: GET $BASE_URL/api/mcp/test"
echo ""
curl -X GET "$BASE_URL/api/mcp/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Failed to parse JSON response"

echo ""
echo "=================================="
echo ""

# Test 2: Initialize method
echo "2️⃣ Testing MCP initialize method..."
echo "Request: POST $BASE_URL/api/mcp/v1"
echo ""
curl -X POST "$BASE_URL/api/mcp/v1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Failed to parse JSON response"

echo ""
echo "=================================="
echo ""

# Test 3: List tools
echo "3️⃣ Testing tools/list method..."
echo "Request: POST $BASE_URL/api/mcp/v1"
echo ""
curl -X POST "$BASE_URL/api/mcp/v1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Failed to parse JSON response"

echo ""
echo "=================================="
echo ""

# Test 4: Check availability tool
echo "4️⃣ Testing check_availability tool..."
echo "Request: POST $BASE_URL/api/mcp/v1"
echo ""
curl -X POST "$BASE_URL/api/mcp/v1" \
  -H "Authorization: Bearer $TOKEN" \
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
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.' || echo "Failed to parse JSON response"

echo ""
echo "=================================="
echo ""
echo "✅ Tests completed!"
echo ""
echo "If all tests returned HTTP 200 with valid JSON responses, your MCP server is working correctly."
echo "If you see 401 errors, check your API token."
echo "If you see 500 errors, check the server logs."