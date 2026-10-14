import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, Trophy } from 'lucide-react';
import Seo from '../../components/Seo.jsx';
import Field from '../../components/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { fmtDate } from '../../lib/clock.js';
import { KINDS, PRESETS, markSeen, seenAt } from '../../lib/cheers.js';

function Cheer({ k, cname, fresh }) {
  const Icon = k.kind === 'felicitations' ? Trophy : Heart;
  return (
    <li className="flex gap-3 rounded-xl border border-forest-100 bg-white p-3 shadow-sm">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${k.kind === 'felicitations' ? 'bg-sun-100 text-sun-600' : 'bg-forest-100 text-forest-600'}`}><Icon className="size-5" aria-hidden="true" /></span>
      <span className="min-w-0">
        <strong className="text-sm">{cname(k.fromCooperativeId)} → {cname(k.toCooperativeId)}</strong>
        {fresh && <span className="tag ml-2">Nouveau</span>}
        <span className="block text-sm">{k.message}</span>
        <small className="text-stone-500">{KINDS[k.kind]} · {fmtDate(k.createdAt)}</small>
      </span>
    </li>
  );
}

/** Mur d'entraide : félicitations et encouragements entre coopératives de l'union. */
export default function Cheers() {
  const { user, live, upsert } = useApp();
  const [params] = useSearchParams();
  const me = user.cooperativeId;
  const coops = live('cooperatives');
  const kudos = live('kudos').sort((a, b) => b.createdAt - a.createdAt);
  const cname = (id) => coops.find((c) => c.id === id)?.name.replace('Coopérative ', '') || id;
  const seen = useRef(seenAt(me)); // pour signaler les messages arrivés depuis la dernière visite
  const [to, setTo] = useState(params.get('to') || '');
  const [kind, setKind] = useState('encouragement');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => { markSeen(me); }, [me, kudos.length]);

  const partners = new Set(live('orders').filter((o) => o.stockApplied && (o.stockAllocations || []).some((a) => a.cooperativeId === me)).flatMap((o) => o.stockAllocations.map((a) => a.cooperativeId)).filter((id) => id !== me));
  const others = coops.filter((c) => c.id !== me);
  const received = kudos.filter((k) => k.toCooperativeId === me);

  async function submit(e) {
    e.preventDefault();
    await upsert('kudos', { kind, toCooperativeId: to, message: message.trim(), fromCooperativeId: me });
    setMessage(''); setSent(true);
  }

  return (
    <div className="page">
      <Seo title="Entraide" path="/espace-membre/entraide" noindex description="Félicitations et encouragements entre coopératives." />
      <h1>Entraide entre coopératives</h1>
      <p className="max-w-2xl text-stone-600">Une union forte, c'est des coopératives qui se soutiennent. Félicitez un partenaire de livraison, encouragez celle qui démarre : un mot suffit. Les messages sont visibles de toute l'union et doivent rester positifs.</p>

      <h2>Envoyer un mot</h2>
      {sent && <p className="note ok" role="status">Message envoyé. Merci de soutenir vos partenaires !</p>}
      <form className="form" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="À quelle coopérative ?" id="to" as="select" required value={to} onChange={(e) => { setTo(e.target.value); setSent(false); }}>
            <option value="" disabled>Choisir</option>
            {partners.size > 0 && <optgroup label="Mes partenaires de livraison">{others.filter((c) => partners.has(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
            <optgroup label="Toutes les coopératives">{others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
          </Field>
          <Field label="Type de message" id="kind" as="select" value={kind} onChange={(e) => { setKind(e.target.value); setMessage(''); }}>
            {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Field>
        </div>
        <div>
          <span className="mb-1 block text-sm font-semibold text-forest-900">Message rapide</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS[kind].map((p) => <button key={p} type="button" className="tag ok cursor-pointer text-left hover:bg-forest-200" onClick={() => setMessage(p)}>{p}</button>)}
          </div>
        </div>
        <Field label="Votre message (140 caractères maximum)" id="message" as="textarea" rows="2" maxLength="140" required value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="btn" type="submit" disabled={!to || !message.trim()}>Envoyer</button>
      </form>

      <h2>Reçus par ma coopérative</h2>
      {received.length === 0 ? <p className="empty">Aucun message pour l'instant. Livrez ensemble, progressez au classement : les mots d'encouragement suivront !</p>
        : <ul className="grid list-none gap-2 p-0">{received.map((k) => <Cheer key={k.id} k={k} cname={cname} fresh={k.createdAt > seen.current} />)}</ul>}

      <h2>Le mur de l'union</h2>
      {kudos.length === 0 ? <p className="empty">Soyez la première coopérative à envoyer un mot !</p>
        : <ul className="grid list-none gap-2 p-0">{kudos.slice(0, 12).map((k) => <Cheer key={k.id} k={k} cname={cname} />)}</ul>}
    </div>
  );
}
