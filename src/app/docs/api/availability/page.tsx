import { ApiEndpoint, ApiParam } from "@/components/docs/api-reference"
import { CodeBlock } from "@/components/docs/code-block"

export default function AvailabilityApiPage() {
  return (
    <>
      <h1>API Disponibilità</h1>
      <p className="lead">
        Controlla la disponibilità dei tecnici per date e fasce orarie specifiche.
      </p>

      <h2>Endpoints</h2>

      <ApiEndpoint 
        method="GET" 
        path="/api/availability"
        description="Recupera la disponibilità di tutti i tecnici per una data specifica o un intervallo di date."
      >
        <h4>Query Parameters (Opzione 1 - Data Singola)</h4>
        <ApiParam 
          name="date" 
          type="string" 
          description="Data per cui verificare la disponibilità (formato: YYYY-MM-DD)" 
        />

        <h4>Query Parameters (Opzione 2 - Intervallo Date)</h4>
        <ApiParam 
          name="from" 
          type="string" 
          description="Data di inizio intervallo (formato: YYYY-MM-DD)" 
        />
        <ApiParam 
          name="to" 
          type="string" 
          description="Data di fine intervallo (formato: YYYY-MM-DD)" 
        />

        <h4>Esempio Request (Data Singola)</h4>
        <CodeBlock language="bash">{`GET /api/availability?date=2025-01-15`}</CodeBlock>

        <h4>Esempio Risposta (Data Singola)</h4>
        <CodeBlock language="json">{`{
  "date": "2025-01-15",
  "technicians": [
    {
      "id": "clx123...",
      "name": "Luigi Verdi",
      "color": "#3B82F6"
    },
    {
      "id": "clx456...",
      "name": "Marco Blu", 
      "color": "#EF4444"
    }
  ],
  "availability": {
    "MORNING": {
      "clx123...": true,
      "clx456...": false
    },
    "AFTERNOON": {
      "clx123...": true,
      "clx456...": true
    },
    "EVENING": {
      "clx123...": false,
      "clx456...": true
    }
  }
}`}</CodeBlock>

        <h4>Esempio Request (Intervallo Date)</h4>
        <CodeBlock language="bash">{`GET /api/availability?from=2025-01-15&to=2025-01-17`}</CodeBlock>

        <h4>Esempio Risposta (Intervallo Date)</h4>
        <CodeBlock language="json">{`{
  "from": "2025-01-15",
  "to": "2025-01-17",
  "technicians": [
    {
      "id": "clx123...",
      "name": "Luigi Verdi",
      "color": "#3B82F6"
    },
    {
      "id": "clx456...",
      "name": "Marco Blu",
      "color": "#EF4444"
    }
  ],
  "availability": {
    "2025-01-15": {
      "clx123...": {
        "MORNING": true,
        "AFTERNOON": true,
        "EVENING": false
      },
      "clx456...": {
        "MORNING": false,
        "AFTERNOON": true,
        "EVENING": true
      }
    },
    "2025-01-16": {
      "clx123...": {
        "MORNING": true,
        "AFTERNOON": false,
        "EVENING": true
      },
      "clx456...": {
        "MORNING": true,
        "AFTERNOON": true,
        "EVENING": false
      }
    },
    "2025-01-17": {
      "clx123...": {
        "MORNING": false,
        "AFTERNOON": true,
        "EVENING": true
      },
      "clx456...": {
        "MORNING": true,
        "AFTERNOON": true,
        "EVENING": true
      }
    }
  }
}`}</CodeBlock>
      </ApiEndpoint>

      <h2>Fasce Orarie</h2>
      <p>Il sistema supporta tre fasce orarie giornaliere:</p>
      <table>
        <thead>
          <tr>
            <th>Fascia</th>
            <th>Orario</th>
            <th>Codice</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Mattina</td>
            <td>10:00 - 12:00</td>
            <td><code>MORNING</code></td>
          </tr>
          <tr>
            <td>Pomeriggio</td>
            <td>13:00 - 15:00</td>
            <td><code>AFTERNOON</code></td>
          </tr>
          <tr>
            <td>Sera</td>
            <td>16:00 - 18:00</td>
            <td><code>EVENING</code></td>
          </tr>
        </tbody>
      </table>

      <h2>Logica di Disponibilità</h2>
      <p>
        Un tecnico è considerato non disponibile se:
      </p>
      <ul>
        <li>Ha già una prenotazione confermata (SCHEDULED) in quella fascia oraria</li>
        <li>È in ferie o non lavora in quel giorno</li>
      </ul>

      <h2>Casi d'Uso</h2>
      <h3>Query Data Singola</h3>
      <p>Ideale per:</p>
      <ul>
        <li>Verificare disponibilità in tempo reale durante la prenotazione</li>
        <li>Visualizzazione calendario giornaliera</li>
        <li>Controlli rapidi di disponibilità</li>
      </ul>

      <h3>Query Intervallo Date</h3>
      <p>Ideale per:</p>
      <ul>
        <li>Pianificazione settimanale o mensile</li>
        <li>Report di disponibilità per i manager</li>
        <li>Analisi dei carichi di lavoro</li>
        <li>Pianificazione ferie e permessi</li>
      </ul>

      <h2>Codici di Errore</h2>
      <table>
        <thead>
          <tr>
            <th>Codice</th>
            <th>Descrizione</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>400</code></td>
            <td>Parametri mancanti o formato data non valido</td>
          </tr>
          <tr>
            <td><code>400</code></td>
            <td>Data di fine precedente alla data di inizio (intervalli)</td>
          </tr>
          <tr>
            <td><code>401</code></td>
            <td>Non autenticato</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}