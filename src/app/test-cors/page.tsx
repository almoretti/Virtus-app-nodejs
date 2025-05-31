"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function TestCorsPage() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const testDirectN8n = async () => {
    setLoading(true)
    setResult("")
    
    const webhookUrl = 'https://n8n.moretti.cc/webhook/f2d9fc80-ccdb-4bf6-ac48-27ada5830139'
    
    try {
      console.log('Testing direct n8n connection...')
      console.log('Origin:', window.location.origin)
      console.log('Webhook URL:', webhookUrl)
      
      // First try OPTIONS request to see CORS headers
      console.log('Sending OPTIONS request...')
      const optionsResponse = await fetch(webhookUrl, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      }).catch(err => {
        console.error('OPTIONS request failed:', err)
        return null
      })
      
      if (optionsResponse) {
        console.log('OPTIONS response status:', optionsResponse.status)
        console.log('OPTIONS response headers:')
        optionsResponse.headers.forEach((value, key) => {
          console.log(`  ${key}: ${value}`)
        })
      }
      
      // Now try actual POST
      console.log('Sending POST request...')
      const response = await fetch(webhookUrl, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          message: "Test CORS",
          origin: window.location.origin
        })
      })
      
      console.log('POST response status:', response.status)
      console.log('POST response headers:')
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`)
      })
      
      const data = await response.text()
      setResult(`Success! Response: ${data}`)
      
    } catch (error) {
      console.error('CORS test failed:', error)
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testProxy = async () => {
    setLoading(true)
    setResult("")
    
    try {
      console.log('Testing proxy endpoint...')
      
      const response = await fetch('/api/chat/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          message: "Test proxy"
        })
      })
      
      console.log('Proxy response status:', response.status)
      
      const data = await response.text()
      setResult(`Proxy response: ${data}`)
      
    } catch (error) {
      console.error('Proxy test failed:', error)
      setResult(`Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test CORS Configuration</h1>
      
      <div className="space-y-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Current Environment</h2>
          <p>Origin: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</p>
          <p>Webhook URL: https://n8n.moretti.cc/webhook/f2d9fc80-ccdb-4bf6-ac48-27ada5830139</p>
        </Card>
        
        <div className="flex gap-4">
          <Button onClick={testDirectN8n} disabled={loading}>
            Test Direct n8n Connection
          </Button>
          
          <Button onClick={testProxy} disabled={loading}>
            Test Proxy Endpoint
          </Button>
        </div>
        
        {result && (
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Result:</h3>
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </Card>
        )}
        
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Check Browser Console</h3>
          <p className="text-sm text-muted-foreground">
            Open the browser console (F12) to see detailed CORS debugging information.
          </p>
        </Card>
      </div>
    </div>
  )
}