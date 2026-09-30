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

Importer le dépôt sur Vercel (framework Next.js détecté automatiquement) et déployer. Aucune
variable d'environnement n'est obligatoire.
