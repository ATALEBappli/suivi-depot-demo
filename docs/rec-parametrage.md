# Paramétrage REC intégré — pas encore raccordé ou publié

La même interface (navigation, Synthèse existante, Paramétrage US-015) est servie
sur Cloud Run, sur une origine indépendante des dépôts Pages du même compte.
L'URL Pages historique reste un point d'entrée public : après configuration, elle
redirige vers Cloud Run AVANT toute connexion, création de ticket ou requête métier.
Les sessions ne sont jamais créées sur l'origine partagée atalebappli.github.io.
Le changement de domaine est nécessaire : deux chemins Pages ne sont pas une
frontière de sécurité navigateur. Pas d'iframe Cloud Run dans Pages.

Les trois modules finance restent inchangés et fictifs. Aucun écran Saisie autonome
raccordé n'était présent dans main. Le sous-dossier referentiel conserve les
fonctionnalités PR #17 : normalisation, listes, import Excel/CSV/JSON et confirmation.
Les cautions restent limitées au montant contractuel, pas aux mouvements financiers.

Le PIN public ne donne aucun accès REC. Le compte Google Hotmail doit être vérifié
par OpenID et autorisé par email+sub côté serveur et Apps Script. La création d'un
compte Google avec une adresse Hotmail est possible ; ce n'est pas une connexion
Microsoft et le fonctionnement de CE compte doit encore être prouvé lors d'une
connexion réelle. Aucun mot de passe, token ou client secret n'est demandé dans Git
ou la conversation. Le navigateur reçoit une session applicative courte en mémoire,
pas un jeton Google. Reconnexion après actualisation ; pas de cookie tiers/popup.

Configuration reproductible :

1. Synchroniser US-015 depuis le checkout backend :

       node scripts/prepare-rec-reference.mjs /chemin/suivi-depot-demo/referentiel

2. Revoir et committer le front. Exporter CE SHA approuvé vers une sortie neuve,
   dans le contexte Cloud Run du dépôt backend (pas vers Pages) :

       node scripts/prepare-cloud-run-site.mjs <SHA_40_FRONT_APPROUVE> /chemin/suivi-depot-app/rec-server/public

   L'export lit les blobs Git comme données, n'exécute aucun build et exclut les
   secrets, tests, docs, scripts et configurations privées. Il produit un manifeste
   avec empreintes ; le serveur vérifie les assets avant son démarrage. La config
   /rec-config.mjs de Cloud Run est générée avec sa propre origine uniquement.

3. Après confirmation/autorisations du service, préparer la redirection Pages :

       REC_SERVER_URL=https://<service-REC>.run.app node scripts/configure-rec.mjs
       node --test tests/configure-rec.test.mjs

   Ce diff ne contient que l'URL publique, sans secret. La CSP Pages garde
   connect-src none : aucune requête API avant la redirection. Faire revoir puis
   autoriser séparément la publication Pages. Ne pas fusionner maintenant.

La passerelle et son audit sont documentés dans suivi-depot-app/docs/rec/.
Le contexte Docker contient les assets exportés et le code serveur, jamais les
secrets. Sans assets valides, le serveur refuse de démarrer. Aucun nouveau workflow.

Recette iPhone après autorisation : ouvrir le lien Pages → vérifier la redirection
vers l'origine REC Cloud Run → Paramétrage → connexion du compte Google Hotmail.
Refuser le mauvais compte. Vérifier REC et V2 inactive ; simuler l'Excel fourni :
12 lignes / 220000 DA, dates et cautions vides, conflits affichés sans écriture.
Tester expiration, reconnexion, déconnexion et absence de données dans le cache.
L'import réel et REFERENTIEL_V2=1 nécessitent une validation distincte. Tester Safari
réel, pas seulement le viewport mobile Chromium. Si XLSX n'est pas pris en charge,
CSV UTF-8 conserve le parcours sécurisé. Les finances restent une démonstration.
