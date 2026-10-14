import { useEffect, useState } from 'react';
import { clockInfo } from './clock.js';

/** Informations d'horloge rafraîchies toutes les 15 s et à chaque recalage. */
export function useClock() {
  const [info, setInfo] = useState(clockInfo);
  useEffect(() => {
    const tick = () => setInfo(clockInfo());
    const timer = setInterval(tick, 15000);
    window.addEventListener('gs-clock', tick);
    return () => { clearInterval(timer); window.removeEventListener('gs-clock', tick); };
  }, []);
  return info;
}
