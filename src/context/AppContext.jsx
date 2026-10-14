import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadData, loadOutbox, saveData, saveOutbox, sha256, uid } from '../lib/db.js';
import { syncNow } from '../lib/sync.js';
import { now as clockNow } from '../lib/clock.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const readJSON = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; }
};
const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function AppProvider({ children }) {
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [rejected, setRejected] = useState([]);
  const [user, setUser] = useState(() => readJSON('gs-session'));
  const dataRef = useRef(null);
  const userRef = useRef(user);
  userRef.current = user;

  /** Met à jour le profil connecté (coordonnées, préférences) dans la session locale. */
  const updateUser = useCallback((patch) => {
    const u = { ...userRef.current, ...patch };
    localStorage.setItem('gs-session', JSON.stringify(u));
    const cached = readJSON(`gs-cred-${u.matricule}`);
    if (cached) localStorage.setItem(`gs-cred-${u.matricule}`, JSON.stringify({ ...cached, user: u }));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('gs-session');
    setUser(null);
    setSessionExpired(false);
  }, []);

  /** Met à jour le profil local (ex. client agréé entre-temps) ; déconnecte si le compte est désactivé. */
  const refreshMe = useCallback(async () => {
    const u = userRef.current;
    if (!u?.token) return;
    try {
      const r = await fetch('/api/me', { headers: { Authorization: `Bearer ${u.token}` } });
      if (r.status === 403) return logout();
      if (!r.ok) return;
      const fresh = { ...u, ...(await r.json()) };
      if (JSON.stringify(fresh) !== JSON.stringify(u)) {
        localStorage.setItem('gs-session', JSON.stringify(fresh));
        const cached = readJSON(`gs-cred-${u.matricule}`);
        if (cached) localStorage.setItem(`gs-cred-${u.matricule}`, JSON.stringify({ ...cached, user: fresh }));
        setUser(fresh);
      }
    } catch { /* hors connexion */ }
  }, [logout]);

  const sync = useCallback(async () => {
    if (!navigator.onLine || !dataRef.current) return;
    setSyncing(true);
    try {
      const r = await syncNow(userRef.current?.token);
      dataRef.current = r.data;
      setData({ ...r.data });
      setPending(r.pending);
      if (r.reasons.length) setRejected((prev) => [...prev, ...r.reasons]);
      setSessionExpired(false);
      refreshMe();
    } catch (e) {
      if (e.status === 401) setSessionExpired(true);
      else if (e.status === 403) logout();
      else console.warn('Synchronisation reportée :', e.message);
    } finally {
      setSyncing(false);
    }
  }, [refreshMe, logout]);

  useEffect(() => {
    loadData().then((d) => { dataRef.current = d; setData(d); sync(); });
    loadOutbox().then((o) => setPending(o.length));
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const timer = setInterval(sync, 30000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(timer);
    };
  }, [sync]);

  const queue = useRef(Promise.resolve());
  const doUpsert = useCallback(async (collection, values) => {
    const list = dataRef.current[collection];
    const now = clockNow(); // heure GMT de confiance (voir lib/clock.js)
    const existing = values.id ? list.find((x) => x.id === values.id) : null;
    const record = existing
      ? { ...existing, ...values, updatedAt: now }
      : { id: uid(), createdAt: now, updatedAt: now, ...values };
    if (existing) list[list.indexOf(existing)] = record; else list.push(record);
    await saveData(dataRef.current);
    const outbox = await loadOutbox();
    outbox.push({ collection, record });
    await saveOutbox(outbox);
    setData({ ...dataRef.current });
    setPending(outbox.length);
    sync();
    return record;
  }, [sync]);
  // File d'attente : des saisies simultanées (ex. « Féliciter tout le monde ») sont écrites l'une après l'autre, sans s'écraser.
  const upsert = useCallback((collection, values) => (queue.current = queue.current.catch(() => {}).then(() => doUpsert(collection, values))), [doUpsert]);

  const remove = useCallback((collection, id, justification) =>
    upsert(collection, { id, deleted: true, justification }), [upsert]);

  const startSession = useCallback(async (matricule, password, u) => {
    const hash = await sha256(`${matricule}:${password}`);
    localStorage.setItem(`gs-cred-${matricule}`, JSON.stringify({ hash, user: u }));
    localStorage.setItem('gs-session', JSON.stringify(u));
    setSessionExpired(false);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (matricule, password) => {
    let res;
    try {
      res = await post('/api/login', { matricule, password });
    } catch {
      // Hors connexion : seul un compte déjà connecté sur cet appareil est accepté.
      const key = [matricule, matricule.toLowerCase()].find((k) => readJSON(`gs-cred-${k}`));
      const cached = key && readJSON(`gs-cred-${key}`);
      if (cached?.hash === (await sha256(`${key}:${password}`))) {
        localStorage.setItem('gs-session', JSON.stringify(cached.user));
        setUser(cached.user);
        return cached.user;
      }
      throw new Error('Première connexion : une connexion Internet est nécessaire.');
    }
    if (res.status === 403) throw new Error('Ce compte est désactivé. Contactez l\'administration.');
    if (!res.ok) throw new Error('Identifiant ou mot de passe incorrect.');
    const u = await res.json();
    return startSession(u.matricule, password, u);
  }, [startSession]);

  const register = useCallback(async (form) => {
    let res;
    try { res = await post('/api/register', form); } catch { throw new Error('Une connexion Internet est nécessaire pour créer un compte.'); }
    if (res.status === 409) throw new Error('Un compte existe déjà avec cet e-mail.');
    if (!res.ok) throw new Error('Informations invalides (mot de passe de 6 caractères minimum).');
    const u = await res.json();
    return startSession(u.matricule, form.password, u);
  }, [startSession]);

  const value = useMemo(() => {
    const live = (c) => (data?.[c] || []).filter((x) => !x.deleted);
    return {
      data, live, online, pending, syncing, user, sessionExpired, rejected, updateUser,
      dismissRejected: () => setRejected([]), upsert, remove, login, register, logout, sync
    };
  }, [data, online, pending, syncing, user, sessionExpired, rejected, updateUser, upsert, remove, login, register, logout, sync]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
