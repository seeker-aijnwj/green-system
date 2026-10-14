# Green System

Mieux organiser le secteur primaire en Afrique

## Parcours à tester
1. **Agrément (point 8)** : connectez-vous en client en attente → impossible de commander. Connectez-vous en administrateur → *Utilisateurs* → *Agréer*. Retour côté client (en ligne) : le statut passe à « agréé » et le formulaire apparaît. Un nouveau client peut aussi s'inscrire sur `/inscription`.
2. **Négociation (point 7)** : le client commande → l'agent voit la commande, fixe le prix, passe le statut à « validée ». Le client voit le prix et le statut.
3. **Utilisateurs (point 3)** : l'administrateur crée un gestionnaire (choix de la coopérative), un agent ou un client, désactive/réactive un compte, réinitialise un mot de passe.
4. **Hors-ligne** : en gestionnaire, coupez le réseau (outils développeur → Network → Offline), saisissez un approvisionnement, rétablissez le réseau : le badge passe de « en attente » à « à jour ».

## Stock par coopérative
Chaque coopérative a son propre stock par produit ; le stock affiché au public pour un produit est la somme des stocks des coopératives. Tout est calculé par le **serveur** (jamais par les téléphones), de façon atomique (pas de stock négatif) et idempotente :
- **Approvisionnement** enregistré par un gestionnaire → +stock de **sa** coopérative. Corriger ou supprimer l'approvisionnement ajuste la différence ; refusé si la quantité a déjà été vendue.
- **Vente validée** → −stock de **chaque coopérative** de la répartition (voir ci-dessous).
- **Annulation ou répartition modifiée** (statut changé, parts changées, commande supprimée) → seules les différences sont appliquées, coopérative par coopérative.
- **Inventaire** : l'administrateur peut corriger le stock d'une coopérative (page *Gestion*) ; chaque variation (approvisionnement, vente, annulation, inventaire) est tracée dans les **mouvements de stock**.
- Un gestionnaire ne voit que le stock de sa coopérative ; l'agent et l'administrateur voient tous les stocks.

## Répartition d'une commande entre plusieurs coopératives
Une grosse commande n'est plus confiée à une seule coopérative : chacune y contribue selon son stock.
- **Agent / administrateur** : dans la liste des commandes, bouton *Répartir* → une part en kg par coopérative (stock affiché), avec deux suggestions automatiques (**proportionnelle au stock** ou **parts égales**, plafonnées par les stocks). La vente ne peut être **validée** que si la somme des parts égale la quantité commandée.
- **À la validation**, le serveur débite chaque coopérative de sa part. Si une seule n'a pas assez de stock, **tout est annulé** (aucune coopérative n'est débitée) et l'agent est prévenu. Si la répartition change après validation, seules les différences sont appliquées ; si la commande est refusée ou supprimée, tout est restitué.
- **Accord de chaque coopérative** (voir ci-dessous) : la vente n'est validable que lorsque toutes les coopératives de la répartition ont accepté leur part.
- **Gestionnaires** : page *Livraisons* (`/espace-membre/livraisons`) : les commandes auxquelles leur coopérative participe, leur part (kg, %, FCFA estimés), la part de **chaque** autre coopérative (barre colorée) et un récapitulatif « ensemble avec N coopératives ». Ils voient le produit, la quantité, le prix et la répartition, mais **jamais l'e-mail ni les notes du client**.
- **Client** : peut indiquer une coopérative souhaitée (simple souhait, visible par l'agent) et voit, une fois la vente validée, quelles coopératives l'ont livré.
- **Classement** : les ventes de chaque coopérative correspondent à **sa part** ; le nombre de commandes livrées ensemble est affiché.

### Accord de chaque coopérative sur sa part
1. L'agent enregistre une répartition : chaque coopérative concernée voit sa part dans *Livraisons* (et une alerte sur son tableau de bord) et répond **Accepter** ou **Refuser** (avec un motif). Elle peut changer d'avis tant que la vente n'est pas validée.
2. L'agent suit les réponses (✓ accepté, ✕ refusé, … en attente) ; le statut « validée » n'est sélectionnable que lorsque la répartition est complète **et** acceptée par toutes les coopératives. Le serveur le vérifie aussi.
3. **Si une part change** (quantité ou coopérative), seule la coopérative concernée doit répondre à nouveau ; les autres confirmations sont conservées. Une réponse portant sur une ancienne proposition est refusée.
4. Une répartition **validée** ne peut plus être modifiée sans repasser la commande « en négociation » (le stock est alors restitué) : aucune coopérative ne peut se voir imposer une part après coup.
5. En cas de coopérative injoignable, l'**administrateur** peut accepter **au nom** de la coopérative (tracé comme tel). L'agent, lui, ne peut pas répondre à la place des coopératives.

### Entraide : félicitations et encouragements (`/espace-membre/entraide`)
- Après une livraison commune, un bouton **Féliciter** (par partenaire, ou **Féliciter tout le monde**) envoie un mot en un clic depuis *Livraisons*.
- La page *Entraide* permet d'envoyer un mot (félicitations ou encouragement, messages rapides ou texte libre de 140 caractères) à n'importe quelle coopérative ; un cœur sur la page *Classement* permet d'encourager directement une coopérative. Les messages reçus sont signalés « Nouveau » et comptés sur le tableau de bord ; le **mur de l'union** montre les derniers messages à toutes les coopératives.
- Garde-fous : une coopérative écrit toujours en son propre nom, ne peut ni se féliciter elle-même ni modifier un message envoyé, et est limitée à **5 messages par jour (GMT)** ; l'administrateur **modère** (suppression) depuis *Gestion*.

### Transparence envers les coopératives : une seule ligne
Les coopératives participantes voient le produit, la quantité, la répartition complète et les réponses de chacune. Le prix négocié et le nom de l'entreprise cliente sont visibles par défaut ; pour changer, modifier **la ligne `const COOP_SEES = ['price', 'company'];`** dans `server/index.js` (`['price']` = prix seulement, `[]` = répartition seule). L'e-mail du client et les notes internes ne sont **jamais** transmis.

Test rapide : agent `AGT-001` → commande de CocoaTrade (5 000 kg de cacao) → *Répartir* → « Proportionnelle au stock » → *Enregistrer* ; connectez-vous en `GEST-001` (Daloa) → *Livraisons* → *Accepter ma part* ; l'administrateur accepte au nom des autres coopératives (ou créez leurs comptes gestionnaires) ; l'agent peut alors passer la commande en « validée » : le stock de chaque coopérative baisse de sa part (page *Gestion* de l'administrateur). Connectez-vous ensuite en `GEST-001` : la commande apparaît dans *Livraisons* avec la part de Daloa et celle des autres. La commande de café (en négociation) a déjà une répartition proposée ; deux ventes livrées ensemble sont fournies en démo.

## Classement et émulation entre coopératives (page publique `/classement`)
Calculé par le serveur sur 7 / 30 / 90 jours ou depuis le début, au niveau **coopérative (local)** et **région (national)**. Le **score global** (0–100) est la moyenne de quatre critères, chacun ramené au meilleur de la période : volume collecté, productivité (kg par producteur validé), ventes validées, régularité (jours avec au moins un approvisionnement). La productivité et la régularité permettent aux petites coopératives de rivaliser avec les grandes. Seuls des volumes sont publiés (jamais les prix). Les gestionnaires voient leur rang, leurs quatre critères et le point à améliorer sur leur tableau de bord ; le podium est affiché sur l'accueil. Le dernier classement consulté reste disponible hors-ligne.

## Horloge GMT unique (`src/lib/clock.js`)
L'heure de référence est l'heure **GMT (UTC) du serveur**. À chaque synchronisation, l'écart avec l'appareil est mesuré (aller-retour compensé) puis **mémorisé** ; hors-ligne, l'heure de confiance = heure de l'appareil + écart mémorisé. En cours de session, l'heure avance avec une horloge monotone : changer l'heure du téléphone n'a aucun effet. L'heure ne recule jamais d'un démarrage à l'autre. Cette horloge sert à **tout** : horodatage des saisies et résolution des conflits, date des approvisionnements, règle des 20 h (en GMT), affichage des dates (suffixe « GMT »). Un badge dans l'en-tête affiche l'heure GMT (orange si non vérifiée depuis plus de 3 jours) et une alerte signale un téléphone décalé de plus de 5 minutes. Côté serveur : un horodatage client ne peut jamais dépasser l'heure du serveur, et la règle des 20 h ainsi que la justification des suppressions sont **revérifiées par le serveur** (une saisie hors-ligne ne peut plus les contourner). `GET /api/time` expose l'heure serveur.

## Interface
Tailwind CSS v4 (plugin Vite, thème dans `src/styles.css`), police **Plus Jakarta Sans** embarquée via `@fontsource-variable` (aucun appel à un CDN : elle fonctionne hors-ligne), icônes `lucide-react`. Barre de navigation en bas d'écran sur mobile, composants réutilisables (`.btn`, `.card`, `.form`, `.tag`, `.note`…) définis avec `@apply`.

## Limites connues de cette bêta
- Les adaptateurs PostgreSQL et Firebase n'ont pas été testés sur de vraies bases.
- La gestion des comptes et l'inscription exigent Internet (ils ne sont pas synchronisés hors-ligne).
- Une modification refusée par le serveur est signalée par une bannière et la version du serveur est restaurée localement.
- L'horloge est fiable après une première synchronisation. Si l'heure d'un téléphone est avancée hors-ligne **avant** un redémarrage de l'application, l'erreur persiste jusqu'à la prochaine synchronisation (qui la corrige).
- Seules deux coopératives ont un compte gestionnaire de démonstration (Daloa, Soubré) : pour tester l'accord de toutes les autres, utilisez « Accepter au nom de la coopérative » (administrateur) ou créez leurs comptes dans *Utilisateurs*.
- Les rappels e-mail/SMS ont été testés avec un vrai serveur SMTP local et des passerelles SMS **simulées** (formats Twilio, Africa's Talking et webhook) ; ils n'ont pas été essayés avec de vrais comptes d'opérateur : faire un essai avec un compte réel avant le pilote.
- Le planificateur de rappels est dans le processus serveur : avec plusieurs instances, n'en laisser qu'une exécuter les rappels (ou utiliser une tâche planifiée externe).
- Le débit sur plusieurs coopératives est protégé par annulation compensatoire (pas par une transaction unique sur toute la commande) : suffisant à cette échelle, à renforcer si le trafic augmente.
- Le classement est recalculé à la demande (cache de 30 s) : à optimiser par des agrégats en base quand le volume de données augmentera.
- Pas encore : limitation des tentatives de connexion, HTTPS intégré, journal d'audit, e-mails/SMS, envoi d'images. Définir `SESSION_SECRET` en production.
