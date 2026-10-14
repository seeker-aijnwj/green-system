import { useEffect, useState } from 'react';

const KEY = 'gs-notify-status';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

/** Canaux de rappel activés sur le serveur ({ email, sms, afterHours… } ou null si inconnu / hors-ligne). */
export function useNotifyStatus(token) {
  const [status, setStatus] = useState(read);
  useEffect(() => {
    if (!token) return;
    fetch('/api/notify/status', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* plein */ } setStatus(d); } })
      .catch(() => {});
  }, [token]);
  return status;
}
