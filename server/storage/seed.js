import crypto from 'node:crypto';

export const COLLECTIONS = ['cooperatives', 'producers', 'employees', 'supplies', 'products', 'orders', 'messages', 'movements', 'stocks', 'kudos', 'notifications'];
export const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
export const newCredentials = (pw) => {
  const salt = crypto.randomBytes(8).toString('hex');
  return { salt, hash: hashPw(pw, salt) };
};

const COOPS = [
  ['coop-1', 'Coopérative de Daloa', 'Haut-Sassandra', 'Daloa'],
  ['coop-2', 'Coopérative de Soubré', 'Nawa', 'Soubré'],
  ['coop-3', 'Coopérative de Man', 'Tonkpi', 'Man'],
  ['coop-4', 'Coopérative de Gagnoa', 'Gôh', 'Gagnoa'],
  ['coop-5', "Coopérative d'Abengourou", 'Indénié-Djuablin', 'Abengourou'],
  ['coop-6', 'Coopérative de Vavoua', 'Haut-Sassandra', 'Vavoua']
];
const NAMES = ['Kouassi Brou', 'Adjoua Konan', 'Ibrahim Ouattara', 'Fatou Diabaté', "Yao N'Guessan", 'Aya Kouamé', 'Séry Gnagne', 'Mariam Coulibaly', 'Kobenan Aka', 'Awa Sangaré', 'Zadi Bi', 'Nadège Tano'];

/** Données et comptes FICTIFS de démonstration. Désactivables avec SEED_DEMO=false. */
export function seedData() {
  if (process.env.SEED_DEMO === 'false') return { users: [], records: [] };
  const t = Date.now();
  const day = (n) => new Date(t - n * 864e5).toISOString().slice(0, 10);
  const r = (collection, rec) => ({ collection, record: { createdAt: t, updatedAt: t, serverAt: t, ...rec } });
  const user = (matricule, pw, role, extra = {}) => ({
    matricule, role, active: true, approved: false, cooperativeId: null, company: null, email: null, phone: null, notify: { email: false, sms: false }, ...extra, ...newCredentials(pw)
  });
  let x = 7; // générateur pseudo-aléatoire déterministe : mêmes données à chaque démarrage
  const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;

  const records = [];
  const totals = { 'prod-cacao': 0, 'prod-cafe': 0 };
  COOPS.forEach(([id, name, region, department], k) => {
    records.push(r('cooperatives', { id, name, region, department }));
    if (k === 0) {
      [['p-1', 'Kouassi Brou', '0102030405'], ['p-2', 'Adjoua Konan', '0506070809'], ['p-3', 'Ibrahim Ouattara', '0708091011']].forEach(([pid, n, ph]) =>
        records.push(r('producers', { id: pid, name: n, phone: ph, cooperativeId: id, validated: true })));
      records.push(r('producers', { id: 'p-4', name: 'Fatou Diabaté', phone: '0102030406', cooperativeId: id, validated: false }));
      records.push(r('employees', { id: 'e-1', name: 'Koffi Yao', phone: '0101010101', cooperativeId: id, validated: true }));
      records.push(r('employees', { id: 'e-2', name: 'Nathalie Aka', phone: '0202020202', cooperativeId: id, validated: false }));
      [['s-1', 'p-1', 'prod-cacao', 420, 0], ['s-2', 'p-2', 'prod-cacao', 310, 1], ['s-3', 'p-3', 'prod-cafe', 150, 1], ['s-4', 'p-1', 'prod-cacao', 380, 3], ['s-5', 'p-2', 'prod-cafe', 200, 4]]
        .forEach(([sid, pid, prod, w, d]) => records.push(r('supplies', { id: sid, producerId: pid, productId: prod, weightKg: w, stockedKg: w, date: day(d), cooperativeId: id, recordedBy: 'GEST-001' })));
    } else {
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const pid = `${id}-p${i}`;
        records.push(r('producers', { id: pid, name: NAMES[(k * 3 + i) % NAMES.length], phone: `07${String(10000000 + k * 1111111 + i * 7777).slice(0, 8)}`, cooperativeId: id, validated: true }));
        for (let d = 0; d < 10; d++) {
          if (rnd() > 0.3 + 0.07 * (k % 4)) continue;
          const w = Math.round((80 + rnd() * 320) / 10) * 10;
          records.push(r('supplies', { id: `${id}-s${d}-${i}`, producerId: pid, productId: rnd() < 0.7 ? 'prod-cacao' : 'prod-cafe', weightKg: w, stockedKg: w, date: day(d), cooperativeId: id, recordedBy: `GEST-00${k + 1}` }));
        }
      }
    }
    // Stock initial de la coopérative (les approvisionnements ci-dessus y sont déjà inclus : stockedKg = poids).
    for (const p of Object.keys(totals)) {
      const base = k === 0 ? (p === 'prod-cacao' ? 8000 : 3000) : Math.round((p === 'prod-cacao' ? 1500 + rnd() * 3000 : 500 + rnd() * 1500) / 50) * 50;
      totals[p] += base;
      records.push(r('stocks', { id: `${id}__${p}`, cooperativeId: id, productId: p, stockKg: base }));
    }
  });
  // Le stock d'un produit est la somme des stocks des coopératives (tenu à jour par le serveur).
  records.push(r('products', { id: 'prod-cacao', name: 'Cacao', description: 'Fèves de cacao fermentées et séchées', stockKg: totals['prod-cacao'] }));
  records.push(r('products', { id: 'prod-cafe', name: 'Café', description: 'Café robusta trié', stockKg: totals['prod-cafe'] }));
  records.push(r('orders', { id: 'o-1', clientId: 'achats@cocoatrade.test', company: 'CocoaTrade International', productId: 'prod-cacao', quantityKg: 5000, note: "Livraison port d'Abidjan", status: 'nouveau', price: null, allocations: [], participants: [] }));
  // Commande en négociation : l'agent a déjà proposé une répartition entre deux coopératives.
  records.push(r('orders', { id: 'o-2', clientId: 'achats@cocoatrade.test', company: 'CocoaTrade International', productId: 'prod-cafe', quantityKg: 1200, status: 'en négociation', price: 1100, updatedBy: 'AGT-001', allocations: [{ cooperativeId: 'coop-1', quantityKg: 500 }, { cooperativeId: 'coop-4', quantityKg: 700 }], participants: ['coop-1', 'coop-4'], confirmations: { 'coop-4': { status: 'accepted', quantityKg: 700, reason: '', at: t - 864e5, by: 'GEST-004' } } }));
  // Ventes déjà validées, livrées ensemble (les stocks de départ en tiennent déjà compte).
  const sold = (id, productId, price, allocations, ago) => r('orders', {
    id, clientId: 'achats@cocoatrade.test', company: 'CocoaTrade International', productId, quantityKg: allocations.reduce((a, x) => a + x.quantityKg, 0),
    status: 'validée', price, allocations, stockApplied: true, stockAllocations: allocations, participants: allocations.map((x) => x.cooperativeId),
    confirmations: Object.fromEntries(allocations.map((x) => [x.cooperativeId, { status: 'accepted', quantityKg: x.quantityKg, reason: '', at: t - (ago + 1) * 864e5, by: 'système' }])),
    createdAt: t - (ago + 2) * 864e5, validatedAt: t - ago * 864e5
  });
  records.push(sold('o-3', 'prod-cacao', 1300, [{ cooperativeId: 'coop-1', quantityKg: 1000 }, { cooperativeId: 'coop-2', quantityKg: 1200 }, { cooperativeId: 'coop-3', quantityKg: 800 }], 3));
  records.push(sold('o-4', 'prod-cafe', 1050, [{ cooperativeId: 'coop-4', quantityKg: 500 }, { cooperativeId: 'coop-5', quantityKg: 400 }], 5));

  // Quelques messages d'entraide de démonstration.
  const cheer = (id, from, to, kind, message, orderId, ago) => r('kudos', { id, fromCooperativeId: from, toCooperativeId: to, kind, message, orderId, createdAt: t - ago * 864e5, updatedAt: t - ago * 864e5 });
  records.push(cheer('k-1', 'coop-2', 'coop-1', 'felicitations', 'Bravo pour votre belle contribution à cette livraison !', 'o-3', 2));
  records.push(cheer('k-2', 'coop-3', 'coop-2', 'felicitations', 'Merci pour votre sérieux, c\'est un plaisir de livrer avec vous.', 'o-3', 2));
  records.push(cheer('k-3', 'coop-1', 'coop-6', 'encouragement', 'Courage, vous êtes sur la bonne voie : on continue ensemble !', null, 1));

  return {
    users: [
      user('ADM-001', 'admin123', 'administrateur', { name: 'Awa Koné', email: 'awa.kone@uscaep.test', phone: '+2250700000001', notify: { email: true, sms: false } }),
      user('GEST-001', 'gestion123', 'gestionnaire', { name: 'Yao Kouadio', cooperativeId: 'coop-1', email: 'yao.kouadio@uscaep.test', phone: '+2250102030405', notify: { email: true, sms: true } }),
      user('GEST-002', 'gestion123', 'gestionnaire', { name: 'Mariam Traoré', cooperativeId: 'coop-2', email: 'mariam.traore@uscaep.test', phone: '+2250506070809', notify: { email: false, sms: false } }),
      user('AGT-001', 'agent123', 'agent', { name: 'Serge Bamba', email: 'serge.bamba@uscaep.test', phone: '+2250700000002', notify: { email: true, sms: false } }),
      user('achats@cocoatrade.test', 'client123', 'client', { name: 'Julie Martin', company: 'CocoaTrade International', approved: true, email: 'achats@cocoatrade.test', notify: { email: true, sms: false } }),
      user('contact@choco-nord.test', 'client123', 'client', { name: 'Lars Nilsson', company: 'Choco Nord SA', approved: false, email: 'contact@choco-nord.test', notify: { email: true, sms: false } })
    ],
    records
  };
}
