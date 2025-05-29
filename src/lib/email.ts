import * as brevo from '@getbrevo/brevo'

// Initialize the Brevo API instance
const apiInstance = new brevo.TransactionalEmailsApi()

// Set the API key
const apiKey = process.env.BREVO_API_KEY
if (!apiKey) {
  console.error('BREVO_API_KEY is not set in environment variables')
  throw new Error('BREVO_API_KEY is not configured')
}

console.log('Using Brevo API key:', apiKey.substring(0, 10) + '...')

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  apiKey
)

interface SendInvitationEmailParams {
  to: string
  inviterName: string
  invitationLink: string
  role: string
  expiresAt: Date
}

export async function sendInvitationEmail({
  to,
  inviterName,
  invitationLink,
  role,
  expiresAt,
}: SendInvitationEmailParams) {
  try {
    // Translate role to Italian
    const roleInItalian = 
      role === 'ADMIN' ? 'Amministratore' :
      role === 'TECHNICIAN' ? 'Tecnico' :
      'Servizio Clienti'

    // Format expiration date in Italian
    const expirationDate = new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(expiresAt)

    const sendSmtpEmail = new brevo.SendSmtpEmail()

    sendSmtpEmail.subject = "Invito al Sistema di Prenotazione Virtus"
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #1a1a1a;
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            background-color: #3b82f6;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .info-box {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sistema di Prenotazione Virtus</h1>
        </div>
        <div class="content">
          <h2>Benvenuto!</h2>
          <p>Ciao,</p>
          <p>${inviterName} ti ha invitato a unirti al Sistema di Prenotazione Virtus con il ruolo di <strong>${roleInItalian}</strong>.</p>
          
          <div class="info-box">
            <p><strong>Dettagli dell'invito:</strong></p>
            <ul>
              <li>Email: ${to}</li>
              <li>Ruolo: ${roleInItalian}</li>
              <li>Scadenza invito: ${expirationDate}</li>
            </ul>
          </div>

          <p>Per accettare l'invito e completare la registrazione, clicca sul pulsante qui sotto:</p>
          
          <div style="text-align: center;">
            <a href="${invitationLink}" class="button">Accetta Invito</a>
          </div>

          <p><strong>Importante:</strong> Assicurati di utilizzare l'indirizzo email <em>${to}</em> quando accedi con Google.</p>

          <p>Se non riesci a cliccare sul pulsante, copia e incolla questo link nel tuo browser:</p>
          <p style="word-break: break-all; color: #3b82f6;">${invitationLink}</p>

          <div class="footer">
            <p>Questo invito scadrà il ${expirationDate}.</p>
            <p>Se non hai richiesto questo invito, puoi ignorare questa email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    sendSmtpEmail.sender = {
      name: "Sistema Virtus",
      email: "alessandro@moretti.cc"
    }
    
    sendSmtpEmail.to = [
      {
        email: to,
      }
    ]

    sendSmtpEmail.replyTo = {
      email: "alessandro@moretti.cc"
    }

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
    console.log('Email sent successfully:', result.response)
    return true
  } catch (error: any) {
    console.error('Error sending email:', error)
    if (error.statusCode === 401) {
      console.error('Authentication failed. Please check your Brevo API key.')
      console.error('Current API key starts with:', process.env.BREVO_API_KEY?.substring(0, 10))
    }
    if (error.body) {
      console.error('Error details:', error.body)
    }
    throw error
  }
}

// Test email functionality
export async function sendTestEmail(to: string) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail()

    sendSmtpEmail.subject = "Test Email - Sistema Virtus"
    sendSmtpEmail.htmlContent = `
      <h1>Test Email</h1>
      <p>Questa è un'email di test dal Sistema di Prenotazione Virtus.</p>
      <p>Se ricevi questa email, la configurazione di Brevo è corretta!</p>
    `
    sendSmtpEmail.sender = {
      name: "Sistema Virtus Test",
      email: "alessandro@moretti.cc"
    }
    sendSmtpEmail.to = [
      {
        email: to,
      }
    ]

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail)
    console.log('Test email sent successfully:', result.response)
    return true
  } catch (error) {
    console.error('Error sending test email:', error)
    throw error
  }
}