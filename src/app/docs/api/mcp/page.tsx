'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export default function MCPDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(section)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const n8nCurlExample = `curl -X POST 'https://virtus-app-nodejs-production.up.railway.app/api/mcp?sessionId={{$guid}}' \\
-H 'Authorization: Bearer IL_TUO_TOKEN_API' \\
-H 'Content-Type: application/json' \\
-d '{
  "jsonrpc": "2.0",
  "id": {{$randomInt}},
  "method": "tools/call",
  "params": {
    "name": "check_availability",
    "arguments": {
      "date": "{{$today}}"
    }
  }
}'`

  const sessionIdExplanation = `// Il sessionId è un identificatore univoco per la tua sessione MCP
// Può essere:
// 1. Generato automaticamente: crypto.randomUUID()
// 2. Un ID fisso per sessioni persistenti: "n8n-integration-001"
// 3. Un ID utente per tracciare le richieste: "user-123-session"

// Esempio con sessionId automatico:
const sessionId = crypto.randomUUID() // "550e8400-e29b-41d4-a716-446655440000"

// Esempio con sessionId fisso per n8n:
const sessionId = "n8n-booking-session"

// Il sessionId viene usato per:
// - Mantenere il contesto tra richieste multiple
// - Ricevere aggiornamenti SSE in tempo reale
// - Associare le richieste all'utente autenticato`

  return (
    <>
      <h1>Model Context Protocol (MCP) Server</h1>
      <p className="lead">
        Il server MCP permette ai Large Language Models (LLM) di interagire con il sistema di prenotazione Virtus 
        tramite un protocollo standardizzato, supportando operazioni in tempo reale tramite Server-Sent Events (SSE).
      </p>

      <h2>Panoramica</h2>
      <p>
        Il Model Context Protocol (MCP) è uno standard aperto per la comunicazione tra LLM e sistemi esterni. 
        Il nostro server MCP espone le funzionalità di prenotazione attraverso "tools" che gli LLM possono utilizzare.
      </p>

      <h3>Caratteristiche Principali</h3>
      <ul>
        <li>🔐 <strong>Autenticazione</strong>: Utilizza gli stessi token API del sistema REST</li>
        <li>📡 <strong>Real-time</strong>: Supporto SSE per aggiornamenti in tempo reale</li>
        <li>🔧 <strong>Tools disponibili</strong>: 5 operazioni per gestire le prenotazioni</li>
        <li>🇮🇹 <strong>Interfaccia italiana</strong>: Tutte le risposte sono in italiano</li>
      </ul>

      <h2>Autenticazione</h2>
      <p>
        Il server MCP richiede un token Bearer valido per tutte le richieste. 
        Usa lo stesso token generato dalla sezione "Token API" del sistema.
      </p>
      <pre className="not-prose">
        <code>{`Authorization: Bearer vb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</code>
      </pre>

      <h3>Scopes Richiesti</h3>
      <ul>
        <li><code>read</code>: Per check_availability, get_bookings</li>
        <li><code>write</code>: Per create_booking, modify_booking, cancel_booking</li>
      </ul>

      <h2>Il parametro sessionId</h2>
      <p>
        Il <code>sessionId</code> è un identificatore univoco per la sessione MCP che mantiene il contesto 
        tra richieste multiple e abilita gli aggiornamenti in tempo reale.
      </p>

      <div className="relative">
        <pre className="not-prose">
          <code>{sessionIdExplanation}</code>
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={() => copyToClipboard(sessionIdExplanation, 'sessionId')}
        >
          {copiedSection === 'sessionId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <h2>Endpoints</h2>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Metodo</th>
            <th>Descrizione</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>/api/mcp</code></td>
            <td>GET</td>
            <td>Connessione SSE per aggiornamenti real-time</td>
          </tr>
          <tr>
            <td><code>/api/mcp</code></td>
            <td>POST</td>
            <td>Invio messaggi JSON-RPC al server MCP</td>
          </tr>
          <tr>
            <td><code>/api/mcp/status</code></td>
            <td>GET</td>
            <td>Health check e informazioni sul server</td>
          </tr>
        </tbody>
      </table>

      <h2>Tools Disponibili</h2>

      <h3>1. check_availability</h3>
      <p>Controlla la disponibilità dei tecnici per una data specifica.</p>
      <pre className="not-prose">
        <code>{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "check_availability",
    "arguments": {
      "date": "2025-01-30",
      "technicianId": "tech-123"  // opzionale
    }
  }
}`}</code>
      </pre>

      <h3>2. create_booking</h3>
      <p>Crea una nuova prenotazione.</p>
      <pre className="not-prose">
        <code>{`{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "create_booking",
    "arguments": {
      "date": "2025-01-30",
      "slot": "MORNING",  // MORNING, AFTERNOON, EVENING
      "technicianId": "tech-123",
      "customer": {
        "name": "Mario Rossi",
        "phone": "+39 123 456 7890",
        "email": "mario@example.com",
        "address": "Via Roma 123, Milano"
      },
      "installationType": "Filtro sotto lavello",
      "notes": "Secondo piano"
    }
  }
}`}</code>
      </pre>

      <h3>3. modify_booking</h3>
      <p>Modifica una prenotazione esistente.</p>
      <pre className="not-prose">
        <code>{`{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "modify_booking",
    "arguments": {
      "bookingId": "booking-123",
      "date": "2025-01-31",      // opzionale
      "slot": "AFTERNOON",       // opzionale
      "technicianId": "tech-456", // opzionale
      "notes": "Cambiato orario"  // opzionale
    }
  }
}`}</code>
      </pre>

      <h3>4. cancel_booking</h3>
      <p>Cancella una prenotazione.</p>
      <pre className="not-prose">
        <code>{`{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "cancel_booking",
    "arguments": {
      "bookingId": "booking-123",
      "reason": "Cliente non disponibile"  // opzionale
    }
  }
}`}</code>
      </pre>

      <h3>5. get_bookings</h3>
      <p>Recupera le prenotazioni con filtri opzionali.</p>
      <pre className="not-prose">
        <code>{`{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_bookings",
    "arguments": {
      "date": "2025-01-30",         // opzionale
      "from": "2025-01-01",         // opzionale
      "to": "2025-01-31",           // opzionale
      "status": "SCHEDULED",        // opzionale: SCHEDULED, COMPLETED, CANCELLED
      "technicianId": "tech-123"    // opzionale
    }
  }
}`}</code>
      </pre>

      <h2>Server-Sent Events (SSE)</h2>
      <p>
        Connettiti all'endpoint SSE per ricevere aggiornamenti in tempo reale:
      </p>
      <pre className="not-prose">
        <code>{`const eventSource = new EventSource('/api/mcp?sessionId=my-session', {
  headers: {
    'Authorization': 'Bearer IL_TUO_TOKEN_API'
  }
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connection-established':
      // console.log('Connesso al server MCP');
      break;
    case 'booking-notification':
      // console.log(\`Prenotazione \${data.event}: \`, data.booking);
      break;
    case 'availability-update':
      // console.log(\`Disponibilità aggiornata per \${data.date}\`);
      break;
  }
};`}</code>
      </pre>

      <h2>Integrazione con n8n</h2>
      <p>
        n8n è una piattaforma di automazione workflow che può facilmente integrarsi con il server MCP 
        per automatizzare la gestione delle prenotazioni.
      </p>

      <h3>Configurazione HTTP Request Node</h3>
      <p>
        Copia e incolla questo comando cURL nel nodo HTTP Request di n8n. 
        Dovrai solo aggiornare il token Bearer con il tuo token API valido:
      </p>

      <div className="relative">
        <pre className="not-prose">
          <code>{n8nCurlExample}</code>
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={() => copyToClipboard(n8nCurlExample, 'n8n')}
        >
          {copiedSection === 'n8n' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <h3>Workflow di Esempio</h3>
      <ol>
        <li><strong>Trigger</strong>: Webhook o Schedule</li>
        <li><strong>HTTP Request</strong>: Controlla disponibilità (check_availability)</li>
        <li><strong>IF</strong>: Se c'è disponibilità</li>
        <li><strong>HTTP Request</strong>: Crea prenotazione (create_booking)</li>
        <li><strong>Email</strong>: Invia conferma al cliente</li>
      </ol>

      <h3>Variabili n8n Utili</h3>
      <ul>
        <li><code>{`{{$guid}}`}</code>: Genera un UUID per sessionId</li>
        <li><code>{`{{$today}}`}</code>: Data di oggi in formato ISO</li>
        <li><code>{`{{$randomInt}}`}</code>: ID casuale per la richiesta</li>
        <li><code>{`{{$json.date}}`}</code>: Accedi ai dati dal nodo precedente</li>
      </ul>

      <h2>Esempi di Risposta</h2>

      <h3>Disponibilità</h3>
      <pre className="not-prose">
        <code>{`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "**Disponibilità per 30 gennaio 2025**\\n\\n**Mattina (10:00-12:00):**\\n- Marco Rossi: ✅ Disponibile\\n- Luigi Bianchi: ❌ Occupato\\n\\n**Pomeriggio (13:00-15:00):**\\n- Marco Rossi: ✅ Disponibile\\n- Luigi Bianchi: ✅ Disponibile\\n\\n**Sera (16:00-18:00):**\\n- Marco Rossi: ❌ Occupato\\n- Luigi Bianchi: ✅ Disponibile"
    }]
  }
}`}</code>
      </pre>

      <h3>Creazione Prenotazione</h3>
      <pre className="not-prose">
        <code>{`{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "✅ **Prenotazione creata con successo!**\\n\\n**Prenotazione ID: booking-12345**\\n- **Data**: 30 gennaio 2025\\n- **Orario**: Mattina (10:00-12:00)\\n- **Cliente**: Mario Rossi\\n- **Tecnico**: Marco Rossi\\n- **Tipo**: Filtro sotto lavello"
    }]
  }
}`}</code>
      </pre>

      <h2>Codici di Errore</h2>
      <table>
        <thead>
          <tr>
            <th>Codice</th>
            <th>Significato</th>
            <th>Soluzione</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>401</td>
            <td>Non autorizzato</td>
            <td>Verifica il token Bearer</td>
          </tr>
          <tr>
            <td>403</td>
            <td>Permessi insufficienti</td>
            <td>Verifica gli scope del token</td>
          </tr>
          <tr>
            <td>409</td>
            <td>Conflitto</td>
            <td>Slot già prenotato</td>
          </tr>
          <tr>
            <td>-32601</td>
            <td>Metodo non trovato</td>
            <td>Verifica il nome del tool</td>
          </tr>
        </tbody>
      </table>

      <h2>Best Practices</h2>
      <ul>
        <li>Usa sempre un <code>sessionId</code> consistente per sessioni correlate</li>
        <li>Controlla sempre la disponibilità prima di creare prenotazioni</li>
        <li>Implementa retry logic con backoff esponenziale</li>
        <li>Sottoscrivi agli eventi SSE per aggiornamenti real-time</li>
        <li>Valida i dati lato client prima di inviarli</li>
      </ul>

      <h2>Limiti e Considerazioni</h2>
      <ul>
        <li>Le date devono essere future (non si possono creare prenotazioni nel passato)</li>
        <li>Gli slot sono limitati a MORNING, AFTERNOON, EVENING</li>
        <li>Un tecnico può avere solo una prenotazione per slot</li>
        <li>Le modifiche a prenotazioni CANCELLED non sono permesse</li>
      </ul>
    </>
  )
}