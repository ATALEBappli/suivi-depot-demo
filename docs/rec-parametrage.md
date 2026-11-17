# Paramétrage REC intégré — non raccordé par défaut

Cette branche ajoute #parametrage à la navigation existante et reprend les
formulaires US-015 de suivi-depot-app, sans changer les trois modules finance.
La Synthèse reste une démonstration ; aucun écran Saisie autonome raccordé n'était
présent dans main. Les libellés du site distinguent données fictives et accès REC.
Les fonctions de caution se limitent au montant contractuel prévu dans une location ;
aucun mouvement financier n'est ajouté.

Le PIN public de démonstration ne donne aucun accès aux données Google. Paramétrage
exige une authentification Google Hotmail autorisée via la passerelle Cloud Run REC.
Le navigateur ne reçoit aucun secret OAuth, refresh token, ID token Google ou clé
Apps Script. Un bearer de session applicative court reste seulement en mémoire,
avec un PKCE éphémère dans sessionStorage pendant la navigation de connexion.
Une actualisation impose une reconnexion ; la session n'est jamais persistée dans
localStorage. CORS/erreurs/expiration sont gérés sans cookie tiers ni popup.

rec-config.mjs est vide par défaut. L'accès actuel Apps Script MYSELF n'est pas
supposé utilisable par Hotmail. La passerelle, ses secrets, les listes de droits et
le transport signé du backend doivent être configurés et autorisés séparément.
Aucun fichier de cette branche n'est déployé et aucune donnée réelle n'est embarquée.

La source du modèle et des formulaires est dans suivi-depot-app. Pour les synchroniser :

    node scripts/prepare-rec-reference.mjs /chemin/suivi-depot-demo/referentiel

Puis, seulement après confirmation du Cloud Run REC et revue de la configuration :

    REC_SERVER_URL=https://<service-REC>.run.app node scripts/configure-rec.mjs
    node --test tests/configure-rec.test.mjs

Le service et la procédure détaillée sont dans suivi-depot-app/docs/rec/.
La fusion de main peut déclencher Pages selon le paramétrage existant : ne fusionner
et ne publier qu'après autorisation. Ne pas remplacer le site par l'ancien export
demo/ de suivi-depot-app, qui ne contient pas les derniers écrans financiers.

Recette : connexion Hotmail → vérifier REC/V2 inactive → simuler le fichier Excel
fourni (12 lignes, 220000 DA, dates/cautions vides) → observer conflits sans écriture.
Ne confirmer aucun import tant que REFERENTIEL_V2=1 n'a pas été autorisé séparément.
Après activation de recette : importer une fois, actualiser/reconnecter, retrouver
les fiches et réimporter sans doublon. Tester refus du mauvais compte, session
expirée, déconnexion et échec réseau. Vérifier que Synthèse et ses filtres restent
fictifs et identiques. Si Safari ne lit pas XLSX, utiliser CSV UTF-8.

Le parcours automatisé complet, avec OAuth/Cloud Run/Apps Script/Sheets simulés,
est dans suivi-depot-app/tests/rec-server/browser.mjs ; définir REC_FRONT_DIR sur
ce checkout. Il bloque toute destination externe et couvre desktop/390 px. Cela
ne remplace pas une recette Safari réelle après raccordement autorisé.
