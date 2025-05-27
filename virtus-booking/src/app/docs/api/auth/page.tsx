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
        Il sistema utilizza NextAuth.js per la gestione dell'autenticazione. 
        L'autenticazione avviene tramite Google OAuth e le sessioni sono gestite automaticamente.
      </p>

      <h2>Endpoints</h2>

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