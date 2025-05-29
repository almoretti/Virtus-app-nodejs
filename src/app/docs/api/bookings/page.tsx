import { ApiEndpoint, ApiParam } from "@/components/docs/api-reference"
import { CodeBlock } from "@/components/docs/code-block"

export default function BookingsApiPage() {
  return (
    <>
      <h1>API Prenotazioni</h1>
      <p className="lead">
        Gestisci le prenotazioni del sistema tramite queste API REST.
      </p>

      <h2>Endpoints</h2>

      <ApiEndpoint 
        method="GET" 
        path="/api/bookings"
        description="Recupera tutte le prenotazioni del sistema. Tutti gli utenti autenticati possono visualizzare tutte le prenotazioni."
      >
        <h4>Query Parameters (Tutti Opzionali)</h4>
        <ApiParam 
          name="date" 
          type="string" 
          description="Filtra per data specifica (formato: YYYY-MM-DD)" 
        />
        <ApiParam 
          name="from" 
          type="string" 
          description="Data di inizio per filtro intervallo (formato: YYYY-MM-DD, richiede anche 'to')" 
        />
        <ApiParam 
          name="to" 
          type="string" 
          description="Data di fine per filtro intervallo (formato: YYYY-MM-DD, richiede anche 'from')" 
        />
        <ApiParam 
          name="status" 
          type="string" 
          description="Filtra per stato: SCHEDULED, COMPLETED, CANCELLED" 
        />
        <ApiParam 
          name="technicianId" 
          type="string" 
          description="Filtra per ID tecnico specifico" 
        />

        <h4>Esempi Request</h4>
        <CodeBlock language="bash">{`# Tutte le prenotazioni
GET /api/bookings

# Prenotazioni di una data specifica
GET /api/bookings?date=2025-01-15

# Prenotazioni in un intervallo di date
GET /api/bookings?from=2025-01-15&to=2025-01-20

# Prenotazioni di un tecnico specifico
GET /api/bookings?technicianId=clx456...

# Solo prenotazioni programmate
GET /api/bookings?status=SCHEDULED

# Combinazione di filtri
GET /api/bookings?from=2025-01-15&to=2025-01-20&status=SCHEDULED&technicianId=clx456...`}</CodeBlock>

        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`[
  {
    "id": "clx123...",
    "date": "2025-01-15T00:00:00.000Z",
    "slot": "MORNING",
    "status": "SCHEDULED",
    "notes": "Chiamare prima di arrivare",
    "customer": {
      "id": "clx789...",
      "name": "Mario Rossi",
      "phone": "333 1234567",
      "email": "mario.rossi@email.com",
      "address": "Via Roma 1, Milano"
    },
    "technician": {
      "id": "clx456...",
      "color": "#3B82F6",
      "user": {
        "id": "clx999...",
        "name": "Luigi Verdi",
        "email": "luigi.verdi@email.com"
      }
    },
    "installationType": {
      "id": "clx888...",
      "name": "KITCHEN"
    },
    "createdBy": {
      "id": "clx777...",
      "name": "Admin User",
      "email": "admin@virtus.com"
    },
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-10T10:30:00.000Z"
  }
]`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="POST" 
        path="/api/bookings"
        description="Crea una nuova prenotazione. Verifica automaticamente la disponibilità del tecnico."
      >
        <h4>Request Body</h4>
        <ApiParam 
          name="customerName" 
          type="string" 
          required
          description="Nome completo del cliente" 
        />
        <ApiParam 
          name="customerPhone" 
          type="string" 
          required
          description="Numero di telefono del cliente" 
        />
        <ApiParam 
          name="customerAddress" 
          type="string" 
          required
          description="Indirizzo completo per l'intervento" 
        />
        <ApiParam 
          name="installationType" 
          type="string" 
          required
          description="Tipo di installazione: KITCHEN, WHOLE_HOUSE, UNDER_SINK" 
        />
        <ApiParam 
          name="date" 
          type="string" 
          required
          description="Data dell'appuntamento (formato: YYYY-MM-DD)" 
        />
        <ApiParam 
          name="timeSlot" 
          type="string" 
          required
          description="Fascia oraria: MORNING (10-12), AFTERNOON (13-15), EVENING (16-18)" 
        />
        <ApiParam 
          name="technicianId" 
          type="string" 
          required
          description="ID del tecnico assegnato" 
        />
        <ApiParam 
          name="notes" 
          type="string" 
          description="Note aggiuntive per il tecnico" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "customerName": "Mario Rossi",
  "customerPhone": "333 1234567",
  "customerAddress": "Via Roma 1, Milano",
  "installationType": "KITCHEN",
  "date": "2025-01-15",
  "timeSlot": "MORNING",
  "technicianId": "clx456...",
  "notes": "Chiamare prima di arrivare"
}`}</CodeBlock>

        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`{
  "id": "clx789...",
  "customerName": "Mario Rossi",
  "customerPhone": "333 1234567",
  "customerAddress": "Via Roma 1, Milano",
  "installationType": "KITCHEN",
  "date": "2025-01-15T00:00:00.000Z",
  "timeSlot": "MORNING",
  "status": "SCHEDULED",
  "notes": "Chiamare prima di arrivare",
  "technicianId": "clx456...",
  "createdAt": "2025-01-10T10:30:00.000Z",
  "updatedAt": "2025-01-10T10:30:00.000Z"
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="PATCH" 
        path="/api/bookings/[id]/status"
        description="Aggiorna lo stato di una prenotazione esistente."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID della prenotazione da aggiornare" 
        />

        <h4>Request Body</h4>
        <ApiParam 
          name="status" 
          type="string" 
          required
          description="Nuovo stato: SCHEDULED, COMPLETED, CANCELLED" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "status": "COMPLETED"
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="DELETE" 
        path="/api/bookings/[id]"
        description="Elimina una prenotazione. Solo gli admin possono eliminare prenotazioni."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID della prenotazione da eliminare" 
        />
      </ApiEndpoint>

      <h2>Funzionalità di Filtering</h2>
      <p>L'API supporta combinazioni multiple di filtri per query avanzate:</p>
      <ul>
        <li><strong>Filtro Data</strong>: Usa <code>date</code> per una data specifica o <code>from</code>+<code>to</code> per un intervallo</li>
        <li><strong>Filtro Stato</strong>: Limita i risultati a uno stato specifico</li>
        <li><strong>Filtro Tecnico</strong>: Mostra solo le prenotazioni di un tecnico</li>
        <li><strong>Combinazioni</strong>: Tutti i filtri possono essere combinati</li>
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
            <td>Richiesta non valida - parametri mancanti o non validi</td>
          </tr>
          <tr>
            <td><code>400</code></td>
            <td>Data di fine precedente alla data di inizio (filtri intervallo)</td>
          </tr>
          <tr>
            <td><code>401</code></td>
            <td>Non autenticato - sessione mancante o scaduta</td>
          </tr>
          <tr>
            <td><code>403</code></td>
            <td>Non autorizzato - permessi insufficienti</td>
          </tr>
          <tr>
            <td><code>404</code></td>
            <td>Prenotazione non trovata</td>
          </tr>
          <tr>
            <td><code>409</code></td>
            <td>Conflitto - il tecnico non è disponibile per quella fascia oraria</td>
          </tr>
        </tbody>
      </table>

      <h2>Note Implementative</h2>
      <ul>
        <li>Le date devono essere nel formato ISO 8601 (YYYY-MM-DD)</li>
        <li>I timeSlot accettati sono: MORNING (10-12), AFTERNOON (13-15), EVENING (16-18)</li>
        <li>Lo stato iniziale di una prenotazione è sempre SCHEDULED</li>
        <li>Solo gli admin possono eliminare prenotazioni</li>
        <li>I tecnici possono vedere solo le proprie prenotazioni</li>
      </ul>
    </>
  )
}