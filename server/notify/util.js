export const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim());

/** Numéro au format international. Un numéro ivoirien à 10 chiffres (0102030405) devient +2250102030405. */
export function normPhone(p) {
  let s = String(p || '').replace(/[\s.\-()]/g, '');
  if (/^0\d{9}$/.test(s)) s = `+225${s}`;
  else if (s.startsWith('00')) s = `+${s.slice(2)}`;
  return s;
}
export const validPhone = (p) => /^\+[1-9]\d{7,14}$/.test(normPhone(p));

export const maskEmail = (e = '') => { const [u, d] = String(e).split('@'); return d ? `${u[0] || ''}***@${d}` : '***'; };
export const maskPhone = (p = '') => (String(p).length > 6 ? `${p.slice(0, 4)}****${p.slice(-2)}` : '****');

/** Heures « calmes » (GMT) pendant lesquelles aucun rappel n'est envoyé. spec = '20-7' (de 20 h à 7 h) ou 'off'. */
export function inQuiet(hour, spec = '20-7') {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(String(spec).trim());
  if (!m) return false;
  const [start, end] = [Number(m[1]), Number(m[2])];
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

// Un SMS reste en alphabet GSM (160 caractères par message) tant qu'il ne contient que ces caractères ;
// un seul caractère hors liste (ê, œ, espace insécable des nombres français…) le fait passer à 70 caractères par message.
const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€";
const MAP = { ê: 'e', ë: 'e', â: 'a', î: 'i', ï: 'i', ô: 'o', û: 'u', œ: 'oe', Œ: 'OE', À: 'A', È: 'E', Ê: 'E', Ù: 'U', Ô: 'O', Î: 'I', Â: 'A', Ï: 'I', Û: 'U', '’': "'", '‘': "'", '«': '"', '»': '"', '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', '\u00a0': ' ', '\u202f': ' ' };
export function gsmSafe(text) {
  return [...String(text)].map((c) => {
    if (MAP[c] !== undefined) return MAP[c];
    if (GSM.includes(c)) return c;
    return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?');
  }).join('');
}
