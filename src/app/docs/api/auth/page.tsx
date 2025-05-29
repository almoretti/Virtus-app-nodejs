import { ApiEndpoint, ApiParam } from "@/components/docs/api-reference"
import { CodeBlock } from "@/components/docs/code-block"

export default function AuthApiPage() {
  return (
    <>
      <h1>API Autenticazione</h1>
      <p className="lead">
        Gestione dell'autenticazione e delle sessioni utente.
      </p>

      <h2>Panoramica</h2>
      <p>
        Il sistema supporta due metodi di autenticazione:
      </p>
      <ul>
        <li><strong>Autenticazione di Sessione</strong>: Via NextAuth.js con Google OAuth (per l'interfaccia web)</li>
        <li><strong>Bearer Token</strong>: Token API per accesso programmatico</li>
      </ul>

      <h2>Autenticazione Bearer Token</h2>
      <p>
        Per l'accesso programmatico alle API, utilizza i token Bearer. I token devono essere creati 
        dall'interfaccia amministratore e inclusi nell'header Authorization di ogni richiesta.
      </p>

      <h3>Formato Header</h3>
      <CodeBlock language="http">{`Authorization: Bearer vb_your_token_here`}</CodeBlock>

      <h3>Esempio cURL</h3>
      <CodeBlock language="bash">{`curl -H "Authorization: Bearer vb_your_token_here" \\
     https://tuodominio.com/api/bookings`}</CodeBlock>

      <h3>Esempio JavaScript</h3>
      <CodeBlock language="javascript">{`const response = await fetch('/api/bookings', {
  headers: {
    'Authorization': 'Bearer vb_your_token_here',
    'Content-Type': 'application/json'
  }
});`}</CodeBlock>

      <h2>Scopi e Permessi</h2>
      <p>I token API supportano tre livelli di permessi:</p>
      <table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Descrizione</th>
            <th>Operazioni Permesse</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>read</code></td>
            <td>Lettura</td>
            <td>GET per prenotazioni, disponibilità, utenti, tecnici</td>
          </tr>
          <tr>
            <td><code>write</code></td>
            <td>Scrittura</td>
            <td>POST, PUT, PATCH per prenotazioni e dati correlati</td>
          </tr>
          <tr>
            <td><code>admin</code></td>
            <td>Amministrazione</td>
            <td>Tutte le operazioni incluse gestione utenti e inviti</td>
          </tr>
        </tbody>
      </table>

      <h2>Endpoints NextAuth</h2>

      <ApiEndpoint 
        method="GET" 
        path="/api/auth/session"
        description="Recupera le informazioni della sessione corrente dell'utente autenticato."
      >
        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`{
  "user": {
    "id": "clx123...",
    "name": "Mario Rossi",
    "email": "mario.rossi@email.com",
    "image": "https://lh3.googleusercontent.com/...",
    "role": "CUSTOMER_SERVICE"
  },
  "expires": "2025-02-15T10:30:00.000Z"
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="GET" 
        path="/api/auth/signin"
        description="Reindirizza alla pagina di accesso con Google OAuth."
      />

      <ApiEndpoint 
        method="POST" 
        path="/api/auth/signout"
        description="Termina la sessione dell'utente corrente."
      />

      <h2>Ruoli Utente</h2>
      <p>Il sistema supporta tre ruoli utente:</p>
      <ul>
        <li><strong>ADMIN</strong>: Accesso completo a tutte le funzionalità</li>
        <li><strong>CUSTOMER_SERVICE</strong>: Gestione prenotazioni e clienti</li>
        <li><strong>TECHNICIAN</strong>: Visualizzazione delle proprie prenotazioni</li>
      </ul>

      <h2>Controllo Accessi</h2>
      <p>
        Tutte le API verificano la presenza di una sessione valida. Alcuni endpoint 
        richiedono ruoli specifici:
      </p>
      <ul>
        <li>Gestione utenti e tecnici: solo ADMIN</li>
        <li>Creazione prenotazioni: ADMIN e CUSTOMER_SERVICE</li>
        <li>Visualizzazione prenotazioni: tutti gli utenti autenticati</li>
      </ul>
    </>
  )
}