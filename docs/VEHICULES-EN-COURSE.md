# Refonte des véhicules en course

Cette livraison cible le plateau pendant une partie, et non le menu du garage. Les 19 identifiants de véhicules existants sont conservés. La course construit maintenant 16 carrosseries 3D routières dédiées et retravaille les géométries des trois véhicules à deux/quatre roues existants (moto, scooter, quad). Les identifiants inconnus gardent le chargeur GLTF de secours.

Les carrosseries ont des profils et accessoires propres selon leur famille : capot et ailes profilés, arches découpées, vitres séparées par des montants, rétroviseurs fixés, éclairage avant/arrière, roues et freins détaillés. Les variantes comprennent notamment SUV, utilitaire, pick-up, rétro, formule, prototype, kart, taxi et police. La peinture continue de suivre la couleur du joueur et les roues/suspensions continuent d'utiliser l'animation existante. Aucun état ou identifiant de joueur n'est remplacé.

Le décor 3D du parcours conserve la route et ses règles : textures procédurales discrètes de terre, pierre et enduit, relief de montagne plus organique, arbres arrondis, fenêtres/volets, lumière de jour et de nuit, cadrage de caméra qui tient compte des voies et des lignes de véhicules. Les textures sont générées en code et n'introduisent pas de nouvelles images de fond.

## Cartes plus faciles à distinguer

Les 20 cartes gardent les mêmes identifiants, noms, textes, multiplicité, valeur et effet. Leur catégorie est désormais lisible au premier regard par trois repères persistants : couleur, symbole et motif, complétés par le nom écrit de la catégorie.

| Famille | Repère |
|---|---|
| Distance | Or, route et hachures verticales |
| Malus / attaque | Rouge, triangle d'alerte et diagonales |
| Parade / défense | Vert, bouclier et lignes horizontales |
| Bonus spécial | Violet, éclair et points |

La même légende est affichée dans la main du plateau 3D et dans l'interface classique. Les repères sont conçus pour rester visibles lorsque les cartes se chevauchent sur mobile.

## Vérifications

- `npm test` : 87 tests réussis, dont simulations complètes à 2–6 joueurs et 700/1000/1500 km, intégrité des fichiers de gameplay protégés, inspection géométrique des 19 véhicules, motifs des quatre catégories et budgets de géométrie du décor.
- `npm run test:vehicles` : capture automatisée des 19 modèles 3D natifs dans une galerie headless, sans erreur navigateur.
- `scripts/check-race-events.mjs` : partie de démonstration à deux joueurs dans la scène de course ; collision ciblée, réparation, déplacement de 200 km et vérification de la console. Capture des étapes sous `/tmp/kilomax-vehicles/`.
- `npm run test:browser` : parcours local à six joueurs et contrôles responsive déjà exécutés pendant la refonte.
- TypeScript, lint et build de production à relancer avant livraison finale.

Les vérifications de rendu ont été faites sous Chrome headless avec accélération logicielle. Elles ne remplacent pas un essai sur téléphones réels et réseaux mobiles. Les changements ne touchent ni le catalogue/réducteur du jeu, ni les contrats Supabase/RPC, ni les migrations ou configurations de secrets.

Captures de contrôle : [les 19 véhicules du plateau](screenshots/vehicles-in-game.webp), [collision en partie](screenshots/race-collision.webp), [progression sur la route](screenshots/race-driving.webp).
