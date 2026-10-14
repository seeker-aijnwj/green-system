import { now } from './clock.js';

export const KINDS = { felicitations: 'Félicitations', encouragement: 'Encouragement' };
export const PRESETS = {
  felicitations: [
    'Bravo pour votre belle contribution à cette livraison !',
    'Félicitations pour votre place au classement !',
    "Merci pour votre sérieux, c'est un plaisir de livrer avec vous."
  ],
  encouragement: [
    'Courage, vous êtes sur la bonne voie : on continue ensemble !',
    'Belle progression, continuez comme ça !',
    "Chaque kilo compte pour l'union : on compte sur vous !"
  ]
};

const key = (coopId) => `gs-cheers-seen-${coopId}`;
const read = (coopId) => { try { return Number(localStorage.getItem(key(coopId))) || 0; } catch { return 0; } };
export const seenAt = read;
export const markSeen = (coopId) => { try { localStorage.setItem(key(coopId), String(now())); } catch { /* stockage indisponible */ } };
export const unreadFor = (kudos, coopId) => kudos.filter((k) => k.toCooperativeId === coopId && k.createdAt > read(coopId)).length;
