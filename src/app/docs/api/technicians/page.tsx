import { ApiEndpoint, ApiParam } from "@/components/docs/api-reference"
import { CodeBlock } from "@/components/docs/code-block"

export default function TechniciansApiPage() {
  return (
    <>
      <h1>API Tecnici</h1>
      <p className="lead">
        Gestione dei tecnici del sistema. Solo per amministratori.
      </p>

      <h2>Endpoints</h2>

      <ApiEndpoint 
        method="GET" 
        path="/api/technicians"
        description="Recupera tutti i tecnici del sistema."
      >
        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`[
  {
    "id": "clx123...",
    "name": "Luigi Verdi",
    "color": "#3B82F6",
    "userId": "clx456...",
    "user": {
      "id": "clx456...",
      "name": "Luigi Verdi",
      "email": "luigi.verdi@email.com",
      "role": "TECHNICIAN"
    },
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
]`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="POST" 
        path="/api/technicians"
        description="Crea un nuovo tecnico. Solo per amministratori."
      >
        <h4>Request Body</h4>
        <ApiParam 
          name="name" 
          type="string" 
          required
          description="Nome del tecnico" 
        />
        <ApiParam 
          name="color" 
          type="string" 
          required
          description="Colore identificativo per il calendario (formato hex: #RRGGBB)" 
        />
        <ApiParam 
          name="userId" 
          type="string" 
          description="ID dell'utente da associare al tecnico (opzionale)" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "name": "Marco Blu",
  "color": "#EF4444",
  "userId": "clx789..."
}`}</CodeBlock>

        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`{
  "id": "clx999...",
  "name": "Marco Blu",
  "color": "#EF4444",
  "userId": "clx789...",
  "createdAt": "2025-01-10T10:30:00.000Z",
  "updatedAt": "2025-01-10T10:30:00.000Z"
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="PUT" 
        path="/api/technicians/[id]"
        description="Aggiorna un tecnico esistente. Solo per amministratori."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID del tecnico da aggiornare" 
        />

        <h4>Request Body</h4>
        <ApiParam 
          name="name" 
          type="string" 
          description="Nome del tecnico" 
        />
        <ApiParam 
          name="color" 
          type="string" 
          description="Colore identificativo (formato hex)" 
        />
        <ApiParam 
          name="userId" 
          type="string" 
          description="ID dell'utente associato" 
        />
      </ApiEndpoint>

      <ApiEndpoint 
        method="DELETE" 
        path="/api/technicians/[id]"
        description="Elimina un tecnico dal sistema. Solo per amministratori."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID del tecnico da eliminare" 
        />
      </ApiEndpoint>

      <h2>Colori Tecnici</h2>
      <p>
        Ogni tecnico ha un colore identificativo utilizzato nel calendario per 
        distinguere visivamente le prenotazioni. I colori devono essere in formato 
        esadecimale (es. #3B82F6).
      </p>

      <h3>Colori Suggeriti</h3>
      <table>
        <thead>
          <tr>
            <th>Colore</th>
            <th>Hex</th>
            <th>Nome</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{backgroundColor: '#3B82F6', width: '20px', height: '20px'}}></td>
            <td><code>#3B82F6</code></td>
            <td>Blu</td>
          </tr>
          <tr>
            <td style={{backgroundColor: '#EF4444', width: '20px', height: '20px'}}></td>
            <td><code>#EF4444</code></td>
            <td>Rosso</td>
          </tr>
          <tr>
            <td style={{backgroundColor: '#10B981', width: '20px', height: '20px'}}></td>
            <td><code>#10B981</code></td>
            <td>Verde</td>
          </tr>
          <tr>
            <td style={{backgroundColor: '#F59E0B', width: '20px', height: '20px'}}></td>
            <td><code>#F59E0B</code></td>
            <td>Giallo</td>
          </tr>
          <tr>
            <td style={{backgroundColor: '#8B5CF6', width: '20px', height: '20px'}}></td>
            <td><code>#8B5CF6</code></td>
            <td>Viola</td>
          </tr>
        </tbody>
      </table>

      <h2>Associazione Utenti</h2>
      <p>
        I tecnici possono essere associati a utenti del sistema con ruolo TECHNICIAN. 
        Questo permette ai tecnici di accedere al sistema e visualizzare le proprie prenotazioni.
      </p>

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
            <td>Dati non validi (nome vuoto, colore non valido)</td>
          </tr>
          <tr>
            <td><code>401</code></td>
            <td>Non autenticato</td>
          </tr>
          <tr>
            <td><code>403</code></td>
            <td>Non autorizzato (solo admin)</td>
          </tr>
          <tr>
            <td><code>404</code></td>
            <td>Tecnico non trovato</td>
          </tr>
          <tr>
            <td><code>409</code></td>
            <td>Conflitto (utente già associato a un altro tecnico)</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}