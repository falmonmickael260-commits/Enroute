# KILOMAX

Jeu de course de cartes multijoueur (2 à 4 pilotes) — Next.js, React, Tailwind, framer-motion.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

## Modes de jeu

- **En ligne** — chaque pilote sur son appareil. L'hôte crée la partie, partage le code `ENR-XXXX`
  (ou le lien), tout le monde se déclare prêt, l'hôte lance. Reconnexion automatique après un
  rechargement ; si le pilote dont c'est le tour se déconnecte, l'hôte peut passer son tour
  (automatique au bout de 45 s).
- **Sur cet appareil** — on se passe l'écran.

## Multijoueur en ligne (Supabase)

L'état de chaque partie est stocké dans Supabase (`supabase/migrations/`). Les tables ne sont pas
exposées : tout passe par des fonctions RPC qui vérifient un secret propre à chaque joueur, et seul
le pilote dont c'est le tour (ou l'hôte) peut jouer. Les clients se synchronisent par
interrogation régulière (qui sert aussi de présence) avec version optimiste, plus un signal
Realtime quand il est disponible.

Le client utilise par défaut le projet Supabase du jeu. Pour en utiliser un autre, appliquer la
migration puis définir :

```
NEXT_PUBLIC_SUPABASE_URL=https://<projet>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Seule la clé **publishable** va dans le client — jamais la clé `service_role`.

## Mise en ligne

Railway détecte Next.js et utilise les scripts `npm run build` et `npm start`.
Les résultats des joueurs connectés sont envoyés à l’API de Revanche Games,
qui vérifie le jeton du joueur et enregistre le résultat.

## Boutique Revanche Games

Le bouton **Boutique** ouvre le garage premium. Les véhicules vendus à 1 500 pièces
sont conservés sur le compte Revanche Games. Une voiture premium choisie dans
un salon en ligne exige une autorisation signée et liée à la place du pilote.

Le bouton **Coffre** est visible en course sur le plateau classique et en 3D.
Après avoir pioché pendant son tour, chaque pilote peut obtenir un GPS
stratégique ou retirer un malus actif pour 300 pièces. Le portefeuille conserve
le reçu par compte, pilote et course. En cas de resynchronisation, le bouton
**Récupérer mon achat** permet de réappliquer le reçu pendant un tour éligible
de cette même course. Le reçu est vérifié côté base en multijoueur.

### Configuration avant publication

- Appliquer la migration `kilomax_shop` au projet Supabase de Revanche Games et
  la migration `premium_garage` au projet Supabase d'Enroute.
- Provisionner la même clé aléatoire dédiée côté serveur dans
  `KILOMAX_COMMERCE_SECRET` sur Revanche Games et dans
  `kilomax_commerce.signing_key` sur la base Enroute. Cette clé est distincte du
  jeton de lancement et n'est jamais une variable `NEXT_PUBLIC_*`.
- `NEXT_PUBLIC_REVANCHE_ORIGIN` indique l'origine de la plateforme si elle est
  différente de sa production Railway. Pour un aperçu hébergé, permettre
  l'origine exacte d'Enroute avec `KILOMAX_SHOP_ORIGIN` côté plateforme.
- Les crédits des véhicules et de leurs aperçus figurent dans
  `public/models/cars/CREDITS.md`.
