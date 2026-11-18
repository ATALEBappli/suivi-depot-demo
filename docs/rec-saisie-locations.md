# Intégration de la saisie des locations — préparation REC

Décision du 18 novembre 2026 : utiliser **les 12 appartements du référentiel réel en REC**, mais effectuer **exclusivement des transactions fictives en REC**. Ne jamais modifier PROD ni Google Sheets PROD.

## État et périmètre

- `location-entry.mjs` prépare les listes à partir de la réponse authentifiée `v2.read` et construit une intention de paiement explicitement marquée `environment: REC`, `testOnly: true`.
- Aucune liste de noms, loyer réel, adresse ou identifiant d'appartement n'est incluse dans le dépôt.
- Aucune écriture ni connexion Google n'est initiée par ce module. Le backend existant n'autorise que `rec.status`, `v2.read`, `v2.simulate`, `v2.write` et `v2.import` ; il **ne possède pas encore d'API de transactions financières REC**.
- En conséquence, une transaction préparée n'est **pas** une transaction enregistrée. L'écran ne doit jamais afficher un message de succès persistant sur la seule base de cet objet.

## Parcours cible

1. Ouvrir la Saisie depuis l'interface authentifiée REC (session Google Hotmail autorisée, **jamais** le PIN fictif).
2. Sélectionner `Entrée → Dépôt locatif → Loyer` dans le formulaire dynamique commun. Les autres activités restent `HEADM — Construction`, `Charges communes`, `Famille / Divers`.
3. Lire `v2.read` via la passerelle serveur de même origine. Refuser absence de session, mauvaise cible, retour incomplet ou V2 indisponible. Proposer les appartements actifs ayant un bail actif à la date d'opération ; aucune copie statique du référentiel.
4. Après sélection, afficher numéro/type, locataire issu du bail, loyer en vigueur à la date choisie ; préremplir le montant modifiable, la période de loyer et la date. Changement de date = nouveau calcul du bail et du loyer, réinitialisation de toute sélection invalide.
5. Permettre une transaction **TEST REC** seulement. Afficher une confirmation détaillant logement, période, montant et caractère fictif avant envoi. Empêcher les doubles clics.
6. Après réponse serveur confirmée, rafraîchir les transactions REC et la Synthèse REC, indépendamment de la fixture de démonstration. Ne pas mélanger transactions de test avec les données historiques/PROD.

## Backend à préparer avant toute écriture

- Créer un endpoint dédié aux écritures de test (nom à valider, proposition `rec.transaction.test.create`), dans les listes blanches du Worker, de la passerelle et d'Apps Script REC, **sans** ouvrir l'ancien `action=add` JSONP.
- Exiger identité REC authentifiée, rôle autorisé, environnement et empreintes REC vérifiés, permission d'écriture explicitement activée ; aucun repli vers PROD.
- Validation serveur stricte : `testOnly === true`, IDs logement/bail/locataire existants et cohérents, dates/période, montant positif, devise DA, rattachement à l'activité locative, mode de paiement autorisé.
- Enregistrer la nature fictive de manière **persistante** (`is_test`, auteur, horodatage, `requestId` idempotent) afin de filtrer et purger les essais sans toucher aux opérations réelles. Une simple mention « TEST » dans la description ne suffit pas.
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

Brancher le nouveau formulaire sur `rec-client.request({action:'v2.read'})` après authentification, puis implémenter le endpoint transactionnel sécurisé et la lecture de la Synthèse REC **avant d'autoriser le bouton Enregistrer**. Tant que ce contrat serveur manque, le bouton doit rester inactif ou limité à un aperçu local non persistant.

Tests préparatoires : `node --test tests/location-entry.test.mjs`.
