/**
 * The guides in French. Same slugs, order and related routes as the
 * English ones in docs-guides.ts; a test fails if the two drift apart.
 *
 * Button names are quoted as the French interface shows them, so a step
 * can be followed by looking for the exact words on screen.
 */

import type { DocGuide } from "./docs-guides";

export const DOC_GUIDES_FR: DocGuide[] = [
  {
    slug: "install",
    title: "Installer et démarrer",
    summary: "Télécharger, double-cliquer sur un fichier, et c’est parti.",
    minutes: 5,
    group: "start",
    steps: [
      {
        do: "Téléchargez le ZIP depuis la page des versions et décompressez-le où vous voulez.",
        then: "Un seul dossier, et un seul fichier utile : SEO Tool.cmd sous Windows, SEO Tool.command sur Mac.",
      },
      {
        do: "Double-cliquez sur ce fichier.",
        then: "Un panneau de contrôle s’ouvre dans le navigateur. Le premier lancement installe et compile : 3 à 5 minutes, une seule fois.",
      },
      {
        do: "Cliquez sur Start.",
        then: "L’application s’ouvre sur son propre port et y reste.",
      },
      {
        do: "Utilisez Add to Desktop dans le panneau de contrôle.",
        then: "Ensuite, elle est à un clic depuis votre bureau.",
      },
    ],
    note: "Node 20 ou plus récent doit être installé. Rien d’autre : pas de base de données à configurer, pas de clé API.",
  },
  {
    slug: "first-client",
    title: "Ajouter votre premier site",
    summary: "Ce qui se passe quand vous ajoutez un client, et quoi faire pendant que ça tourne.",
    minutes: 8,
    group: "start",
    steps: [
      { do: "Allez dans Clients et cliquez sur Ajouter un client." },
      {
        do: "Collez l’adresse du site et donnez-lui un nom.",
        then: "Le reste est facultatif. La niche peut rester vide.",
      },
      {
        do: "Validez.",
        then: "Vous arrivez sur l’assistant de démarrage en une demi-seconde. Vous n’attendez jamais.",
      },
      {
        do: "Suivez la barre en haut : le site est en cours d’analyse.",
        then: "Un crawl complet tourne en arrière-plan pendant que vous remplissez les étapes en dessous. Sur un site de 25 pages, comptez environ une minute.",
      },
      { do: "Remplissez l’étape marque, puis cliquez sur Lancer la découverte des mots-clés." },
      {
        do: "À la dernière étape, cliquez sur Générer le plan 30 jours.",
        then: "Les tâches sont créées avec leurs échéances, regroupées par semaine.",
      },
      {
        do: "Créez le document d’approbation.",
        then: "Un PDF pour le client : ce qui a été trouvé, où en sont ses mots-clés aujourd’hui, et ce qui sera fait chaque semaine.",
      },
    ],
    related: ["/clients", "/audits", "/tasks", "/proposals"],
  },
  {
    slug: "connect-ai",
    title: "Brancher une IA, ou pas",
    summary: "La plupart des outils n’ont besoin d’aucune IA. Voici ce qu’il faut pour les autres.",
    minutes: 4,
    group: "start",
    steps: [
      {
        do: "Ouvrez les Réglages et trouvez la connexion IA.",
        then: "Tout ce qui porte l’étiquette Gratuit dans la barre latérale ou sur une carte d’outil fonctionne déjà, sans rien brancher.",
      },
      {
        do: "Choisissez comment vous connecter.",
        then: "Une clé API, ou l’abonnement Claude / ChatGPT que vous payez déjà, via MCP. Les deux pilotent exactement les mêmes outils.",
      },
      {
        do: "Avec un abonnement : copiez le bloc de configuration, collez-le dans Claude Desktop, Claude Code ou Cursor, puis redémarrez-le.",
        then: "Votre application de chat se connecte à l’outil. C’est votre abonnement qui rédige ; rien n’est facturé à l’usage.",
      },
      {
        do: "Avec une clé : collez-la chez le fournisseur de votre choix. Gemini et Groq ont des offres gratuites.",
        then: "Les clés sont chiffrées et stockées sur votre propre machine.",
      },
    ],
    note: "Une vraie différence : un abonnement ne rédige que quand vous êtes devant l’écran. Tout ce qui tourne sans vous (audits de nuit, rapports planifiés, alertes) demande une clé.",
    related: ["/settings", "/connect"],
  },
  {
    slug: "connect-chat-app",
    title: "Brancher Claude ou ChatGPT sur l’outil",
    summary: "Trois applications sur quatre se branchent sans rien installer. Seule la version navigateur demande un tunnel.",
    minutes: 6,
    group: "start",
    steps: [
      {
        do: "Choisissez l’application que vous branchez.",
        then: "Claude Desktop, Claude Code et Cursor tournent sur cet ordinateur et le joignent directement. claude.ai et ChatGPT tournent sur leurs propres serveurs et vous appellent : ils ne peuvent pas.",
      },
      {
        do: "Ouvrez les Réglages, choisissez Mon abonnement Claude / ChatGPT, et générez un jeton.",
        then: "Le point d’accès reste fermé tant que vous ne l’avez pas fait. Ce jeton permet de lire tous les clients et de modifier les sites en ligne : gardez-le comme un mot de passe.",
      },
      {
        do: "Choisissez votre application dans les onglets et copiez la commande ou la configuration affichée.",
        then: "Le port, le chemin du dossier et le jeton sont déjà remplis : rien à remplacer.",
      },
      {
        do: "Redémarrez l’application, puis vérifiez la connexion.",
        then: "Dans Claude Code, tapez /mcp. Le badge des Réglages passe au vert dès qu’un appel est vraiment arrivé.",
      },
      {
        do: "Pour claude.ai ou ChatGPT uniquement : lancez d’abord un tunnel.",
        then: "cloudflared tunnel --url <adresse de l’app> affiche une adresse https. Utilisez-la suivie de /api/mcp comme URL du connecteur. Les deux refusent le http simple et ne voient pas localhost.",
      },
    ],
    note: "Un tunnel met ce point d’accès sur internet, protégé seulement par le jeton. Coupez le tunnel quand vous ne vous en servez pas. Si vous n’utilisez que Claude Desktop, Claude Code ou Cursor, vous n’en avez jamais besoin.",
    related: ["/settings", "/docs"],
    links: [
      {
        label: "Claude Code — documentation MCP",
        href: "https://code.claude.com/docs/en/mcp",
      },
      {
        label: "Claude Desktop — démarrage rapide MCP",
        href: "https://modelcontextprotocol.io/quickstart/user",
      },
      {
        label: "Cursor — documentation MCP",
        href: "https://docs.cursor.com/context/model-context-protocol",
      },
      {
        label: "Cloudflare Tunnel — télécharger cloudflared",
        href: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
      },
      {
        label: "Claude — authentification des connecteurs par en-tête (bêta)",
        href: "https://claude.com/docs/connectors/custom/remote-mcp",
      },
      {
        label: "Anthropic — tunnels MCP officiels (aperçu)",
        href: "https://platform.claude.com/docs/en/agents-and-tools/mcp-tunnels/quickstart",
      },
    ],
  },
  {
    slug: "audit",
    title: "Auditer un site et corriger ce qu’il trouve",
    summary: "Crawler, lire les problèmes par gravité, puis les corriger.",
    minutes: 10,
    group: "daily",
    steps: [
      {
        do: "Ouvrez Audits et choisissez un client, ou lancez un contrôle ponctuel avec l’outil health check.",
      },
      {
        do: "Cliquez sur Audit rapide ou Audit complet.",
        then: "Le rapide lit quelques pages, le complet crawle le site. Les deux respectent le robots.txt.",
      },
      {
        do: "Lisez les problèmes de haut en bas, les critiques d’abord.",
        then: "Chacun dit ce qu’il est, pourquoi il compte et quelles URL sont touchées.",
      },
      {
        do: "Ouvrez un problème et utilisez l’assistant de correction quand il est proposé.",
        then: "Vous obtenez la modification exacte pour votre plateforme, prête à copier.",
      },
      {
        do: "Marquez ce qui ne s’applique pas comme ignoré ou faux positif.",
        then: "Ce choix est conservé : relancer l’audit ne le fera pas réapparaître.",
      },
      {
        do: "Relancez l’audit pour confirmer.",
        then: "Comparez avec l’audit précédent pour voir ce qui a vraiment bougé.",
      },
    ],
    related: [
      "/audits",
      "/tools/health-check",
      "/tools/link-checker",
      "/tools/redirects-bulk",
    ],
  },
  {
    slug: "keywords",
    title: "Trouver et suivre des mots-clés",
    summary: "Découvrir, suivre, et repérer ceux qui sont proches de la première page.",
    minutes: 8,
    group: "daily",
    steps: [
      { do: "Ouvrez Mots-clés suivis pour un client." },
      {
        do: "Lancez la découverte à partir d’un mot ou du site lui-même.",
        then: "Les suggestions viennent de l’autocomplétion Google, des « Autres questions posées » et des recherches associées. Aucune clé nécessaire.",
      },
      { do: "Sélectionnez ceux qui valent la peine d’être suivis et ajoutez-les." },
      {
        do: "Laissez les positions s’accumuler quelques jours.",
        then: "Les positions sont relevées dans un vrai navigateur : plus lent qu’une API payante, mais gratuit.",
      },
      {
        do: "Regardez la vue des gains rapides.",
        then: "Tout ce qui est entre la 11e et la 20e place est à une bonne modification de la première page.",
      },
    ],
    related: [
      "/keywords",
      "/tools/search-volume",
      "/tools/cluster",
      "/tools/cannibalization",
    ],
  },
  {
    slug: "write-article",
    title: "Rédiger et publier un article",
    summary: "D’un mot-clé à un article en ligne sur WordPress, avec son balisage Schema et ses posts réseaux sociaux.",
    minutes: 15,
    group: "daily",
    steps: [
      {
        do: "Ouvrez Rédaction et choisissez le client.",
        then: "Pas d’idée de sujet ? Les Outils de contenu proposent un arbre de questions et une mesure de couverture du sujet ; chaque ligne devient un article en un clic avec « Écrire dessus ».",
      },
      {
        do: "Tapez le mot-clé principal et cliquez sur Créer l’article.",
        then: "« Trouver des idées » propose des recherches proches, avec leur intention, si vous voulez d’abord un meilleur mot-clé.",
      },
      {
        do: "Cliquez sur Générer le plan, corrigez-le, puis Valider le plan.",
        then: "Une ligne « ## » par section, « ### » pour une sous-partie, et des lignes « ? » sous « ## FAQ » pour les questions.",
      },
      {
        do: "Cliquez sur Rédiger l’article.",
        then: "Jusqu’à deux minutes. Vous obtenez le texte en Markdown avec son meta title et sa meta description, tous modifiables.",
      },
      {
        do: "Cliquez sur Analyser le top 10 et travaillez le score SEO.",
        then: "Termes essentiels manquants, longueur et questions sont comparés aux pages qui se classent aujourd’hui. Le score se met à jour pendant que vous écrivez.",
      },
      {
        do: "Enregistrez, puis descendez jusqu’à Diffusion.",
        then: "Envoyez l’article en brouillon WordPress ou publiez-le directement. Le balisage Article et FAQ part avec lui.",
      },
      {
        do: "Pas de WordPress ? Exportez pour Ghost, Webflow ou Hugo, ou collez-le vous-même puis cliquez sur Marquer comme publié avec son URL.",
      },
      {
        do: "Générez les posts réseaux sociaux et l’extrait de newsletter, puis copiez-les.",
      },
      {
        do: "Quand quelques articles sont en ligne, téléchargez le llms.txt depuis les Outils de contenu et déposez-le à la racine du site.",
        then: "Il présente le site à ChatGPT, Claude et Perplexity.",
      },
    ],
    note: "Sans clé IA, le plan et l’article sont des squelettes à compléter vous-même. Le score face au top 10, les exports et le balisage Schema fonctionnent quand même.",
    related: ["/content", "/keywords", "/clients"],
  },
  {
    slug: "client-report",
    title: "Faire valider un plan par un client",
    summary: "Un seul document : les constats, le point de départ, et le plan semaine par semaine.",
    minutes: 6,
    group: "clients",
    steps: [
      {
        do: "Terminez l’assistant de démarrage du client, ou lancez un audit et générez un plan 30 jours.",
        then: "Le document est construit à partir de vrais constats : il refuse de se générer à partir de rien.",
      },
      { do: "Créez le document d’approbation." },
      {
        do: "Ouvrez le PDF et relisez-le.",
        then: "Les problèmes par gravité, les mots-clés suivis et leur position actuelle, et le travail semaine par semaine.",
      },
      {
        do: "Modifiez le paragraphe d’introduction, et ajoutez vos tarifs si vous facturez.",
        then: "Les tarifs sont vides au départ : l’outil n’a aucune base pour chiffrer votre travail.",
      },
      {
        do: "Envoyez-le, puis marquez-le comme accepté quand le client est d’accord.",
        then: "Les chiffres de départ sont figés, pour que le rapport du mois suivant ait un point de comparaison.",
      },
    ],
    related: ["/proposals", "/reports"],
  },
  {
    slug: "monthly-report",
    title: "Produire le rapport mensuel",
    summary: "Tous les chiffres sont déjà collectés. Vous choisissez seulement la forme.",
    minutes: 5,
    group: "clients",
    steps: [
      { do: "Ouvrez Rapports et choisissez le client et la période." },
      {
        do: "Choisissez un modèle.",
        then: "Exécutif, détaillé, technique, ou une version direction (CEO, CMO) : mêmes données, présentation différente.",
      },
      {
        do: "Relisez le résumé et modifiez-le.",
        then: "Les chiffres viennent de la base de données. Seule la rédaction est faite par l’IA, et seulement si vous en avez branché une.",
      },
      {
        do: "Exportez le PDF, ou envoyez un lien vers le portail pour que le client le voie en direct.",
      },
    ],
    related: ["/reports", "/reports/batch"],
  },
  {
    slug: "team",
    title: "Donner à l’équipe ses propres accès",
    summary: "Un compte par personne, le bon rôle, et seulement les clients sur lesquels elle travaille.",
    minutes: 5,
    group: "running",
    steps: [
      {
        do: "Ouvrez Paramètres → Équipe et cliquez sur « Activer les comptes ».",
        then: "Vous créez le premier compte et devenez propriétaire. Ensuite, tout le monde se connecte sur la page de connexion.",
      },
      {
        do: "Dans « Inviter quelqu’un », saisissez son e-mail, choisissez un rôle et cliquez sur « Créer le lien ».",
        then: "Le lien ne sert qu’une fois et expire dans sept jours. Aucun e-mail n’est envoyé : transmettez-le vous-même.",
      },
      {
        do: "Choisissez le rôle selon ce que la personne doit pouvoir toucher.",
        then: "Manager : tous les clients et tout le travail. Membre : uniquement les clients qui lui sont assignés. Client (lecture seule) : pour un contact client qui suit l’avancement. L’équipe, les clés d’intégration et les sauvegardes restent au propriétaire.",
      },
      {
        do: "Pour un membre ou un client, cliquez sur son nombre de clients, cochez ceux qu’il peut voir, puis « Enregistrer l’accès ».",
        then: "Le tableau de bord, les tâches, les rapports et les mots-clés sont filtrés sur ces clients.",
      },
      {
        do: "Pour retirer quelqu’un, cliquez sur « Désactiver ».",
        then: "La personne est déconnectée immédiatement. Son historique est conservé.",
      },
      {
        do: "Pour partir, ouvrez le menu du profil et cliquez sur « Se déconnecter ».",
        then: "Vous revenez sur la page de connexion.",
      },
    ],
    related: ["/settings/team"],
    note: "Changer le rôle de quelqu’un ou le désactiver le déconnecte aussitôt : une personne retirée ne peut pas continuer depuis un onglet resté ouvert.",
  },
  {
    slug: "update-backup",
    title: "Mettre à jour, sauvegarder, changer de machine",
    summary: "Les trois depuis le panneau de contrôle. Pas de terminal.",
    minutes: 4,
    group: "running",
    steps: [
      {
        do: "Double-cliquez sur SEO Tool.cmd (ou .command) pour ouvrir le panneau de contrôle.",
      },
      {
        do: "Cliquez sur Update.",
        then: "Récupère la dernière version et recompile. Votre base de données n’est pas touchée.",
      },
      {
        do: "Cliquez sur Backup avant toute opération risquée.",
        then: "Écrit une copie horodatée de la base dans backups/.",
      },
      {
        do: "Pour changer de machine : sauvegardez, copiez tout le dossier, puis double-cliquez sur le même fichier là-bas.",
        then: "Tout vit dans ce dossier. Rien n’est installé ailleurs.",
      },
      {
        do: "Sur un serveur avec Docker, mettez à jour depuis le dossier de l’app avec git pull, puis docker compose up -d --build.",
        then: "La base de données est dans un volume Docker : la reconstruction la conserve.",
      },
    ],
    note: "Vos données ne quittent jamais la machine ou le serveur où l’outil tourne. Pas de compte en ligne, rien à synchroniser.",
  },
];
