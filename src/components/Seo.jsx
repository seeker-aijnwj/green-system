import { Helmet } from 'react-helmet-async';

const SITE = 'USCAEP';
const BASE = 'https://www.example.ci'; // à remplacer par le vrai domaine

export default function Seo({ title, description, path = '/', noindex = false, jsonLd }) {
  const full = title ? `${title} | ${SITE}` : `${SITE} – Union de coopératives agricoles`;
  return (
    <Helmet>
      <title>{full}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${BASE}${path}`} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="fr_CI" />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${BASE}${path}`} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
