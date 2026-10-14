/** Aides à la répartition d'une commande entre coopératives. caps = { idCoopérative: stock disponible (kg) }. */
export const sumAlloc = (a) => (a || []).reduce((t, x) => t + (Number(x.quantityKg) || 0), 0);

/** Parts égales, plafonnées par le stock de chacune ; le reste est redistribué aux coopératives qui ont encore du stock. */
export function splitEqual(qty, caps) {
  const out = Object.fromEntries(Object.keys(caps).map((k) => [k, 0]));
  let rest = qty;
  let active = Object.keys(caps).filter((k) => caps[k] > 0);
  while (rest > 0 && active.length) {
    const share = Math.max(1, Math.floor(rest / active.length));
    for (const k of [...active]) {
      const give = Math.min(share, caps[k] - out[k], rest);
      out[k] += give;
      rest -= give;
      if (out[k] >= caps[k]) active = active.filter((x) => x !== k);
      if (rest <= 0) break;
    }
  }
  return out;
}

/** Parts proportionnelles au stock : plus une coopérative a de stock, plus sa part est grande (plus gros restes d'abord). */
export function splitProportional(qty, caps) {
  const ids = Object.keys(caps);
  const total = ids.reduce((t, k) => t + caps[k], 0);
  if (total <= qty) return { ...caps }; // tout le stock disponible est nécessaire
  const out = {};
  const frac = [];
  let given = 0;
  for (const k of ids) {
    const exact = (qty * caps[k]) / total;
    out[k] = Math.floor(exact);
    given += out[k];
    frac.push([k, exact - out[k]]);
  }
  for (const [k] of frac.sort((a, b) => b[1] - a[1])) {
    if (given >= qty) break;
    if (out[k] < caps[k]) { out[k] += 1; given += 1; }
  }
  return out;
}

/** Une confirmation ne vaut que pour la part vue : si la part d'une coopérative change, elle doit répondre à nouveau. */
export function reconcileConfirmations(conf, allocations) {
  return Object.fromEntries((allocations || []).filter((a) => conf?.[a.cooperativeId]?.quantityKg === a.quantityKg).map((a) => [a.cooperativeId, conf[a.cooperativeId]]));
}
export const allAccepted = (order) => (order.allocations || []).length > 0 && order.allocations.every((a) => order.confirmations?.[a.cooperativeId]?.status === 'accepted');
