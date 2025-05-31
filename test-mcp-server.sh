#!/bin/bash

# Test script for MCP server deployment

MCP_SERVER_URL="https://fortunate-manifestation-production.up.railway.app"
API_TOKEN="your-api-token-here"  # Replace with your actual API token from /api-tokens

echo "Testing MCP Server Deployment..."
echo "================================"

# Test health check
echo -e "\n1. Testing health check endpoint:"
curl -s "$MCP_SERVER_URL/health" | jq .

# Test info endpoint
echo -e "\n2. Testing info endpoint:"
curl -s "$MCP_SERVER_URL/mcp/info" | jq .

# Test SSE authentication
echo -e "\n3. Testing SSE endpoint authentication:"
curl -s -H "Authorization: Bearer $API_TOKEN" \
  "$MCP_SERVER_URL/mcp/sse" \
  -H "Accept: text/event-stream" \
  --max-time 2

echo -e "\n\nDone!"