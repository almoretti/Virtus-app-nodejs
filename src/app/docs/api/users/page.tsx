import { ApiEndpoint, ApiParam } from "@/components/docs/api-reference"
import { CodeBlock } from "@/components/docs/code-block"

export default function UsersApiPage() {
  return (
    <>
      <h1>API Utenti</h1>
      <p className="lead">
        Gestione degli utenti del sistema. Accesso limitato agli amministratori.
      </p>

      <h2>Endpoints</h2>

      <ApiEndpoint 
        method="GET" 
        path="/api/users"
        description="Recupera tutti gli utenti del sistema. Solo per amministratori."
      >
        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`[
  {
    "id": "clx123...",
    "name": "Mario Rossi",
    "email": "mario.rossi@email.com",
    "role": "CUSTOMER_SERVICE",
    "image": "https://lh3.googleusercontent.com/...",
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
]`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="PUT" 
        path="/api/users/[id]"
        description="Aggiorna un utente esistente. Gli utenti possono modificare solo il proprio profilo, gli admin possono modificare qualsiasi utente."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID dell'utente da aggiornare" 
        />

        <h4>Request Body</h4>
        <ApiParam 
          name="name" 
          type="string" 
          description="Nome completo dell'utente" 
        />
        <ApiParam 
          name="email" 
          type="string" 
          description="Email dell'utente" 
        />
        <ApiParam 
          name="role" 
          type="string" 
          description="Ruolo: ADMIN, CUSTOMER_SERVICE, TECHNICIAN (solo admin)" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "name": "Mario Rossi",
  "email": "mario.rossi@newemail.com"
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="DELETE" 
        path="/api/users/[id]"
        description="Elimina un utente dal sistema. Solo per amministratori."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID dell'utente da eliminare" 
        />
      </ApiEndpoint>

      <h2>Ruoli Utente</h2>
      <table>
        <thead>
          <tr>
            <th>Ruolo</th>
            <th>Descrizione</th>
            <th>Permessi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ADMIN</code></td>
            <td>Amministratore</td>
            <td>Accesso completo a tutte le funzionalità</td>
          </tr>
          <tr>
            <td><code>CUSTOMER_SERVICE</code></td>
            <td>Servizio Clienti</td>
            <td>Gestione prenotazioni e clienti</td>
          </tr>
          <tr>
            <td><code>TECHNICIAN</code></td>
            <td>Tecnico</td>
            <td>Visualizzazione delle proprie prenotazioni</td>
          </tr>
        </tbody>
      </table>

      <h2>Controlli di Autorizzazione</h2>
      <ul>
        <li><strong>GET /api/users</strong>: Solo ADMIN</li>
        <li><strong>PUT /api/users/[id]</strong>: Proprio profilo o ADMIN</li>
        <li><strong>DELETE /api/users/[id]</strong>: Solo ADMIN</li>
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
            <td>Dati non validi (email già in uso, ruolo non valido)</td>
          </tr>
          <tr>
            <td><code>401</code></td>
            <td>Non autenticato</td>
          </tr>
          <tr>
            <td><code>403</code></td>
            <td>Non autorizzato (permessi insufficienti)</td>
          </tr>
          <tr>
            <td><code>404</code></td>
            <td>Utente non trovato</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}