import Seo from '../../components/Seo.jsx';
import Field from '../../components/Field.jsx';
import { useApp } from '../../context/AppContext.jsx';

const LABEL = { producers: 'Producteurs', employees: 'Employés' };

export default function People({ kind }) {
  const { user, live, upsert, remove } = useApp();
  const list = live(kind).filter((p) => p.cooperativeId === user.cooperativeId);

  async function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await upsert(kind, { ...f, cooperativeId: user.cooperativeId, validated: false });
    e.currentTarget.reset();
  }

  async function del(p) {
    let why;
    if (!p.validated) {
      // Règle de gestion : suppression avant prise en compte par l'administration = justification.
      why = window.prompt(`Supprimer ${p.name} avant validation par l'administration : justification obligatoire`);
      if (!why?.trim()) return;
    } else if (!window.confirm(`Supprimer ${p.name} ?`)) return;
    await remove(kind, p.id, why);
  }

  return (
    <div className="page">
      <Seo title={LABEL[kind]} path={`/espace-membre/${kind === 'producers' ? 'producteurs' : 'employes'}`} noindex description={LABEL[kind]} />
      <h1>{LABEL[kind]}</h1>
      <form className="form" onSubmit={add}>
        <Field label="Nom complet" id="name" required />
        <Field label="Téléphone" id="phone" type="tel" />
        <button className="btn" type="submit">Ajouter</button>
      </form>
      <ul className="list">
        {list.map((p) => (
          <li key={p.id}>
            <span>{p.name} <small>{p.phone}</small></span>
            <span className={p.validated ? 'tag ok' : 'tag'}>{p.validated ? 'Validé' : 'En attente de validation'}</span>
            <button type="button" className="link" onClick={() => del(p)}>Supprimer</button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="empty">Aucun enregistrement.</p>}
    </div>
  );
}
