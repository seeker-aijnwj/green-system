// Fournisseurs d'envoi, tous OPTIONNELS : rien n'est envoyé tant que EMAIL_PROVIDER / SMS_PROVIDER ne sont pas définis.
//   E-mail : log (console) | smtp (nodemailer : tout serveur SMTP)
//   SMS    : log (console) | twilio | africastalking | webhook (n'importe quelle passerelle locale)
const transports = new Map();

export function emailProvider() {
  const kind = process.env.EMAIL_PROVIDER || 'none';
  if (kind === 'log') return { kind, send: async (m) => console.log(`[e-mail] → ${m.to} | ${m.subject}`) };
  if (kind === 'smtp') {
    const key = `${process.env.SMTP_URL}`;
    if (!transports.has(key)) {
      transports.set(key, import('nodemailer').then((nm) => nm.default.createTransport(process.env.SMTP_URL === 'json' ? { jsonTransport: true } : process.env.SMTP_URL)));
    }
    return {
      kind,
      async send(m) {
        if (!process.env.SMTP_URL) throw new Error('SMTP_URL non défini');
        const t = await transports.get(key);
        await t.sendMail({ from: process.env.EMAIL_FROM || 'Green System <no-reply@localhost>', to: m.to, subject: m.subject, text: m.text });
      }
    };
  }
  return null;
}

const form = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();
async function post(url, init, label) {
  const res = await fetch(url, { ...init, method: 'POST', signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${label} : réponse ${res.status}`);
  return res;
}

export function smsProvider() {
  const kind = process.env.SMS_PROVIDER || 'none';
  const env = process.env;
  if (kind === 'log') return { kind, send: async (m) => console.log(`[sms] → ${m.to} | ${m.text}`) };
  if (kind === 'twilio') {
    return {
      kind,
      async send(m) {
        if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) throw new Error('configuration Twilio incomplète');
        const base = env.TWILIO_API_BASE || 'https://api.twilio.com';
        await post(`${base}/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
          headers: { Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form({ To: m.to, From: env.TWILIO_FROM, Body: m.text })
        }, 'Twilio');
      }
    };
  }
  if (kind === 'africastalking') {
    return {
      kind,
      async send(m) {
        if (!env.AT_USERNAME || !env.AT_API_KEY) throw new Error("configuration Africa's Talking incomplète");
        const base = env.AT_API_BASE || (env.AT_USERNAME === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com');
        await post(`${base}/version1/messaging`, {
          headers: { apiKey: env.AT_API_KEY, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form({ username: env.AT_USERNAME, to: m.to, message: m.text, from: env.AT_SENDER_ID })
        }, "Africa's Talking");
      }
    };
  }
  if (kind === 'webhook') {
    return {
      kind,
      async send(m) {
        if (!env.SMS_WEBHOOK_URL) throw new Error('SMS_WEBHOOK_URL non défini');
        await post(env.SMS_WEBHOOK_URL, {
          headers: { 'Content-Type': 'application/json', ...(env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.SMS_WEBHOOK_TOKEN}` } : {}) },
          body: JSON.stringify({ to: m.to, message: m.text })
        }, 'Passerelle SMS');
      }
    };
  }
  return null;
}
