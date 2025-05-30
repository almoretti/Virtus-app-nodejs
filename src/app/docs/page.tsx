export default function DocsPage() {
  return (
    <>
      <h1>Documentazione API Virtus Booking</h1>
      <p className="lead">
        Benvenuto nella documentazione delle API del sistema di prenotazione Virtus. 
        Questa guida fornisce informazioni dettagliate su come utilizzare le nostre API REST.
      </p>

      <h2>Panoramica</h2>
      <p>
        Il sistema Virtus Booking fornisce un set completo di API REST per gestire prenotazioni, 
        utenti, tecnici e disponibilità. Tutte le API richiedono autenticazione tramite sessione.
      </p>

      <h3>Base URL</h3>
      <pre className="not-prose">
        <code>{`https://virtus-app-nodejs-production.up.railway.app/api`}</code>
      </pre>

      <h3>Autenticazione</h3>
      <p>
        Tutte le richieste API richiedono una sessione autenticata. L'autenticazione avviene 
        tramite NextAuth.js con provider Google OAuth.
      </p>

      <h3>Formato Risposte</h3>
      <p>Tutte le risposte API sono in formato JSON. Le risposte di successo seguono questo formato:</p>
      <pre className="not-prose">
        <code>{`{
  "data": { ... },
  "message": "Operazione completata con successo"
}`}</code>
      </pre>

      <p>Le risposte di errore seguono questo formato:</p>
      <pre className="not-prose">
        <code>{`{
  "error": "Messaggio di errore",
  "code": "ERROR_CODE"
}`}</code>
      </pre>

      <h2>Rate Limiting</h2>
      <p>
        Le API non hanno attualmente limiti di rate, ma questo potrebbe cambiare in futuro. 
        Si consiglia di implementare retry logic con backoff esponenziale.
      </p>

      <h2>Prossimi Passi</h2>
      <ul>
        <li>Esplora la documentazione delle singole API nel menu laterale</li>
        <li>Inizia con l'endpoint di autenticazione per capire come gestire le sessioni</li>
        <li>Consulta gli esempi di codice per ogni endpoint</li>
      </ul>
    </>
  )
}