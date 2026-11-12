/**
 * French text of the task templates and playbooks.
 *
 * The English templates (niche-templates.ts, tech-stack-templates.ts) stay
 * the source of truth: the site preflight and the de-duplication are keyed
 * by the English title. This file only maps an English title to what a
 * French workspace reads. `template-i18n.test.ts` fails when a template has
 * no entry here.
 *
 * Entry shape: [title, description, whyItMatters].
 */

export const PLAYBOOKS_FR: Record<string, { name: string; description: string }> = {
  "weekly-health-check": {
    name: "Contrôle de santé hebdomadaire",
    description:
      "Ce que tout SEO fait en premier le lundi : repérer les chutes de positions, les soucis d'indexation et les pages cassées avant que le client ne les voie.",
  },
  "monthly-content-refresh": {
    name: "Rafraîchissement mensuel des contenus",
    description:
      "Trouver les pages en perte de vitesse, les mettre à jour et les relancer. L'activité SEO récurrente la plus rentable pour un site de contenu.",
  },
  "monthly-technical-audit": {
    name: "Audit technique mensuel",
    description:
      "Le passage en revue technique : liens cassés, redirections, données structurées, Core Web Vitals, indexabilité. On traite la dette avant qu'elle ne s'accumule.",
  },
  "monthly-competitor-watch": {
    name: "Veille concurrentielle mensuelle",
    description:
      "Ce que vos 3 principaux concurrents ont fait ce mois-ci : contenus, backlinks, positions gagnées. Reprenez ce qui marche.",
  },
  "new-client-onboarding": {
    name: "Démarrage d'un nouveau client",
    description:
      "Les 14 premiers jours avec un nouveau client : connecter Search Console et GA4, prendre les mesures de départ, obtenir des gains rapides et installer la confiance.",
  },
  "traffic-drop-recovery": {
    name: "Récupération après une chute de trafic",
    description:
      "À lancer quand Search Console montre une chute soudaine. Diagnostiquez la cause avec méthode avant de supposer : la plupart des chutes ont l'une de cinq causes.",
  },
  "quarterly-strategy-review": {
    name: "Revue stratégique trimestrielle",
    description:
      "Prendre du recul tous les 90 jours. Voir ce qui a marché, arrêter ce qui n'a pas marché, préparer le trimestre suivant.",
  },
};

export const PLAYBOOK_CATEGORIES_FR: Record<string, string> = {
  weekly: "hebdomadaire",
  monthly: "mensuel",
  quarterly: "trimestriel",
  launch: "lancement",
  recovery: "récupération",
};

export const TEMPLATES_FR: Record<string, [string, string, string]> = {
  // ── Niche: local ────────────────────────────────────────────────
  "Claim and verify your Google Business Profile": [
    "Revendiquer et valider votre fiche Google Business Profile",
    "Cherchez le nom de votre entreprise sur Google. Si la fiche à droite affiche « Vous êtes propriétaire de cet établissement ? », cliquez dessus et validez.",
    "La fiche Google Business Profile est le premier facteur de classement en SEO local. Tant qu'elle n'est pas validée, vous ne pouvez pas apparaître dans le pack local.",
  ],
  "Confirm NAP consistency across the web": [
    "Vérifier la cohérence du NAP sur le web",
    "Assurez-vous que le nom, l'adresse et le téléphone sont strictement identiques sur votre site, votre fiche Google, Facebook, les Pages Jaunes et les principaux annuaires.",
    "Google utilise la cohérence du NAP comme signal de confiance pour les entreprises locales. Même un petit écart (« av. » ou « avenue ») peut affaiblir le classement local.",
  ],
  "Set up a system to request Google reviews": [
    "Mettre en place une demande d'avis Google systématique",
    "Générez un lien d'avis court depuis votre fiche Google et ajoutez-le aux signatures d'e-mail, aux factures et aux messages de suivi.",
    "Le nombre d'avis et leur fraîcheur comptent directement dans le classement du pack local. Visez au moins 1 à 2 nouveaux avis par mois.",
  ],
  "Add LocalBusiness schema to your homepage": [
    "Ajouter le schéma LocalBusiness à la page d'accueil",
    "Ajoutez des données structurées JSON-LD avec name, address, telephone, openingHours et les coordonnées geo.",
    "Le schéma LocalBusiness aide Google à comprendre que vous avez un établissement physique et ouvre l'accès aux résultats enrichis.",
  ],
  "Build dedicated landing pages for each service area": [
    "Créer une page dédiée par zone desservie",
    "Si vous intervenez dans plusieurs villes, créez une page par ville avec un contenu unique (pas un simple remplacement du nom de la ville).",
    "Une page générique « nous intervenons dans toute la région » ne se classe pas sur les recherches par ville. Une page dédiée par ville, si.",
  ],
  "Audit local citations for accuracy": [
    "Contrôler l'exactitude des citations locales",
    "Vérifiez vos fiches sur les Pages Jaunes, Facebook, Yelp, Apple Plans, Bing Places, ainsi que 5 à 10 annuaires spécialisés de votre secteur.",
    "Des citations périmées brouillent votre adresse et votre téléphone réels aux yeux de Google. Nettoyez-les pour regrouper les signaux.",
  ],

  // ── Niche: ecommerce ────────────────────────────────────────────
  "Add Product schema to every product page": [
    "Ajouter le schéma Product à chaque fiche produit",
    "Utilisez du JSON-LD avec name, image, description, sku, brand, offers (prix, disponibilité) et aggregateRating.",
    "Le schéma Product débloque les résultats enrichis dans Google (prix, stock, notes), ce qui améliore directement le taux de clic et la qualité des visites.",
  ],
  "Optimize product image file sizes and alt text": [
    "Optimiser le poids et le texte alternatif des images produit",
    "Lancez un audit d'images en masse. Convertissez en WebP, visez moins de 100 Ko par image et rédigez un texte alternatif descriptif avec le nom du produit et ses attributs clés.",
    "Les images pèsent sur le LCP des fiches produit et ouvrent le trafic de Google Images, qui convertit bien en e-commerce.",
  ],
  "Audit faceted navigation for indexable junk URLs": [
    "Auditer la navigation à facettes : URL inutiles indexables",
    "Contrôlez les filtres et les paramètres de tri. Tout ce qui crée des URL quasi identiques (color=red&size=L et size=L&color=red) doit recevoir une balise canonique ou un noindex.",
    "Des facettes non maîtrisées peuvent générer des millions de pages sans valeur, qui gaspillent le budget de crawl et créent du contenu dupliqué.",
  ],
  "Write unique copy for category and collection pages": [
    "Rédiger un texte unique pour les pages de catégorie et de collection",
    "Ajoutez une introduction de 100 à 300 mots à chaque grande catégorie, au-dessus de la grille de produits, qui traite l'intention d'achat et les attributs clés.",
    "Les pages de catégorie se classent souvent sur les requêtes commerciales les plus recherchées, à condition d'avoir du contenu en plus de la grille de produits.",
  ],
  "Set up clean breadcrumb navigation with schema": [
    "Mettre en place un fil d'Ariane propre, avec son schéma",
    "Un fil d'Ariane visible (Accueil › Catégorie › Sous-catégorie › Produit) et le JSON-LD BreadcrumbList.",
    "Le fil d'Ariane améliore le maillage interne et la profondeur de navigation, et s'affiche dans les résultats Google.",
  ],
  "Plan how to handle out-of-stock products": [
    "Définir la règle pour les produits en rupture de stock",
    "Décidez : garder la page en ligne avec la mention « rupture de stock » (bon pour le SEO), rediriger vers la catégorie, ou renvoyer un 410. Écrivez la règle.",
    "Supprimer les pages trop vite détruit les positions et les backlinks acquis. Les garder en ligne avec le bon schéma est en général le meilleur choix.",
  ],

  // ── Niche: saas ─────────────────────────────────────────────────
  "Build comparison pages for each major competitor": [
    "Créer une page de comparaison par concurrent majeur",
    "Créez des pages « [Votre produit] vs [Concurrent] » honnêtes et détaillées, avec des tableaux de fonctions. Visez 5 à 10 pages.",
    "Les requêtes de comparaison viennent en fin de parcours, avec une forte intention. Ces pages captent les acheteurs qui vous évaluent.",
  ],
  "Build integration pages for every tool you connect to": [
    "Créer une page par intégration proposée",
    "Une page par intégration (par exemple « /integrations/slack ») qui décrit le cas d'usage, la mise en place et le bénéfice.",
    "Les acheteurs cherchent « intégration X Y » avant d'acheter. Ces pages captent cette intention et servent aussi de support commercial.",
  ],
  "Set up programmatic SEO for use-case landing pages": [
    "Lancer du SEO programmatique pour les pages de cas d'usage",
    "Repérez un modèle répétable (par exemple « Suivi du temps pour [secteur] ») et publiez 20 à 100 variantes à partir d'un seul gabarit et d'un jeu de données.",
    "Le SEO programmatique est l'un des meilleurs leviers pour un SaaS : il étend fortement la couverture des cas d'usage de longue traîne.",
  ],
  "Write SoftwareApplication schema for your homepage": [
    "Ajouter le schéma SoftwareApplication à la page d'accueil",
    "Ajoutez un JSON-LD avec applicationCategory, offers (les formules tarifaires) et aggregateRating issu de vrais avis.",
    "Aide Google à vous placer dans les fonctions de recherche propres aux logiciels et à afficher des extraits avec avis quand c'est possible.",
  ],
  "Build a deep, hub-and-spoke help center": [
    "Construire un centre d'aide complet, organisé en étoile",
    "Un hub central /docs qui pointe vers chaque article de fonction. Les articles visent les requêtes informationnelles des utilisateurs, et se classent.",
    "La documentation est un contenu de qualité qui reçoit des liens naturellement. Beaucoup de sites SaaS se classent sur les questions produit grâce à elle seule.",
  ],
  "Add FAQ schema to pricing and feature pages": [
    "Ajouter le schéma FAQ aux pages de tarifs et de fonctions",
    "Placez de vraies questions et réponses dans un JSON-LD FAQPage, sur les pages où les visiteurs ont des questions avant d'acheter.",
    "Les résultats enrichis FAQ occupent plus de place dans la recherche et améliorent le taux de clic des pages à intention commerciale.",
  ],

  // ── Niche: blog ─────────────────────────────────────────────────
  "Build a content calendar for the next 90 days": [
    "Établir un calendrier éditorial pour les 90 prochains jours",
    "Prévoyez 1 à 2 articles par semaine, rattachés à des cocons thématiques, avec les mots-clés visés et les liens vers les pages piliers.",
    "Publier régulièrement sur un plan thématique clair vaut mieux que des articles épisodiques. La profondeur d'un sujet est un signal d'autorité pour Google.",
  ],
  "Identify your top 3 topic clusters and pillar pages": [
    "Définir vos 3 cocons thématiques et leurs pages piliers",
    "Choisissez les 3 sujets les plus larges que vous voulez dominer. Pour chacun, prévoyez une page pilier de plus de 3 000 mots et 5 à 10 articles de soutien.",
    "L'autorité thématique, c'est-à-dire couvrir un sujet en profondeur, est l'un des signaux de qualité les plus forts pour Google depuis les mises à jour « helpful content ».",
  ],
  "Audit content decay — flag posts losing traffic": [
    "Auditer le déclin des contenus : repérer les articles qui perdent du trafic",
    "Récupérez les données Search Console et repérez les articles qui ont perdu plus de 30 % de clics sur un an. Pour chacun, décidez : rafraîchir, fusionner ou retirer.",
    "Rafraîchir un contenu en déclin récupère du trafic pour une fraction du coût d'un nouvel article. C'est la tâche de contenu la plus rentable.",
  ],
  "Add Article schema with author + datePublished + dateModified": [
    "Ajouter le schéma Article avec author, datePublished et dateModified",
    "Surtout pour les contenus YMYL ou d'expertise : rendez explicites la signature de l'auteur, ses références et les dates de mise à jour.",
    "L'E-E-A-T (expérience, expertise, autorité, fiabilité) est devenu un signal majeur pour Google, surtout depuis les mises à jour « helpful content ».",
  ],
  "Improve internal linking on top-performing posts": [
    "Renforcer le maillage interne des meilleurs articles",
    "Sur chaque article à fort trafic, ajoutez 5 à 10 liens contextuels vers les pages piliers et les pages du cocon.",
    "Les liens internes transmettent l'autorité de vos pages les plus fortes aux plus faibles et font monter tout le cocon.",
  ],
  "Set up author pages with E-E-A-T signals": [
    "Créer des pages auteur avec les signaux E-E-A-T",
    "Une vraie photo, une biographie avec les références, des liens vers les travaux passés, les profils sociaux et un schéma avec des liens sameAs.",
    "Des signaux d'auteur solides distinguent un contenu fiable du bruit généré par IA, ce qui compte de plus en plus depuis les mises à jour « helpful content ».",
  ],

  // ── Niche: services ─────────────────────────────────────────────
  "Build dedicated pages for each service you offer": [
    "Créer une page dédiée par service proposé",
    "Ne regroupez pas les services sur une seule page. Une page par service, de 800 à 1 500 mots environ, qui répond aux questions précises de l'acheteur.",
    "Les acheteurs cherchent un service précis, pas un ensemble. Les pages dédiées se classent sur ces requêtes précises.",
  ],
  "Add Service schema to each service page": [
    "Ajouter le schéma Service à chaque page de service",
    "Utilisez un JSON-LD Service ou ProfessionalService avec serviceType, areaServed, provider, et offers si vous affichez des tarifs.",
    "Le schéma aide Google à vous placer sur les recherches de services et débloque des résultats enrichis pour les prestataires.",
  ],
  "Publish 3–5 detailed case studies": [
    "Publier 3 à 5 études de cas détaillées",
    "Un vrai client, un vrai résultat chiffré (anonymisé au besoin), la démarche suivie et les enseignements.",
    "Les études de cas sont le signal de confiance le plus fort d'un site de services, à la fois pour l'E-E-A-T et pour convertir les visiteurs.",
  ],
  "Build prominent trust signals on every page": [
    "Mettre en avant des signaux de confiance sur chaque page",
    "Prix, certifications, logos de clients, vrais témoignages avec nom et photo, vraies photos de l'équipe.",
    "L'acheteur d'un service évalue un risque. Les signaux de confiance réduisent ce risque perçu et améliorent le classement (E-E-A-T) comme la conversion.",
  ],
  "Create a clear About page with team and credentials": [
    "Créer une page À propos claire, avec l'équipe et ses références",
    "De vrais noms, des photos, les références, les années d'expérience. Reliez les profils LinkedIn avec le schéma sameAs.",
    "Les prestataires anonymes réussissent moins bien. De vraies personnes avec leurs références apportent beaucoup en confiance et en E-E-A-T.",
  ],
  "Set up a FAQ section addressing buyer objections": [
    "Créer une FAQ qui répond aux objections des acheteurs",
    "Relevez les 10 questions les plus fréquentes dans vos échanges commerciaux. Répondez-y sur une page avec le schéma FAQPage.",
    "Répondre directement aux objections améliore le taux de conversion et débloque les résultats enrichis FAQ.",
  ],

  // ── Stack: WordPress ────────────────────────────────────────────
  "Install Rank Math or Yoast SEO": [
    "Installer Rank Math ou Yoast SEO",
    "Choisissez-en un seul (jamais les deux). Yoast est plus répandu, Rank Math offre plus de fonctions en version gratuite.",
    "Vous réglez au même endroit les titres, les meta descriptions, les données structurées, les sitemaps, les redirections et le fil d'Ariane, sans toucher aux fichiers du thème.",
  ],
  "Enable caching — install LiteSpeed Cache or WP Rocket": [
    "Activer le cache : installer LiteSpeed Cache ou WP Rocket",
    "LiteSpeed Cache est gratuit si votre hébergeur utilise LiteSpeed (c'est le cas de la plupart). WP Rocket est payant mais fonctionne chez tous les hébergeurs.",
    "WordPress est lent par défaut. Le cache est le plus gros gain de vitesse : des pages 2 à 4 fois plus rapides en général, avec un effet direct sur les Core Web Vitals.",
  ],
  "Install ShortPixel or Smush — convert images to WebP": [
    "Installer ShortPixel ou Smush : convertir les images en WebP",
    "Convertissez toutes vos images en masse et activez le chargement différé. Réglez la qualité entre 80 et 85 pour le meilleur rapport poids/qualité.",
    "Les images représentent en général 60 à 80 % du poids d'une page WordPress. Le WebP pèse 25 à 35 % de moins que le JPEG sans perte visible.",
  ],
  "Audit and remove unused plugins": [
    "Passer en revue et supprimer les extensions inutilisées",
    "Chaque extension active ajoute du temps de chargement. Tout ce que vous n'avez pas touché depuis plus de 3 mois : vérifiez, désactivez, supprimez.",
    "L'excès d'extensions est la première cause de lenteur des sites WordPress. Cinq extensions de qualité valent toujours mieux que vingt-cinq médiocres.",
  ],
  "Set up Cloudflare (free tier) as a CDN": [
    "Mettre en place Cloudflare (offre gratuite) comme CDN",
    "Inscrivez-vous sur cloudflare.com, ajoutez le site, puis changez les serveurs de noms chez votre registrar. Activez la minification automatique CSS/JS/HTML dans Cloudflare.",
    "Un CDN gratuit sert les fichiers statiques depuis des serveurs proches de vos visiteurs et protège des attaques DDoS. Environ 30 % de vitesse gagnée sur la plupart des sites.",
  ],
  "Configure permalinks: Settings → Permalinks → Post name": [
    "Régler les permaliens : Réglages → Permaliens → Titre de la publication",
    "Les permaliens WordPress par défaut ressemblent à ?p=123. Passez au format /titre-de-la-publication/.",
    "Des URL propres qui reprennent le titre aident les visiteurs et les moteurs à comprendre le contenu de la page.",
  ],
  "Disable directory indexing in .htaccess": [
    "Désactiver le listage des dossiers dans .htaccess",
    "Ajoutez : Options -Indexes",
    "Sans cela, n'importe qui peut parcourir votre dossier /wp-content/uploads/. Plus de sécurité et des signaux de crawl plus propres.",
  ],

  // ── Stack: WooCommerce ──────────────────────────────────────────
  "Add Product schema to all product pages": [
    "Ajouter le schéma Product à toutes les fiches produit",
    "Yoast et Rank Math le font automatiquement : vérifiez que c'est activé. Testez une URL produit avec l'outil de test des résultats enrichis de Google.",
    "Le schéma Product affiche le prix, le stock et les notes dans les résultats Google, ce qui améliore directement le taux de clic sur les requêtes commerciales.",
  ],
  "Audit faceted-nav indexing — apply noindex to filter URLs": [
    "Auditer l'indexation des facettes : passer les URL de filtre en noindex",
    "Les URL filtrées de la boutique, comme /shop/?color=red, ne doivent pas toutes être indexées. Dans Yoast ou Rank Math, passez en noindex les URL à paramètres.",
    "La navigation à facettes peut générer des millions de pages sans valeur, qui consomment le budget de crawl et créent du contenu dupliqué.",
  ],
  "Set canonical for variation product URLs": [
    "Définir la balise canonique des URL de variations",
    "Les variations comme /shirt/?attribute=red doivent avoir /shirt/ pour URL canonique.",
    "Les variations empêchent Google de savoir quelle URL classer. Une canonique vers le produit parent regroupe les signaux de classement.",
  ],

  // ── Stack: Shopify ──────────────────────────────────────────────
  "Pick an SEO app — install Smart SEO or Plug in SEO": [
    "Choisir une application SEO : installer Smart SEO ou Plug in SEO",
    "Smart SEO génère automatiquement le JSON-LD et les textes alternatifs. Plug in SEO est gratuit et audite votre boutique à intervalles réguliers.",
    "Shopify place les fichiers du thème derrière le langage de gabarit Liquid. Ces applications donnent la main sur le SEO sans modifier le thème.",
  ],
  "Audit installed apps in Settings → Apps": [
    "Passer en revue les applications installées dans Paramètres → Applications",
    "Chaque application charge des scripts sur toutes les pages. Supprimez celles que vous n'utilisez plus, même gratuites.",
    "Shopify héberge votre boutique rapidement : ce sont les applications qui la ralentissent. En retirer 2 ou 3 fait souvent gagner 500 à 1 000 ms de LCP.",
  ],
  "Compress all product images — keep under 100 KB each": [
    "Compresser toutes les images produit : moins de 100 Ko chacune",
    "Utilisez Crush.pics ou TinyPNG (intégration Shopify disponible). Visez le format WebP quand il est pris en charge.",
    "Shopify recommande 100 Ko maximum par image. Des images plus lourdes dégradent le LCP sur mobile et pénalisent les connexions limitées, une grande part des acheteurs en ligne.",
  ],
  "Disable currency converter / pop-up apps if not strictly needed": [
    "Désactiver les convertisseurs de devise et les pop-ups non indispensables",
    "Un convertisseur de devise ajoute en général 600 à 800 ms. Les applications de pop-up encore plus.",
    "La vitesse passe avant l'effet. Un paiement rapide convertit mieux qu'un paiement lent avec un sélecteur de devise.",
  ],
  "Set canonical to .com on collection paginated URLs": [
    "Définir la canonique des pages de collection paginées",
    "/collections/all?page=2 doit avoir /collections/all pour URL canonique, afin d'éviter le contenu dupliqué.",
    "La pagination est l'une des erreurs SEO les plus fréquentes sur Shopify : Google voit 50 pages presque identiques.",
  ],
  "Write a unique 100–300 word intro on every collection page": [
    "Rédiger une introduction unique de 100 à 300 mots sur chaque collection",
    "Par défaut, une page de collection Shopify n'est qu'une grille de produits. Ajoutez un texte SEO au-dessus de la grille, dans le champ Description de la collection.",
    "Les pages de collection se classent souvent sur les requêtes commerciales les plus recherchées, à condition d'avoir du contenu au-dessus de la grille.",
  ],
  "Submit sitemap.xml to Google Search Console": [
    "Envoyer sitemap.xml à Google Search Console",
    "Shopify génère /sitemap.xml automatiquement. Envoyez-le une fois sur search.google.com/search-console.",
    "Google découvre plus vite les nouveaux produits et collections, surtout pour une boutique qui ajoute souvent des références.",
  ],

  // ── Stack: Wix ──────────────────────────────────────────────────
  "Switch from Wix Editor to Wix Studio if possible": [
    "Passer de Wix Editor à Wix Studio si possible",
    "Wix Studio donne plus de contrôle sur le SEO technique. La migration demande du travail mais vaut la peine pour un projet sérieux.",
    "L'éditeur Wix classique a des limites de vitesse connues. Studio en corrige une bonne partie.",
  ],
  "Use Wix SEO tools panel — set page-level title + meta description": [
    "Utiliser le panneau SEO de Wix : titre et meta description page par page",
    "Pages → panneau des outils SEO, pour chaque page. Ne laissez aucune page avec le titre généré par Wix.",
    "Les titres générés par Wix sont en général génériques et oublient le mot-clé. Les remplacer à la main est le plus gros gain SEO sur Wix.",
  ],
  "Compress every image before uploading — target under 200KB": [
    "Compresser chaque image avant l'envoi : moins de 200 Ko",
    "Wix compresse mal les images. Compressez-les d'abord avec TinyPNG ou Squoosh.",
    "Les sites Wix servent souvent des images trop lourdes. C'est le premier levier pour les Core Web Vitals sur Wix.",
  ],
  "Set up redirects: Settings → SEO → Redirect URLs": [
    "Mettre en place les redirections : Paramètres → SEO → Redirections d'URL",
    "Toute ancienne URL a besoin d'une redirection 301 vers sa nouvelle adresse. Wix le gère dans le panneau des paramètres SEO.",
    "Sans 301, vous perdez l'autorité acquise à chaque changement d'URL. La correction est native et gratuite dans Wix.",
  ],
  "Honest note: accept Wix's limits": [
    "À savoir : accepter les limites de Wix",
    "Wix a des limites de vitesse que vous ne pouvez pas lever sans quitter la plateforme. Concentrez-vous sur ce qui dépend de vous : titres, contenus, images, maillage interne.",
    "Mieux vaut des attentes réalistes que la poursuite d'un score Lighthouse de 95 ou plus, impossible sur Wix. Faites la différence sur la qualité du contenu.",
  ],

  // ── Stack: Squarespace ──────────────────────────────────────────
  "Use SEO panel on every page: Page Settings → SEO": [
    "Utiliser le panneau SEO sur chaque page : Paramètres de la page → SEO",
    "Donnez un titre et une meta description uniques à chaque page. N'acceptez pas les valeurs générées par Squarespace.",
    "Les titres Squarespace par défaut ont en général la forme « Titre de la page — Titre du site » : génériques et peu cliqués.",
  ],
  "Enable AMP for blog posts: Marketing → AMP": [
    "Activer AMP pour les articles de blog : Marketing → AMP",
    "AMP rend le chargement des articles instantané sur mobile. Une option gratuite à cocher.",
    "AMP améliore le nombre de pages vues par session mobile sur les sites riches en contenu, même si Google s'appuie moins sur AMP qu'avant.",
  ],
  "Add image alt text via the image editor on every block": [
    "Ajouter le texte alternatif des images dans l'éditeur, sur chaque bloc",
    "Cliquez sur l'image → Modifier → champ Légende / Texte alternatif.",
    "Les modèles Squarespace reposent beaucoup sur l'image : le texte alternatif y est essentiel pour l'accessibilité et pour Google Images.",
  ],
  "Use Custom Code Injection to add Google Analytics 4 + Tag Manager": [
    "Ajouter Google Analytics 4 et Tag Manager par injection de code",
    "Paramètres → Avancé → Injection de code → collez les scripts GA4/GTM dans l'en-tête.",
    "Les statistiques intégrées à Squarespace sont limitées. GA4 et GTM permettent un vrai suivi des conversions.",
  ],
  "Enable HTTPS in Settings → Advanced → SSL": [
    "Activer HTTPS dans Paramètres → Avancé → SSL",
    "Si ce n'est pas déjà fait, choisissez « Sécurisé » (HTTPS uniquement).",
    "Indispensable pour le classement et pour éviter l'avertissement « Non sécurisé » du navigateur.",
  ],

  // ── Stack: Webflow ──────────────────────────────────────────────
  "Add page-level title + meta description in Page Settings": [
    "Renseigner le titre et la meta description dans les paramètres de chaque page",
    "Ouvrez chaque page → Paramètres → SEO → remplissez les champs.",
    "Webflow donne tout le contrôle sur le SEO mais ne remplit rien à votre place. Un panneau SEO vide retombe sur le nom du site.",
  ],
  "Set up Open Graph and Twitter Card images on every page": [
    "Définir les images Open Graph et Twitter Card sur chaque page",
    "Paramètres de la page → SEO → image Open Graph. Utilisez du 1200×630.",
    "Essentiel pour les partages sur les réseaux sociaux. Webflow rend le réglage très simple.",
  ],
  "Enable site-wide HTTPS in Project Settings → Hosting": [
    "Activer HTTPS sur tout le site : Paramètres du projet → Hébergement",
    "Activez SSL. Gratuit avec toutes les formules payantes de Webflow.",
    "Indispensable pour le classement et la confiance du navigateur.",
  ],
  "Use Webflow CMS for blog/listings, not static pages": [
    "Utiliser le CMS Webflow pour le blog et les listes, pas des pages statiques",
    "Le contenu répétitif (articles, études de cas) a sa place dans les Collections du CMS, pas dans des pages statiques dupliquées.",
    "La duplication statique crée des quasi-doublons par accident. Les Collections donnent des listes à gabarit, faciles à baliser.",
  ],
  "Add JSON-LD via Page Settings → Custom Code → Inside <head>": [
    "Ajouter le JSON-LD : Paramètres de la page → Code personnalisé → Dans <head>",
    "Webflow ne génère pas de données structurées. Collez le JSON-LD page par page ou utilisez un script alimenté par le CMS.",
    "Les données structurées débloquent les résultats enrichis, essentiels pour toute page à intention commerciale.",
  ],

  // ── Stack: Next.js ──────────────────────────────────────────────
  "Replace <img> with next/image throughout": [
    "Remplacer <img> par next/image partout",
    "Gère tout seul le dimensionnement adaptatif, la conversion WebP/AVIF et le chargement différé. Mettez priority sur l'image du LCP.",
    "Le plus gros gain en Core Web Vitals sur un site Next.js. Le LCP baisse souvent de 30 à 50 %.",
  ],
  "Use generateMetadata in App Router for dynamic SEO": [
    "Utiliser generateMetadata dans l'App Router pour un SEO dynamique",
    "Chaque page exporte une fonction asynchrone generateMetadata qui renvoie title, description, openGraph, etc.",
    "Par défaut, Next.js ne génère pas de balises par page. Sans generateMetadata, toutes les URL portent le même titre.",
  ],
  "Add app/sitemap.ts and app/robots.ts": [
    "Ajouter app/sitemap.ts et app/robots.ts",
    "Next.js génère /sitemap.xml et /robots.txt à la compilation. Les deux sont nécessaires pour un SEO sérieux.",
    "Sans eux, pas de sitemap ni de directives de crawl : Google explore le site de façon inefficace.",
  ],
  "Move analytics to next/script with strategy='afterInteractive'": [
    "Passer les scripts de mesure sur next/script avec strategy='afterInteractive'",
    "import Script from 'next/script'. N'utilisez pas de balises <script> simples : elles bloquent le rendu.",
    "Les scripts de mesure bloquants sont la cause la plus fréquente d'un INP lent sur les sites Next.js.",
  ],
  "Enable ISR (Incremental Static Regeneration) on content pages": [
    "Activer l'ISR (régénération statique incrémentale) sur les pages de contenu",
    "Ajoutez export const revalidate = 3600 aux pages de contenu. Elles sont servies en HTML statique et rafraîchies toutes les heures.",
    "Le HTML statique est la livraison la plus rapide possible. L'ISR donne cette vitesse avec un contenu presque à jour.",
  ],
  "Preload critical fonts with next/font": [
    "Précharger les polices critiques avec next/font",
    "Utilisez next/font/google ou next/font/local. Réglez display: swap.",
    "Le chargement des polices pèse beaucoup sur le CLS. next/font gère le préchargement et le swap automatiquement.",
  ],

  // ── Stack: Drupal ───────────────────────────────────────────────
  "Install the Metatag module + Schema.org Metatag": [
    "Installer les modules Metatag et Schema.org Metatag",
    "Ajoute de vraies balises meta et la prise en charge du JSON-LD pour tous les types de contenu.",
    "Le cœur de Drupal offre très peu pour le SEO : ces modules sont indispensables.",
  ],
  "Install Pathauto — auto-generate SEO-friendly URL aliases": [
    "Installer Pathauto : des alias d'URL lisibles générés automatiquement",
    "Remplace /node/123 par /titre-de-la-page. Réglez les modèles d'URL par type de contenu.",
    "Les URL Drupal par défaut sont illisibles. Pathauto règle le problème sur tout le site.",
  ],
  "Install Redirect module to manage 301s": [
    "Installer le module Redirect pour gérer les 301",
    "Il enregistre les changements d'URL et redirige les anciens chemins vers les nouveaux.",
    "Les modifications dans Drupal changent souvent les URL. Sans redirections, vous perdez toutes les positions acquises.",
  ],
  "Enable XML Sitemap module + submit to Google Search Console": [
    "Activer le module XML Sitemap et l'envoyer à Google Search Console",
    "Génère /sitemap.xml automatiquement selon des règles par type de contenu.",
    "Accélère l'indexation des nouveaux contenus, surtout sur les gros sites Drupal.",
  ],

  // ── Stack: Magento ──────────────────────────────────────────────
  "Enable canonical URLs for products and categories": [
    "Activer les URL canoniques pour les produits et les catégories",
    "Stores → Configuration → Catalog → Catalog → Search Engine Optimization → Use Canonical Link Meta Tag = Yes (produits et catégories).",
    "Magento génère de nombreuses variantes d'URL par produit. Sans canoniques, les signaux de classement se dispersent.",
  ],
  "Configure URL Suffix and remove .html if present": [
    "Régler le suffixe d'URL et retirer .html s'il est présent",
    "Stores → Configuration → Catalog → Catalog → Search Engine Optimization → videz le champ Product URL Suffix.",
    "Des URL sans .html sont plus lisibles et un peu meilleures pour le taux de clic.",
  ],
  "Install a caching extension (Varnish + Redis)": [
    "Installer une extension de cache (Varnish + Redis)",
    "Magento est lent sans un vrai cache. Varnish pour la page entière, Redis pour les sessions et le cache d'objets.",
    "Magento est la plus lente des grandes plateformes e-commerce par défaut. Le cache la fait passer d'inutilisable à rapide.",
  ],
  "Audit installed extensions — disable any you don't actively use": [
    "Passer en revue les extensions installées : désactiver celles qui ne servent pas",
    "Chaque extension Magento peut ajouter plusieurs fichiers JS par page.",
    "Un site Magento s'alourdit vite avec les extensions. Un contrôle trimestriel et un nettoyage gardent une vitesse correcte.",
  ],

  // ── Stack: custom ───────────────────────────────────────────────
  "Add canonical link tags to every page": [
    "Ajouter la balise canonique sur chaque page",
    "<link rel='canonical' href='https://votresite.com/page'>",
    "Sans canonique, Google doit deviner quelle URL est la « vraie ». Les sites sur mesure l'oublient souvent.",
  ],
  "Generate and submit a sitemap.xml": [
    "Générer et envoyer un sitemap.xml",
    "Construisez-le par programme à partir de vos routes, ou utilisez un générateur. Envoyez-le à Google Search Console.",
    "Aide Google à trouver des pages qu'il n'aurait pas explorées autrement.",
  ],
  "Add JSON-LD schema for your business type": [
    "Ajouter le schéma JSON-LD adapté à votre activité",
    "Au minimum : Organization ou LocalBusiness sur la page d'accueil. Complétez avec Product, Article ou FAQ sur les pages concernées.",
    "Sur un site sur mesure, les données structurées s'écrivent à la main : faciles à oublier, mais elles débloquent les résultats enrichis.",
  ],
  "Enable HTTP/2 or HTTP/3 + gzip/brotli compression": [
    "Activer HTTP/2 ou HTTP/3 et la compression gzip/brotli",
    "À régler sur votre CDN ou votre serveur web. Activé par défaut chez les hébergeurs récents.",
    "20 à 40 % de temps de chargement gagnés sans frais. Les sites sur mesure sont parfois livrés en HTTP/1.1 par erreur.",
  ],
  "Configure proper cache-control headers for static assets": [
    "Régler les en-têtes cache-control des fichiers statiques",
    "JS/CSS/images : cache-control: public, max-age=31536000, immutable. HTML : no-cache ou un max-age court.",
    "Une longue durée de cache sur les fichiers statiques accélère nettement les visites suivantes. Un oubli courant sur les sites sur mesure.",
  ],
  "Add structured logging for crawler hits": [
    "Journaliser à part les passages des robots",
    "Enregistrez les user agents Googlebot et Bingbot dans un flux séparé. Relisez-le chaque mois pour repérer les erreurs de crawl.",
    "Un site sur mesure peut bloquer les robots sans que personne ne le remarque pendant des semaines.",
  ],

  // ── Playbook: weekly health check ───────────────────────────────
  "Review GSC for sudden traffic drops": [
    "Vérifier dans Search Console s'il y a une chute soudaine de trafic",
    "Ouvrez Search Console → Performances. Comparez les 7 derniers jours aux 7 précédents. Signalez toute requête ou page qui perd plus de 25 % de clics et cherchez la cause.",
    "Repérer une chute tôt permet de la rapprocher d'une mise à jour d'algorithme, d'un de vos déploiements ou d'un changement de contenu, et de réagir avant que la perte ne s'aggrave.",
  ],
  "Check Coverage / Pages report for new errors": [
    "Contrôler le rapport Pages (couverture) : nouvelles erreurs",
    "Search Console → Indexation → Pages. Cherchez les nouvelles erreurs (404, redirections, soft 404, erreurs serveur).",
    "Les erreurs d'indexation empêchent les pages de recevoir du trafic. La plupart se corrigent facilement si on les voit la semaine même.",
  ],
  "Re-check rank tracker for tracked keywords": [
    "Revoir le suivi de positions des mots-clés suivis",
    "Regardez les variations de plus de 5 positions sur les mots-clés suivis. Vérifiez qu'une baisse n'est pas une simple fluctuation passagère des résultats.",
    "Les mots-clés suivis sont ceux qui comptent pour le chiffre d'affaires. Une forte baisse se traite dans la semaine, pas à la fin du mois.",
  ],
  "Run a fresh site audit on key pages": [
    "Relancer un audit sur les pages clés",
    "Auditez la page d'accueil et les 3 pages qui reçoivent le plus de trafic. Vérifiez que les titres, les meta, les données structurées et les Core Web Vitals n'ont pas régressé.",
    "Les déploiements et les modifications dans le CMS cassent le SEO sans bruit. Un audit par semaine repère les régressions avant qu'elles ne coûtent des positions.",
  ],

  // ── Playbook: monthly content refresh ───────────────────────────
  "Identify top 5 decaying pages from GSC": [
    "Repérer les 5 pages en plus fort déclin dans Search Console",
    "Utilisez l'outil de déclin des contenus. Retenez les pages qui avaient un trafic significatif et qui perdent plus de 20 % de clics.",
    "Rafraîchir une page qui marchait est 5 à 10 fois plus rapide que classer un nouveau contenu, et Google récompense la fraîcheur des pages auxquelles il faisait déjà confiance.",
  ],
  "Audit each decaying page against current SERP": [
    "Comparer chaque page en déclin aux résultats actuels",
    "Cherchez le mot-clé visé. Notez ce que les 3 premiers résultats traitent et pas vous. Repérez les chiffres périmés, les mentions d'année et les captures d'écran datées.",
    "Les résultats évoluent. La page qui se classait il y a 18 mois peut manquer aujourd'hui de sous-thèmes, de données structurées ou de fraîcheur que les concurrents ont ajoutés.",
  ],
  "Rewrite intro + add 1–2 new sections per page": [
    "Réécrire l'introduction et ajouter 1 à 2 sections par page",
    "Reprenez l'introduction avec un angle neuf, l'année en cours et des chiffres à jour. Ajoutez des sections sur les sous-thèmes relevés dans votre comparaison.",
    "Une vraie mise à jour du contenu (pas un simple changement de date) relance l'évaluation de fraîcheur par Google et fait en général monter les positions en 2 à 4 semaines.",
  ],
  "Update internal links pointing into refreshed pages": [
    "Mettre à jour les liens internes vers les pages rafraîchies",
    "Trouvez les pages qui pointent déjà vers la page rafraîchie. Adaptez le texte d'ancre au nouvel angle et ajoutez 2 à 3 liens internes depuis des articles proches.",
    "Les liens internes appuient la mise à jour : Google réexplore plus vite les pages liées, et un texte d'ancre à jour renforce la pertinence sémantique.",
  ],
  "Re-submit refreshed URLs in GSC": [
    "Renvoyer les URL rafraîchies dans Search Console",
    "Search Console → Inspection de l'URL → Demander une indexation, pour chaque URL rafraîchie. La réexploration passe de quelques jours à quelques heures.",
    "La demande d'indexation accélère l'évaluation de vos changements. Plus vite Google voit le nouveau contenu, plus vite les positions montent.",
  ],

  // ── Playbook: monthly technical audit ───────────────────────────
  "Run a full broken-link scan": [
    "Lancer une recherche complète de liens cassés",
    "Explorez le site. Corrigez les 404 internes, mettez à jour les liens sortants morts, redirigez les pages orphelines.",
    "Les liens cassés gaspillent le budget de crawl, agacent les visiteurs et donnent à Google une impression de site mal entretenu. Ils s'accumulent sans bruit à chaque modification.",
  ],
  "Audit redirect chains (>1 hop)": [
    "Contrôler les chaînes de redirections (plus d'un saut)",
    "Trouvez toute URL qui redirige plus d'une fois avant d'aboutir. Remplacez chaque chaîne par une seule redirection directe vers l'URL finale.",
    "Chaque saut gaspille du budget de crawl et ajoute de la latence. Sur une longue chaîne, Google peut abandonner l'exploration.",
  ],
  "Validate schema on key page types": [
    "Valider les données structurées des principaux types de pages",
    "Testez la page d'accueil, le gabarit produit ou service, le gabarit d'article et la page de contact avec l'outil de test des résultats enrichis de Google.",
    "Les données structurées cassent sans bruit lors des mises à jour du thème ou du CMS. Un schéma cassé fait perdre les résultats enrichis, donc du taux de clic.",
  ],
  "Review Core Web Vitals trend": [
    "Suivre l'évolution des Core Web Vitals",
    "Ouvrez PageSpeed Insights pour la page d'accueil et 2 pages à trafic. Vérifiez LCP < 2,5 s, INP < 200 ms, CLS < 0,1.",
    "Les Core Web Vitals sont un facteur de classement confirmé. Les régressions viennent en général de nouveaux scripts tiers, d'images remplacées ou d'une mise à jour du thème.",
  ],
  "Check robots.txt + sitemap.xml health": [
    "Vérifier l'état de robots.txt et de sitemap.xml",
    "Validez les deux fichiers. Vérifiez que le sitemap est accepté dans Search Console et ne contient que des URL canoniques qui répondent 200.",
    "Un sitemap cassé ou une mauvaise règle dans robots.txt peut désindexer une grande partie du site en une nuit. Cela vaut 5 minutes de contrôle.",
  ],

  // ── Playbook: monthly competitor watch ──────────────────────────
  "List new content competitors published this month": [
    "Lister les contenus publiés par les concurrents ce mois-ci",
    "Consultez le /blog ou le sitemap de 3 concurrents. Notez les nouveaux articles, les mots-clés visés, le format et la longueur.",
    "Savoir où ils investissent vous indique quels mots-clés montent dans votre secteur avant que votre suivi de positions ne le montre.",
  ],
  "Identify keywords competitors gained on this month": [
    "Repérer les mots-clés gagnés par les concurrents ce mois-ci",
    "Avec un outil de recoupement des résultats, trouvez les requêtes où ils sont désormais dans le top 10 et pas vous.",
    "Leurs gains sont votre feuille de route. Une nouvelle position signale un sujet que Google récompense en ce moment dans votre secteur.",
  ],
  "Check competitors for new high-quality backlinks": [
    "Chercher les nouveaux backlinks de qualité des concurrents",
    "Utilisez Search Console et Ahrefs Webmaster Tools (gratuit). Notez les nouveaux liens venant de domaines notés 30 ou plus. Regardez la page qui fait le lien : pouvez-vous obtenir le même ?",
    "Remonter aux sources de liens est la recherche la plus rentable en netlinking. Un site qui cite un concurrent en cite souvent d'autres.",
  ],
  "Note any major page changes on competitor key pages": [
    "Noter les changements importants sur les pages clés des concurrents",
    "Comparez leur page d'accueil et leurs pages à fort trafic à la version du mois dernier. Cherchez de nouvelles sections, des changements de schéma, un repositionnement.",
    "Les grosses modifications d'un concurrent accompagnent souvent ses mouvements de positions : un indice avancé de ce qui va marcher dans le secteur.",
  ],

  // ── Playbook: new client onboarding ─────────────────────────────
  "Connect Google Search Console": [
    "Connecter Google Search Console",
    "Validez la propriété si ce n'est pas fait, puis connectez-la par OAuth. Vérifiez que les 16 mois d'historique sont visibles.",
    "Search Console est votre source de référence sur ce qui se classe vraiment. Sans elle, chaque recommandation est une supposition.",
  ],
  "Connect Google Analytics 4": [
    "Connecter Google Analytics 4",
    "Obtenez l'accès à GA4 (rôle Lecteur). Vérifiez que le trafic organique apparaît et correspond aux clics de Search Console à 10 % près environ.",
    "GA4 relie le trafic aux résultats (conversions, chiffre d'affaires). Sans lui, vous ne pouvez pas montrer au client ce que son investissement SEO a rapporté.",
  ],
  "Run baseline full-site audit": [
    "Lancer l'audit complet de départ",
    "Explorez toutes les URL. Relevez le score de santé initial, le nombre de problèmes par gravité et les 10 principaux. Enregistrez le tout comme état de départ.",
    "L'état de départ est votre photo « avant ». Chaque rapport mensuel s'y compare : sans lui, vous n'avez aucun progrès mesurable à montrer.",
  ],
  "Identify and fix top 3 quick-win issues": [
    "Repérer et corriger les 3 gains rapides",
    "Dans l'audit, retenez les 3 problèmes au meilleur rapport impact/effort. Corrigez-les la première semaine pour montrer un mouvement immédiat.",
    "Un progrès visible dans les 2 premières semaines installe la confiance du client. Une seule position gagnée qu'il peut constater en fait votre allié en interne.",
  ],
  "Build initial keyword tracking list (20–50 keywords)": [
    "Constituer la première liste de mots-clés suivis (20 à 50)",
    "Partez de ses meilleures requêtes Search Console et ajoutez 5 à 10 cibles stratégiques sur lesquelles il veut se classer. Pas encore de longue traîne ambitieuse.",
    "Suivre les mauvais mots-clés (ou trop de mots-clés) crée du bruit. Commencez serré, avec ce qui marche déjà et les objectifs immédiats.",
  ],
  "Document goals + first 90-day strategy": [
    "Écrire les objectifs et la stratégie des 90 premiers jours",
    "Rédigez une stratégie d'une page : les 3 objectifs du client, vos 3 priorités, les jalons à 30, 60 et 90 jours. Envoyez-la pour validation.",
    "S'accorder sur les objectifs dès le départ évite les « pourquoi avez-vous fait cela ? » plus tard. Le plan validé vous protège et vous guide.",
  ],

  // ── Playbook: traffic drop recovery ─────────────────────────────
  "Confirm the drop is real (not a tracking issue)": [
    "Confirmer que la chute est réelle (pas un problème de mesure)",
    "Vérifiez séparément Search Console, GA4 et votre suivi de positions. La chute doit apparaître dans les trois.",
    "Les défauts de mesure expliquent environ 15 % des « chutes » perçues. Écartez cette piste avant de passer des heures sur un faux problème.",
  ],
  "Check if a Google algorithm update overlaps the drop date": [
    "Vérifier si une mise à jour de Google coïncide avec la chute",
    "Consultez le Search Status Dashboard de Google et un suivi des mises à jour d'algorithme. Notez toute mise à jour terminée à ±3 jours de la chute.",
    "Les mises à jour d'algorithme sont la première cause des chutes inexpliquées. Savoir s'il s'agit d'une « core update », d'une « spam update » ou de « helpful content » oriente toute la stratégie de récupération.",
  ],
  "Identify which pages and queries dropped most": [
    "Repérer les pages et les requêtes qui ont le plus baissé",
    "Search Console → Performances → comparez les 28 jours avant et les 28 jours après. Triez par clics perdus. Concentrez-vous sur les 10 premiers.",
    "Une chute touche rarement tout le site. Trouver les pages concernées indique si la cause tient au contenu, à la technique ou à l'affichage des résultats.",
  ],
  "Audit the dropped pages for technical regressions": [
    "Chercher une régression technique sur les pages en baisse",
    "Relancez un audit sur chacune. Cherchez un nouveau noindex, des soucis de redirection, des données structurées cassées, une régression des Core Web Vitals, des modifications récentes dans le CMS.",
    "Les régressions techniques expliquent environ 20 % des chutes et sont les plus simples à corriger. Écartez-les avant de conclure à un problème de contenu.",
  ],
  "Compare dropped pages to current top 3 in SERP": [
    "Comparer les pages en baisse aux 3 premiers résultats actuels",
    "Cherchez chaque requête perdue. Comparez la profondeur du contenu, la réponse à l'intention et la fraîcheur de votre page à celles du nouveau top 3.",
    "La plupart des chutes dues à l'algorithme veulent dire « votre page n'est plus la meilleure réponse ». La comparaison montre exactement ce qui manque.",
  ],
  "Build the recovery plan + assign to content workflow": [
    "Construire le plan de récupération et l'inscrire dans la production de contenu",
    "À partir des constats, écrivez 3 à 7 changements précis par page. Créez une tâche pour chacun. Posez un rappel de réévaluation à 30 jours.",
    "La récupération demande de la patience : Google met 4 à 8 semaines à réévaluer. Mettre les changements en tâches (et non en tête) garde l'exécution rigoureuse.",
  ],

  // ── Playbook: quarterly strategy review ─────────────────────────
  "Review the past quarter's wins and losses": [
    "Faire le bilan du trimestre : réussites et échecs",
    "Sortez les données de trafic, de positions et de conversions sur 90 jours. Retenez les 3 plus grandes réussites et les 3 plus grands échecs.",
    "Les tendances n'apparaissent qu'à l'échelle du trimestre. Le bruit de la semaine cache ce qui progresse vraiment au fil des mois.",
  ],
  "Audit your tracked keywords — drop the dead ones": [
    "Revoir les mots-clés suivis : retirer ceux qui sont morts",
    "Retirez les mots-clés sans aucune impression depuis plus de 90 jours. Ajoutez les nouvelles cibles stratégiques issues de la veille concurrentielle et de Search Console.",
    "Une liste périmée gaspille le suivi et disperse l'attention. Un tri par trimestre garde un tableau de bord qui veut dire quelque chose.",
  ],
  "Review topical authority — which clusters compound, which don't": [
    "Revoir l'autorité thématique : les cocons qui progressent et les autres",
    "Rapprochez les cocons thématiques du trafic réel. Distinguez ceux dont le trafic se cumule de ceux qui ne mènent nulle part.",
    "Renforcer ce qui marche vaut mieux que se disperser. La revue trimestrielle des cocons réoriente l'effort de contenu vers les sujets qui ont fait leurs preuves.",
  ],
  "Set next quarter's 3 priorities + measurable OKRs": [
    "Fixer les 3 priorités du trimestre suivant et des objectifs mesurables",
    "Choisissez exactement 3 priorités. Pour chacune, écrivez une cible mesurable (clics, positions, conversions). Partagez-les avec les parties prenantes.",
    "Trois priorités concentrent l'exécution. Cinq priorités, c'est aucune priorité. Des objectifs mesurables donnent du sens à la prochaine revue, au lieu d'impressions.",
  ],
};
