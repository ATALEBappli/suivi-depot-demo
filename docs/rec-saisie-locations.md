# Intégration de la saisie des locations — préparation REC

Décision du 18 novembre 2026 : utiliser **les 12 appartements du référentiel réel en REC**, mais effectuer **exclusivement des transactions fictives en REC**. Ne jamais modifier PROD ni Google Sheets PROD.

## État et périmètre

- `location-entry.mjs` prépare les listes à partir de la réponse authentifiée `v2.read` et construit une intention de paiement explicitement marquée `environment: REC`, `testOnly: true`.
- Aucune liste de noms, loyer réel, adresse ou identifiant d'appartement n'est incluse dans le dépôt.
- L'interface `location-entry-view.mjs` lit le référentiel via `v2.read` et l'état de sécurité via `rec.status`. Elle permet la prévisualisation et affiche les transactions fictives REC si l'API associée est disponible.
- L'écran `#synthese-rec` utilise exclusivement `rec.testTransaction.list` et `v2.read` pour les totaux fictifs (entrées, espèces, banque et nombre), les filtres par mois d'opération ou appartement, et l'historique. Aucun appel à `financeFixture` ni aux transactions réelles.
- La préparation du backend ajoute `rec.testTransaction.create` et `rec.testTransaction.list` dans une PR distincte. Les transactions sont persistées dans une feuille REC dédiée, jamais dans `transactions` historique.
- **Aucune écriture n'est activée par le code seul** : la propriété privée `REC_TEST_TRANSACTIONS=1`, le rôle administrateur et la validation cible REC sont requis côté serveur. Ne pas positionner la propriété sans validation de l'environnement et du classeur REC.

## Parcours cible

1. Ouvrir la Saisie depuis l'interface authentifiée REC (session Google Hotmail autorisée, **jamais** le PIN fictif).
2. Sélectionner `Entrée → Dépôt locatif → Loyer` dans le formulaire dynamique commun. Les autres activités restent `HEADM — Construction`, `Charges communes`, `Famille / Divers`.
3. Lire `v2.read` via la passerelle serveur de même origine. Refuser absence de session, mauvaise cible, retour incomplet ou V2 indisponible. Proposer les appartements actifs ayant un bail actif à la date d'opération ; aucune copie statique du référentiel.
4. Après sélection, afficher numéro/type, locataire issu du bail, loyer en vigueur à la date choisie ; préremplir le montant modifiable, la période de loyer et la date. Changement de date = nouveau calcul du bail et du loyer, réinitialisation de toute sélection invalide.
5. Permettre une transaction **TEST REC** seulement. Afficher une confirmation détaillant logement, période, montant et caractère fictif avant envoi. Empêcher les doubles clics.
6. Après réponse serveur confirmée, rafraîchir l'historique de saisie REC. L'écran `Synthèse TEST REC` affiche les totaux et filtres indépendamment de la fixture de démonstration. Ne jamais mélanger transactions de test avec les données historiques/PROD.

## Backend à préparer avant toute écriture

- Endpoint dédié `rec.testTransaction.create` et lecture `rec.testTransaction.list`, dans les listes blanches de la passerelle et d'Apps Script REC, **sans** ouvrir l'ancien `action=add` JSONP.
- Exiger identité REC authentifiée, rôle autorisé, environnement et empreintes REC vérifiés, permission d'écriture explicitement activée ; aucun repli vers PROD.
- Validation serveur stricte : `testOnly === true`, IDs logement/bail/locataire existants et cohérents, dates/période, montant positif, devise DA, rattachement à l'activité locative, mode de paiement autorisé.
- Enregistrer la nature fictive de manière **persistante** (`testOnly`, acteur, horodatage, `requestId` idempotent) dans la feuille séparée `rec_test_transactions`. Une simple mention « TEST » dans la description ne suffit pas.
- Refuser l'écriture si la destination est le classeur PROD ou si le schéma REC ne comporte pas le marqueur de test. Ne jamais utiliser des données personnelles du référentiel dans les fixtures de CI.
- Prévoir récupération après timeout avec le même `requestId`, erreurs sans secrets, contrôle de doublon du couple bail/période seulement si la règle métier le confirme (paiements fractionnés possibles à définir).
- Ne pas déclencher d'encaissement, de caution, de quittance ou de notification réelle à partir d'une opération fictive.

## Critères de recette

- Lecture authentifiée des 12 appartements réels REC, sans données figées dans le navigateur ; aucun import ou modification du référentiel induit par l'ouverture de la Saisie.
- Préremplissage exact du bon locataire et du loyer à la date choisie, notamment après changement de loyer ou de bail.
- Rejet des logements inactifs, baux terminés, deux baux simultanés, montant invalide, session expirée et mauvaise cible.
- Transaction TEST REC enregistrée une seule fois après confirmation du backend, visible uniquement dans les vues REC dédiées ; aucun accès aux écritures depuis Pages ou le PIN fictif.
- Vérification explicite : zéro écriture PROD, zéro modification du classeur PROD, zéro secret exposé au front.

## Prochaine tranche de développement

Avant tout essai réel : revue et fusion explicites des PR frontend, passerelle statique et API, configuration complète REC, contrôle de l'authentification, du classeur et du référentiel des 12 appartements. La propriété `REC_TEST_TRANSACTIONS` reste absente par défaut (écriture refusée). La **Synthèse TEST REC** ne présente que les encaissements fictifs et ne constitue pas une caisse consolidée ni une analyse des transactions réelles. La Synthèse de démonstration reste inchangée.

Tests préparatoires : `node --test tests/location-entry.test.mjs`.
