# Refonte des véhicules en course

Cette livraison cible le plateau pendant une partie, et non le menu du garage. Les 19 identifiants de véhicules existants sont conservés. La course 3D affiche maintenant directement les 19 illustrations détourées haute résolution : supercar, rétro, citadine, berline, SUV, utilitaire, pick-up, formule, prototype, kart, tracteur, taxi, police, moto, scooter, quad et KILOMAX. Chaque pilote garde son modèle et sa couleur cosmétique. Les anciens modèles GLTF/procéduraux restent disponibles comme secours en cas d’illustration indisponible.

Ces images donnent enfin une silhouette propre à chaque modèle dans la course (la construction procédurale précédente réutilisait des carrosseries trop similaires). Le rendu est une pièce détourée toujours face à la caméra, intégrée au positionnement 3D, aux déplacements, aux cibles, aux étiquettes, aux anneaux d’état et aux effets existants. La teinte suit la couleur du joueur quand la livrée du modèle l’autorise. Aucun état ou identifiant de joueur n'est remplacé.

Le décor 3D du parcours conserve la route et ses règles : une nouvelle vue panoramique côtière détaillée remplace le simple dégradé du ciel. La route jouable reste devant elle en 3D. Le panorama est teinté selon jour, crépuscule et nuit ; les textures de terre, pierre et enduit, le relief, les arbres, fenêtres/volets et le cadrage restent intégrés autour du circuit. Les silhouettes des spectateurs et des fleurs utilisent des tons plus sobres.

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

- `npm test` : 87 tests réussis, dont simulations complètes à 2–6 joueurs et 700/1000/1500 km, intégrité des fichiers de gameplay protégés, présence des 19 illustrations de course, motifs des quatre catégories et budgets de géométrie du décor.
- `npm run test:vehicles` : capture headless des 19 vraies illustrations détourées à travers le constructeur d’objets utilisé en course, sans erreur navigateur.
- `scripts/check-race-events.mjs` : parcours sans données réelles à deux joueurs ; collision ciblée, réparation, déplacement de 200 km et vérification de la console. À rejouer contre le déploiement courant.
- `npm run test:browser` : parcours local à six joueurs et contrôles responsive déjà exécutés pendant la refonte.
- TypeScript et build Webpack réussis ; lint sans erreur avec un avertissement préexistant dans `scripts/generate-scene-decor.mjs`.

Les vérifications de rendu ont été faites sous Chrome headless avec accélération logicielle. Elles ne remplacent pas un essai sur téléphones réels et réseaux mobiles. Les changements ne touchent ni le catalogue/réducteur du jeu, ni les contrats Supabase/RPC, ni les migrations ou configurations de secrets.

Capture de contrôle : [les 19 véhicules distincts utilisés en course](screenshots/vehicles-in-game.webp). Le panorama de jeu est `public/images/premium/landscape-world.webp`.
