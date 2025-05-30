'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export default function N8nMCPDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const n8nSSEExample = `// n8n HTTP Request Node Configuration for SSE

// 1. First, establish SSE connection:
GET https://virtus-app-nodejs-production.up.railway.app/api/mcp/n8n?sessionId={{$guid}}
Headers:
  Authorization: Bearer {{$credentials.apiKey}}
  Accept: text/event-stream

// 2. Then make tool calls:
POST https://virtus-app-nodejs-production.up.railway.app/api/mcp/n8n
Headers:
  Authorization: Bearer {{$credentials.apiKey}}
  Content-Type: application/json
Body:
{
  "sessionId": "{{$json.sessionId}}",
  "tool": "check_availability",
  "arguments": {
    "date": "2025-06-15"
  }
}`

  const n8nWorkflowExample = `{
  "nodes": [
    {
      "name": "MCP Tool",
      "type": "n8n-nodes-langchain.mcpClientTool",
      "position": [250, 300],
      "parameters": {
        "name": "check_availability",
        "description": "Check technician availability for a specific date",
        "arguments": {
          "date": "2025-06-15"
        }
      }
    }
  ]
}`

  const n8nCredentialsSetup = `1. In n8n, go to Credentials
2. Create new credential of type "MCP Client"
3. Configure:
   - Name: "Virtus Booking MCP"
   - API Key: Your Bearer token (e.g., vb_xxxxx)
   - Save the credential`

  const toolsReference = [
    {
      name: 'check_availability',
      description: 'Check technician availability for a specific date',
      parameters: {
        date: 'string (YYYY-MM-DD format)',
        technicianId: 'string (optional)'
      }
    },
    {
      name: 'create_booking',
      description: 'Create a new booking appointment',
      parameters: {
        date: 'string (YYYY-MM-DD)',
        slot: 'string (MORNING|AFTERNOON|EVENING)',
        technicianId: 'string',
        customer: 'object { name, phone, email, address }',
        installationType: 'string',
        notes: 'string (optional)'
      }
    },
    {
      name: 'modify_booking',
      description: 'Modify an existing booking',
      parameters: {
        bookingId: 'string',
        date: 'string (optional)',
        slot: 'string (optional)',
        technicianId: 'string (optional)',
        notes: 'string (optional)'
      }
    },
    {
      name: 'cancel_booking',
      description: 'Cancel a booking appointment',
      parameters: {
        bookingId: 'string',
        reason: 'string (optional)'
      }
    },
    {
      name: 'get_bookings',
      description: 'Get bookings with optional filters',
      parameters: {
        date: 'string (optional)',
        from: 'string (optional)',
        to: 'string (optional)',
        status: 'string (optional: SCHEDULED|COMPLETED|CANCELLED)',
        technicianId: 'string (optional)'
      }
    }
  ]

  return (
    <>
      <h1>n8n MCP Integration Guide</h1>
      <p className="lead">
        Complete guide for integrating Virtus Booking MCP with n8n's MCP Client Tool node
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>n8n version 1.34.0 or higher (with MCP support)</li>
        <li>A valid Virtus Booking API token with appropriate scopes</li>
        <li>The <code>@n8n/n8n-nodes-langchain</code> package installed</li>
      </ul>

      <h2>Step 1: Create API Token</h2>
      <p>
        First, generate an API token in the Virtus Booking system:
      </p>
      <ol>
        <li>Go to <a href="/api-tokens">Token API</a> page</li>
        <li>Create a new token with <code>read</code> and <code>write</code> scopes</li>
        <li>Copy the token (it starts with <code>vb_</code>)</li>
      </ol>

      <h2>Step 2: Configure n8n Credentials</h2>
      <div className="relative">
        <pre className="not-prose">
          <code>{n8nCredentialsSetup}</code>
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={() => copyToClipboard(n8nCredentialsSetup, 'credentials')}
        >
          {copiedSection === 'credentials' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <h2>Step 3: Add MCP Tool Node</h2>
      <p>
        In your n8n workflow, add the MCP Client Tool node and configure it:
      </p>

      <div className="relative">
        <pre className="not-prose">
          <code>{n8nMCPToolExample}</code>
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={() => copyToClipboard(n8nMCPToolExample, 'config')}
        >
          {copiedSection === 'config' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <h2>Available Tools</h2>
      <p>
        The following tools are available in the MCP server:
      </p>

      {toolsReference.map((tool) => (
        <div key={tool.name} className="mb-6">
          <h3>{tool.name}</h3>
          <p>{tool.description}</p>
          <h4>Parameters:</h4>
          <ul>
            {Object.entries(tool.parameters).map(([key, value]) => (
              <li key={key}>
                <code>{key}</code>: {value}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Example Workflow</h2>
      <p>
        Here's an example n8n workflow that checks availability and creates a booking:
      </p>

      <div className="relative">
        <pre className="not-prose">
          <code>{n8nWorkflowExample}</code>
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={() => copyToClipboard(n8nWorkflowExample, 'workflow')}
        >
          {copiedSection === 'workflow' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <h2>Using with AI Agents</h2>
      <p>
        The MCP Tool node works seamlessly with n8n's AI Agent node. You can:
      </p>
      <ol>
        <li>Add an AI Agent node (e.g., OpenAI Agent)</li>
        <li>Connect the MCP Tool node as a tool for the agent</li>
        <li>The agent can then use natural language to interact with the booking system</li>
      </ol>

      <h3>Example Agent Prompt</h3>
      <pre className="not-prose">
        <code>{`You are a booking assistant for Virtus water filtration services.
You can:
- Check technician availability using check_availability
- Create new bookings with create_booking
- Modify existing bookings with modify_booking
- Cancel bookings with cancel_booking
- View bookings with get_bookings

Always check availability before creating a booking.
Speak in Italian when responding to users.`}</code>
      </pre>

      <h2>Error Handling</h2>
      <p>
        Common errors and solutions:
      </p>
      <table>
        <thead>
          <tr>
            <th>Error</th>
            <th>Cause</th>
            <th>Solution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>401 Unauthorized</td>
            <td>Invalid or missing API token</td>
            <td>Check your credential configuration</td>
          </tr>
          <tr>
            <td>403 Forbidden</td>
            <td>Insufficient permissions</td>
            <td>Ensure token has correct scopes</td>
          </tr>
          <tr>
            <td>Connection refused</td>
            <td>Wrong URL or server down</td>
            <td>Verify the server URL is correct</td>
          </tr>
        </tbody>
      </table>

      <h2>Best Practices</h2>
      <ul>
        <li>Always validate dates are in the future before creating bookings</li>
        <li>Check availability before attempting to create bookings</li>
        <li>Use try/catch nodes to handle errors gracefully</li>
        <li>Implement logging for debugging workflows</li>
        <li>Test with small date ranges before scaling up</li>
      </ul>

      <h2>Testing Your Integration</h2>
      <p>
        To test your MCP integration:
      </p>
      <ol>
        <li>Create a simple workflow with just the MCP Tool node</li>
        <li>Configure it to use <code>check_availability</code></li>
        <li>Set the date parameter to tomorrow's date</li>
        <li>Execute the workflow and verify you get availability data</li>
      </ol>

      <h2>Support</h2>
      <p>
        If you encounter issues:
      </p>
      <ul>
        <li>Check the n8n execution logs for detailed error messages</li>
        <li>Verify your API token is active and has correct permissions</li>
        <li>Ensure the date format is YYYY-MM-DD</li>
        <li>Test the API endpoint directly with cURL first</li>
      </ul>
    </>
  )
}