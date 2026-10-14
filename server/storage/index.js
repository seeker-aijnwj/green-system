// Choix du stockage par variable d'environnement : STORAGE=json | postgres | firebase
const kind = process.env.STORAGE || 'json';
if (!['json', 'postgres', 'firebase'].includes(kind)) throw new Error(`STORAGE inconnu : ${kind}`);
const storage = (await import(`./${kind}.js`)).default();
export default storage;
