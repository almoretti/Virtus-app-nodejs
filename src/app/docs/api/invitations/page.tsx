import { ApiEndpoint, ApiParam } from "@/components/docs/api-reference"
import { CodeBlock } from "@/components/docs/code-block"

export default function InvitationsApiPage() {
  return (
    <>
      <h1>API Inviti Utente</h1>
      <p className="lead">
        Gestione degli inviti per nuovi utenti. Solo per amministratori.
      </p>

      <h2>Endpoints</h2>

      <ApiEndpoint 
        method="POST" 
        path="/api/invitations"
        description="Invia un invito via email a un nuovo utente. Solo per amministratori."
      >
        <h4>Request Body</h4>
        <ApiParam 
          name="email" 
          type="string" 
          required
          description="Email del nuovo utente da invitare" 
        />
        <ApiParam 
          name="role" 
          type="string" 
          required
          description="Ruolo da assegnare: ADMIN, CUSTOMER_SERVICE, TECHNICIAN" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "email": "nuovo.utente@email.com",
  "role": "CUSTOMER_SERVICE"
}`}</CodeBlock>

        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`{
  "id": "clx123...",
  "email": "nuovo.utente@email.com",
  "role": "CUSTOMER_SERVICE",
  "token": "abc123...",
  "expiresAt": "2025-01-17T10:30:00.000Z",
  "createdAt": "2025-01-10T10:30:00.000Z",
  "used": false
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="GET" 
        path="/api/invitations/validate"
        description="Valida un token di invito e recupera le informazioni dell'invito."
      >
        <h4>Query Parameters</h4>
        <ApiParam 
          name="token" 
          type="string" 
          required
          description="Token di invito ricevuto via email" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="bash">{`GET /api/invitations/validate?token=abc123...`}</CodeBlock>

        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`{
  "email": "nuovo.utente@email.com",
  "role": "CUSTOMER_SERVICE",
  "valid": true
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="POST" 
        path="/api/invitations/accept"
        description="Accetta un invito e completa la registrazione dell'utente."
      >
        <h4>Request Body</h4>
        <ApiParam 
          name="token" 
          type="string" 
          required
          description="Token di invito" 
        />
        <ApiParam 
          name="name" 
          type="string" 
          required
          description="Nome completo dell'utente" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "token": "abc123...",
  "name": "Mario Rossi"
}`}</CodeBlock>

        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`{
  "user": {
    "id": "clx456...",
    "name": "Mario Rossi",
    "email": "nuovo.utente@email.com",
    "role": "CUSTOMER_SERVICE"
  },
  "message": "Registrazione completata con successo"
}`}</CodeBlock>
      </ApiEndpoint>

      <h2>Flusso di Invito</h2>
      <ol>
        <li><strong>Invio</strong>: L'admin invia un invito tramite <code>POST /api/invitations</code></li>
        <li><strong>Email</strong>: Il sistema invia un'email con un link contenente il token</li>
        <li><strong>Validazione</strong>: L'utente clicca il link e il sistema valida il token</li>
        <li><strong>Registrazione</strong>: L'utente completa la registrazione tramite Google OAuth</li>
        <li><strong>Accettazione</strong>: Il sistema accetta l'invito e assegna il ruolo</li>
      </ol>

      <h2>Scadenza Inviti</h2>
      <p>
        Gli inviti hanno una validità di 7 giorni dalla creazione. Dopo questo periodo, 
        il token non è più valido e deve essere generato un nuovo invito.
      </p>

      <h2>Link di Invito</h2>
      <p>
        Il link di invito ha questo formato:
      </p>
      <CodeBlock language="text">{`https://tuodominio.com/auth/accept-invitation?token=abc123...`}</CodeBlock>

      <h2>Email Template</h2>
      <p>
        L'email di invito include:
      </p>
      <ul>
        <li>Benvenuto nel sistema Virtus Booking</li>
        <li>Ruolo assegnato</li>
        <li>Link per completare la registrazione</li>
        <li>Data di scadenza dell'invito</li>
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
            <td>Email non valida o ruolo non riconosciuto</td>
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
            <td>Token di invito non trovato</td>
          </tr>
          <tr>
            <td><code>409</code></td>
            <td>Utente con questa email esiste già</td>
          </tr>
          <tr>
            <td><code>410</code></td>
            <td>Token di invito scaduto o già utilizzato</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}