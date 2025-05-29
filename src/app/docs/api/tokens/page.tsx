import { ApiEndpoint, ApiParam } from "@/components/docs/api-reference"
import { CodeBlock } from "@/components/docs/code-block"

export default function TokensApiPage() {
  return (
    <>
      <h1>API Gestione Token</h1>
      <p className="lead">
        Gestione dei token API per l'accesso programmatico. Solo per amministratori.
      </p>

      <h2>Endpoints</h2>

      <ApiEndpoint 
        method="GET" 
        path="/api/tokens"
        description="Recupera tutti i token API dell'utente corrente. Solo per amministratori."
      >
        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`[
  {
    "id": "clx123...",
    "name": "Integrazione CRM",
    "token": "vb_abc123...", 
    "expiresAt": "2025-06-15T10:30:00.000Z",
    "lastUsedAt": "2025-01-15T09:20:00.000Z",
    "isActive": true,
    "scopes": ["read", "write"],
    "createdAt": "2025-01-01T10:00:00.000Z",
    "updatedAt": "2025-01-01T10:00:00.000Z"
  }
]`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="POST" 
        path="/api/tokens"
        description="Crea un nuovo token API. Solo per amministratori."
      >
        <h4>Request Body</h4>
        <ApiParam 
          name="name" 
          type="string" 
          required
          description="Nome descrittivo per il token" 
        />
        <ApiParam 
          name="expiresAt" 
          type="string" 
          description="Data di scadenza (ISO 8601), null per nessuna scadenza" 
        />
        <ApiParam 
          name="scopes" 
          type="string[]" 
          description="Array dei permessi: ['read', 'write', 'admin']" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "name": "Integrazione Dashboard",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "scopes": ["read", "write"]
}`}</CodeBlock>

        <h4>Esempio Risposta</h4>
        <CodeBlock language="json">{`{
  "id": "clx456...",
  "name": "Integrazione Dashboard",
  "token": "vb_def456789abcdef123456789abcdef123456789abcdef123456789abcdef12",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "scopes": ["read", "write"],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "message": "Token API creato con successo. Salvalo in un posto sicuro - non potrai vederlo di nuovo."
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="PATCH" 
        path="/api/tokens/[id]"
        description="Attiva o disattiva un token API esistente."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID del token da aggiornare" 
        />

        <h4>Request Body</h4>
        <ApiParam 
          name="isActive" 
          type="boolean" 
          required
          description="Stato di attivazione del token" 
        />

        <h4>Esempio Request</h4>
        <CodeBlock language="json">{`{
  "isActive": false
}`}</CodeBlock>
      </ApiEndpoint>

      <ApiEndpoint 
        method="DELETE" 
        path="/api/tokens/[id]"
        description="Elimina definitivamente un token API."
      >
        <h4>Path Parameters</h4>
        <ApiParam 
          name="id" 
          type="string" 
          required
          description="ID del token da eliminare" 
        />
      </ApiEndpoint>

      <h2>Sicurezza dei Token</h2>
      <ul>
        <li><strong>Generazione Sicura</strong>: I token sono generati usando 32 bytes di entropia crittografica</li>
        <li><strong>Prefisso Identificativo</strong>: Tutti i token iniziano con "vb_" per identificazione</li>
        <li><strong>Visibilità Limitata</strong>: Il token completo è visibile solo al momento della creazione</li>
        <li><strong>Tracking Utilizzo</strong>: Ogni utilizzo del token aggiorna il timestamp "lastUsedAt"</li>
        <li><strong>Scadenza Opzionale</strong>: I token possono avere una data di scadenza</li>
        <li><strong>Disattivazione</strong>: I token possono essere temporaneamente disattivati</li>
      </ul>

      <h2>Best Practices</h2>
      <ul>
        <li>Usa nomi descrittivi per identificare facilmente i token</li>
        <li>Imposta date di scadenza appropriate per token temporanei</li>
        <li>Concedi solo i permessi minimi necessari (principio del privilegio minimo)</li>
        <li>Monitora regolarmente l'uso dei token tramite "lastUsedAt"</li>
        <li>Elimina token non utilizzati o compromessi</li>
        <li>Non condividere mai i token in codice pubblico o log</li>
      </ul>

      <h2>Esempi di Utilizzo</h2>
      <h3>Token Solo Lettura</h3>
      <p>Ideale per dashboard e sistemi di monitoraggio:</p>
      <CodeBlock language="json">{`{
  "name": "Dashboard Analytics",
  "scopes": ["read"]
}`}</CodeBlock>

      <h3>Token Integrazione Completa</h3>
      <p>Per sistemi che devono creare e modificare prenotazioni:</p>
      <CodeBlock language="json">{`{
  "name": "Sistema CRM",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "scopes": ["read", "write"]
}`}</CodeBlock>

      <h3>Token Amministrativo</h3>
      <p>Per script di manutenzione e automazione (usa con cautela):</p>
      <CodeBlock language="json">{`{
  "name": "Script Backup Automatico",
  "expiresAt": "2025-06-30T23:59:59.000Z",
  "scopes": ["admin"]
}`}</CodeBlock>

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
            <td>Dati non validi (nome vuoto, scopi non validi)</td>
          </tr>
          <tr>
            <td><code>401</code></td>
            <td>Token non valido o scaduto</td>
          </tr>
          <tr>
            <td><code>403</code></td>
            <td>Non autorizzato (solo admin) o permessi insufficienti</td>
          </tr>
          <tr>
            <td><code>404</code></td>
            <td>Token non trovato</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}