import { useEffect, useState } from 'react';

const read = (p) => { try { return JSON.parse(localStorage.getItem(`gs-lb-${p}`)); } catch { return null; } };

/** Classement des coopératives : réseau en priorité, dernière version mémorisée en secours (usage hors-ligne). */
export function useLeaderboard(period = '30') {
  const [state, setState] = useState({ data: read(period), loading: true, offline: false });
  useEffect(() => {
    let off = false;
    setState({ data: read(period), loading: true, offline: false });
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('lb'))))
      .then((d) => {
        if (off) return;
        try { localStorage.setItem(`gs-lb-${period}`, JSON.stringify(d)); } catch { /* plein */ }
        setState({ data: d, loading: false, offline: false });
      })
      .catch(() => !off && setState((s) => ({ ...s, loading: false, offline: true })));
    return () => { off = true; };
  }, [period]);
  return state;
}
