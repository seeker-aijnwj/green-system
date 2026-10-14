// Modèles de messages (e-mail : sujet + texte ; SMS : une phrase courte, normalisée en GSM à l'envoi).
const APP = () => (process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
const n = (v) => Number(v).toLocaleString('fr-FR');
const dateGMT = (ms) => new Date(ms).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
const sign = '\n\nGreen System · USCAEP';
const hello = (c) => `Bonjour${c.name ? ` ${c.name}` : ''},`;

export const MESSAGES = {
  'share.proposed': (c) => ({
    subject: `Une part de ${n(c.kg)} kg de ${c.product} vous est proposée`,
    text: `${hello(c)}\n\nL'union propose à votre coopérative de livrer ${n(c.kg)} kg de ${c.product} dans le cadre d'une commande commune.\nMerci d'accepter ou de refuser cette part dans l'application : ${APP()}/espace-membre/livraisons${sign}`,
    sms: `Green System : une part de ${n(c.kg)} kg de ${c.product} vous est proposée. Répondez dans Livraisons : ${APP()}/espace-membre/livraisons`
  }),
  'share.reminder': (c) => ({
    subject: `Rappel (${c.rank}/${c.max}) : votre réponse est attendue pour ${n(c.kg)} kg de ${c.product}`,
    text: `${hello(c)}\n\nVotre réponse est toujours attendue pour la part de ${n(c.kg)} kg de ${c.product} proposée le ${dateGMT(c.proposedAt)}. Les autres coopératives comptent sur vous : la vente ne peut être validée qu'une fois toutes les parts acceptées.\nRépondez dans l'application : ${APP()}/espace-membre/livraisons${sign}`,
    sms: `Rappel Green System (${c.rank}/${c.max}) : répondez pour votre part de ${n(c.kg)} kg de ${c.product}. ${APP()}/espace-membre/livraisons`
  }),
  'share.declined': (c) => ({
    subject: `${c.coop} a refusé sa part de ${n(c.kg)} kg de ${c.product}`,
    text: `${hello(c)}\n\n${c.coop} a refusé sa part de ${n(c.kg)} kg de ${c.product}${c.reason ? ` (« ${c.reason} »)` : ''}. Merci de proposer une autre répartition.\n${APP()}/espace-agent${sign}`,
    sms: `Green System : ${c.coop} a refusé sa part de ${n(c.kg)} kg de ${c.product}${c.reason ? ` (${c.reason})` : ''}. Proposez une autre répartition.`
  }),
  'order.ready': (c) => ({
    subject: `Toutes les coopératives ont accepté : ${n(c.qty)} kg de ${c.product}`,
    text: `${hello(c)}\n\nToutes les coopératives de la répartition ont accepté leur part pour la commande de ${c.company} (${n(c.qty)} kg de ${c.product}). Vous pouvez valider la vente.\n${APP()}/espace-agent${sign}`,
    sms: `Green System : toutes les coopératives ont accepté leur part (${n(c.qty)} kg de ${c.product}, ${c.company}). Vous pouvez valider la vente.`
  }),
  'order.validated.coop': (c) => ({
    subject: `Vente validée : votre part de ${n(c.kg)} kg de ${c.product}`,
    text: `${hello(c)}\n\nLa vente de ${n(c.qty)} kg de ${c.product} est validée. Votre part : ${n(c.kg)} kg${c.price ? ` à ${n(c.price)} FCFA/kg` : ''}. Merci pour votre contribution à la livraison commune !\n${APP()}/espace-membre/livraisons${sign}`,
    sms: `Green System : la vente de ${n(c.qty)} kg de ${c.product} est validée. Votre part : ${n(c.kg)} kg${c.price ? ` à ${n(c.price)} FCFA/kg` : ''}. Merci !`
  }),
  'order.validated.client': (c) => ({
    subject: `Votre commande de ${n(c.qty)} kg de ${c.product} est validée`,
    text: `${hello(c)}\n\nVotre commande de ${n(c.qty)} kg de ${c.product} est validée${c.price ? ` au prix de ${n(c.price)} FCFA/kg` : ''}. Elle sera livrée par plusieurs coopératives de l'union.\n${APP()}/espace-client${sign}`,
    sms: `Green System : votre commande de ${n(c.qty)} kg de ${c.product} est validée${c.price ? ` à ${n(c.price)} FCFA/kg` : ''}.`
  }),
  'client.approved': (c) => ({
    subject: 'Votre entreprise est agréée',
    text: `${hello(c)}\n\nVotre entreprise est agréée par l'USCAEP : vous pouvez désormais passer commande sur Green System.\n${APP()}/espace-client${sign}`,
    sms: 'Green System : votre entreprise est agréée, vous pouvez passer commande.'
  }),
  test: (c) => ({
    subject: 'Message de test Green System',
    text: `${hello(c)}\n\nCeci est un message de test : vos notifications Green System fonctionnent.${sign}`,
    sms: 'Green System : message de test, vos notifications fonctionnent.'
  })
};
