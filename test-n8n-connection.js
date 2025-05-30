const https = require('https');

// Test configuration
const API_TOKEN = 'YOUR_API_TOKEN_HERE'; // Replace with actual token
const BASE_URL = 'virtus-app-nodejs-production.up.railway.app';
const ENDPOINT = '/api/mcp/v1';

// Test 1: Initialize request
const testInitialize = () => {
  const data = JSON.stringify({
    jsonrpc: "2.0",
    method: "initialize",
    params: {},
    id: 1
  });

  const options = {
    hostname: BASE_URL,
    port: 443,
    path: ENDPOINT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Length': data.length
    }
  };

  console.log('Testing initialize...');
  console.log('URL:', `https://${BASE_URL}${ENDPOINT}`);
  console.log('Headers:', options.headers);

  const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', responseData);
      if (res.statusCode === 200) {
        testToolsList();
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.write(data);
  req.end();
};

// Test 2: Tools list request
const testToolsList = () => {
  const data = JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
    id: 2
  });

  const options = {
    hostname: BASE_URL,
    port: 443,
    path: ENDPOINT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Length': data.length
    }
  };

  console.log('\nTesting tools/list...');

  const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', responseData);
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.write(data);
  req.end();
};

// Run tests
console.log('Testing n8n MCP connection...\n');
testInitialize();