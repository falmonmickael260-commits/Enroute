# Refonte Grand Tourisme

## Périmètre et protection

Travail isolé sur `codex/kilomax-premium-redesign`, depuis la branche web par défaut `claude/en-route-board-game-c6hqed`, dans le dépôt officiel Enroute. Le checkout Unity existant et ses modifications locales n’ont pas été touchés. Aucun déploiement ni fusion automatique.

`gameplay-protected.json` fige par SHA-256 le moteur, le catalogue, les types partagés, les migrations SQL, les API en ligne et l’intégration Revanche Games. Un test vérifie ces empreintes. Aucun changement de règles, valeur, contrat RPC, configuration ou schéma de base de données.

## Réalisation

- Nouvelle direction Grand Tourisme : accueil panoramique, hiérarchie éditoriale, panneaux et navigation sur mobile et ordinateur, chargement dans le même univers.
- 19 nouvelles illustrations de véhicules optimisées, garage avec accès direct à chaque modèle, peinture cosmétique suivant la couleur du pilote, podium illustré et véhicules sélectionnés visibles aussi sur le plateau classique.
- 14 modèles 3D procéduraux remplaçant les véhicules Kenney concernés : carrosseries profilées, matériaux métalliques vernis, vitrage, optiques, jantes et disques, étriers fixes, rétroviseurs, accessoires distincts. Les deux glTF détaillés et les moto/scooter/quad existants restent utilisés.
- Les roues, suspensions, feux de freinage, équipements et animations de conduite restent pilotés par le moteur de présentation existant. Les pièces statiques sont regroupées ; les nouveaux modèles restent sous 32 maillages chacun.
- 20 faces de cartes revues ; 15 illustrations d’action originales et cadrages panoramiques pour les cinq distances. Noms et sous-titres viennent exclusivement du catalogue original. Les icônes SVG des indicateurs restent lisibles.
- Palette côtière plus naturelle, relief fin de l’asphalte, reflets des carrosseries ; réponses optiques aux déplacements, collisions, crevaisons, panne d’essence, radar, barrage et réparation. Ces effets ne déclenchent aucune action et ne retardent aucun tour.
- Effets sonores existants conservés avec leurs licences ; ajout d’une réflexion extérieure discrète et filtrée sur le bus des effets. Les quatre volumes, le silence, le limiteur et le déverrouillage audio mobile sont conservés.

## Bugs corrigés

1. Le dépassement pouvait être présenté comme jouable à un véhicule immobilisé alors que le reducer le refusait. Les deux interfaces consultent maintenant les mêmes validations existantes ; moteur inchangé.
2. Une animation déjà en attente au montage d’un plateau n’était pas prise en compte avant un changement de référence de la file. Elle est désormais lue dès le montage, notamment après reconnexion ou changement de rendu.
3. Une impossibilité de construire WebGL pouvait faire disparaître l’écran de jeu. Une limite d’erreur remonte le plateau classique avec le même état et les mêmes commandes.
4. Les géométries et matériaux des nouveaux modèles sont libérés lors d’un remplacement, départ, changement de partie ou résultat de chargement devenu obsolète.

## Matrice de non-régression

| Domaine | Vérification |
|---|---|
| Règles, catalogue, RPC, SQL, Revanche | Empreintes identiques |
| 20 cartes | Valeurs de distance, radar, 5 attaques et immunités, 5 réparations/protections, 5 spéciales |
| Distribution, tours, victoire | 15 simulations complètes, 2 à 6 joueurs, 700/1000/1500 km |
| Assets et modèles | 19 véhicules et 20 cartes livrés ; géométries finies, 4 roues, équipements et budget de maillages |
| Reprise des animations | Tests au montage avec file préexistante et file vide |
| Supabase réel | Salon privé avec 2 participants techniques : véhicules, prêts, départ, pioche, commit, synchronisation et récupération d’état ; départ des participants en fin de test |
| Interface | Script Playwright `scripts/smoke-premium.mjs`, quatre résolutions, collection, garage, partie locale, pioche/défausse et changement de rendu |

## Reproduction

Résultats automatisés : **55 tests réussis**, typecheck réussi, lint sans erreur (un avertissement préexistant), build de production Webpack réussi. Le contrôle Supabase réel a réussi avec deux participants techniques.

Le parcours Chrome sur la compilation de production passe : accueil en 390×844, 320×568, 844×390 et 1440×1000 ; 20 illustrations chargées ; salon à six joueurs, choix dans le garage, départ, pioche, défausse, tour suivant, plateau classique visible, AudioContext actif après interaction, silence et réactivation. Une construction WebGL refusée est simulée ; le plateau classique reste disponible et aucune erreur de page non traitée n’est observée.

Captures contrôlées : [accueil mobile](screenshots/home-390.webp), [accueil ordinateur](screenshots/home-1440.webp), [garage](screenshots/garage.webp), [course](screenshots/race.webp), [classique](screenshots/classic.webp), [collection](screenshots/cards.webp).

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build -- --webpack
npm run start -- --port 3111
# Dans un autre terminal, Chrome installé :
npm run test:browser -- http://localhost:3111
# Facultatif : utilise un salon technique réel, puis quitte les participants.
npm run test:online
```

Le script navigateur accepte `CHROME_PATH`, `TEST_BASE_URL` et `TEST_ARTIFACTS`. Le script d’optimisation des illustrations accepte le répertoire des originaux comme argument. Les prompts sont versionnés, les originaux ne sont pas requis pour jouer.

## Limites de validation

Les contrôles navigateur sont exécutés dans Chrome headless, avec rendu logiciel, et ne remplacent pas des essais sur iPhone Safari, Chrome Android, appareils modestes et réseaux mobiles. L’écoute du mix sur haut-parleur et casque reste à réaliser humainement. Le test Supabase confirme deux participants techniques ; les simulations couvrent six joueurs, sans constituer six téléphones physiques. Invitations Revanche et remontée effective des statistiques de comptes réels ne sont pas exercées ; leur code est inchangé. Les illustrations de garage et les modèles 3D ont des niveaux de détail différents et méritent une revue artistique avant publication.

La compilation standard Turbopack a rencontré une restriction locale de création de processus/port. La compilation de production Webpack passe. Le lint ne présente aucune erreur ; un avertissement préexistant subsiste dans `scripts/generate-scene-decor.mjs` (variable `ribbon`).
