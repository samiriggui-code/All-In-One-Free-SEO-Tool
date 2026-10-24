/**
 * The Learn page's text, in English and French.
 *
 * Long-form teaching copy rather than interface strings, so it lives
 * here as two parallel objects (like lib/docs-guides) instead of in
 * messages/*.json. The page picks one by locale; the shape is shared, so
 * a section cannot exist in one language only.
 */

import type { Locale } from "@/i18n/config";

type Level = "low" | "medium" | "high" | "very high";

export type LearnContent = {
  title: string;
  description: string;
  rulesTitle: string;
  goldenRules: string[];
  glossaryTitle: string;
  glossaryIntro: string;
  whyItMatters: string;
  glossary: { term: string; short: string; why: string }[];
  linksTitle: string;
  linksIntro: string;
  hardRulesTitle: string;
  linkRules: string[];
  effort: string;
  payoff: string;
  levels: Record<Level, string>;
  linkPlays: { name: string; summary: string; effort: Level; payoff: Level }[];
  folkloreTitle: string;
  folkloreIntro: string;
  folklore: { title: string; truth: string }[];
  toolTitle: string;
  toolIntro: string;
  toolLink: string;
};

const en: LearnContent = {
  title: "Learn",
  description:
    "Plain-language SEO basics. Every recommendation in this tool is grounded in what Google has actually confirmed — not folklore.",
  rulesTitle: "Five rules that hold up in 2026",
  goldenRules: [
    "Write for humans first, search engines second — Google is increasingly good at rewarding genuine helpfulness.",
    "Earn links by deserving them. Build something link-worthy, then promote it. Don't buy or trade links.",
    "Speed is a feature, not a luxury. A slow site loses both rankings and conversions, especially on mobile.",
    "Consistency beats intensity. Five quality posts a year on one topic beats 50 scattered posts.",
    "Mobile-first is non-negotiable. Google indexes the mobile version of your site. If it's broken on phones, you don't rank.",
  ],
  glossaryTitle: "Glossary",
  glossaryIntro:
    "Every term explained in plain language — with the 'why it matters' that most glossaries skip.",
  whyItMatters: "Why it matters:",
  glossary: [
    {
      term: "Title tag",
      short: "The clickable headline of your search result.",
      why: "It's the strongest on-page signal Google has about what a page is about. Aim for 50–60 characters with the primary keyword near the start.",
    },
    {
      term: "Meta description",
      short: "The summary text shown under the title in search results.",
      why: "Not a direct ranking factor, but it heavily influences click-through rate. 120–155 characters with a clear value proposition.",
    },
    {
      term: "Canonical tag",
      short: "A signal to Google about the main version of this page when similar pages exist.",
      why: "Without a canonical, Google guesses which URL is the 'real' one and may split your ranking signals across duplicates.",
    },
    {
      term: "Core Web Vitals",
      short: "Google's three metrics for page experience: LCP, INP, CLS.",
      why: "LCP under 2.5s, INP under 200ms, CLS under 0.1. Failing these hurts both rankings and conversions on commercial pages.",
    },
    {
      term: "E-E-A-T",
      short: "Experience, Expertise, Authoritativeness, Trustworthiness.",
      why: "What Google's quality raters look for in content. Real authors with real credentials beat anonymous AI-generated content, especially for YMYL topics.",
    },
    {
      term: "Schema markup (JSON-LD)",
      short: "Structured data that tells Google what your page is about in machine-readable form.",
      why: "Unlocks rich results — review stars, FAQ accordions, product info, breadcrumbs — directly improving CTR and visibility.",
    },
    {
      term: "Striking-distance keyword",
      short: "A keyword you currently rank in positions 4–15 for.",
      why: "These are the highest-ROI keywords to optimize. Small improvements move you onto page 1 or into the top 3, where almost all clicks happen.",
    },
    {
      term: "Content decay",
      short: "When a previously-ranking page loses traffic over time.",
      why: "Refreshing decaying content recovers traffic at a fraction of the cost of new posts. It's the highest-ROI content task most people neglect.",
    },
    {
      term: "Topic cluster",
      short: "A pillar page covering a broad topic, surrounded by supporting articles linked back to it.",
      why: "Demonstrates topical authority — covering a subject deeply — which is one of Google's strongest content-quality signals after the helpful-content updates.",
    },
    {
      term: "Backlink",
      short: "A link from another site to yours.",
      why: "Still one of the top ranking factors. Quality matters far more than quantity — one link from a relevant, authoritative site beats fifty low-quality links.",
    },
  ],
  linksTitle: "Link building in 2026",
  linksIntro:
    "What still works, ranked by realistic effort vs payoff. None of this is buy-50-PBN-links cheap. Real links require real value.",
  hardRulesTitle: "Hard rules of 2026",
  linkRules: [
    "Disavow file is mostly obsolete — Google's spam team handles bad links automatically. Only disavow after a manual penalty.",
    "PBN networks are detectable and devalued. Stop wasting budget on private link networks.",
    "Reciprocal links (you link to me, I link to you) at small scale are fine. At large scale they're a footprint.",
    "Anchor text diversity matters more than keyword anchor density. Aim for 70% branded / generic, 30% keyword-rich.",
    "DR / DA are correlation metrics, not causation. A genuine link from a relevant DR-30 site can outperform a paid DR-70 link.",
    "Sponsored content + nofollow / sponsored rel attribute is fine. Hidden paid placement is risky.",
  ],
  effort: "effort:",
  payoff: "payoff:",
  levels: { low: "low", medium: "medium", high: "high", "very high": "very high" },
  linkPlays: [
    {
      name: "Digital PR / data studies",
      summary:
        "Publish original research or surveys with surprising findings. Pitch journalists who cover the topic. The most reliable way to earn .gov / .edu / news-tier links in 2026.",
      effort: "high",
      payoff: "high",
    },
    {
      name: "Broken link building",
      summary:
        "Find broken pages on competitor / niche sites that linked to a topic you cover. Email the webmaster with a working replacement URL. Conversion rates 5-15%.",
      effort: "medium",
      payoff: "medium",
    },
    {
      name: "Resource-page outreach",
      summary:
        "Search for `inurl:resources` + your niche. If your content is a better fit than what they list, ask. Best for genuinely useful tools / guides.",
      effort: "medium",
      payoff: "medium",
    },
    {
      name: "HARO / Qwoted / Help A B2B Writer",
      summary:
        "Reply to journalist queries with quotable expertise. Earned media that lands in Forbes, Inc., trade pubs. Daily 15-min habit.",
      effort: "low",
      payoff: "high",
    },
    {
      name: "Niche edits (link insertions)",
      summary:
        "Find existing relevant articles on authoritative sites and pitch a section update where your link adds value. Doesn't require new content from them.",
      effort: "medium",
      payoff: "medium",
    },
    {
      name: "Guest posting (selectively)",
      summary:
        "Only on sites with real readers and editorial standards. PBN-style guest posting is a 2010s tactic — Google's spam updates devalue it.",
      effort: "high",
      payoff: "low",
    },
    {
      name: "Reclaim unlinked mentions",
      summary:
        "Set up Google Alerts / monitoring for your brand. When someone mentions you without linking, ask. ~30% conversion if the mention is positive.",
      effort: "low",
      payoff: "medium",
    },
    {
      name: "Build linkable assets",
      summary:
        "Free tools, calculators, definitive guides, statistics roundups. People link because the asset itself solves their problem — passive earned links over years.",
      effort: "high",
      payoff: "very high",
    },
    {
      name: "Internal linking audit (compounds)",
      summary:
        "Not external link-building, but doubles the impact of every backlink you earn. Send authority from your strongest pages to weaker ones every month.",
      effort: "low",
      payoff: "high",
    },
  ],
  folkloreTitle: "SEO folklore — myths to ignore",
  folkloreIntro:
    "Common bad advice you'll see in older blog posts and on Reddit. Save yourself the wasted effort.",
  folklore: [
    {
      title: "Keyword density should be 2–3%",
      truth: "Google has explicitly said keyword density isn't a ranking factor. Write naturally and let semantic relevance speak for itself.",
    },
    {
      title: "Meta keywords tag matters",
      truth: "Google has not used meta keywords as a ranking signal in over a decade. It's pure folklore — leave them out.",
    },
    {
      title: "Submit your site to 100 directories",
      truth: "Spammy directory submissions can actively hurt rankings. Focus on a handful of relevant, niche-specific citations instead.",
    },
    {
      title: "Use only one H1 per page",
      truth: "HTML5 allows multiple H1s, and Google handles them fine. What matters is a clear heading hierarchy, not the count.",
    },
    {
      title: "Exact-match keywords in URLs are critical",
      truth: "Helpful but heavily overemphasized. Short, descriptive, human-readable URLs beat keyword-stuffed ones.",
    },
  ],
  toolTitle: "Learning the tool itself?",
  toolIntro:
    "This page teaches SEO. The step-by-step guides in Docs teach the app: auditing a site, writing and publishing an article, the monthly report, team accounts and roles.",
  toolLink: "Open the guides",
};

const fr: LearnContent = {
  title: "Apprendre",
  description:
    "Les bases du SEO en langage clair. Chaque recommandation de cet outil repose sur ce que Google a réellement confirmé, pas sur des légendes.",
  rulesTitle: "Cinq règles qui tiennent toujours en 2026",
  goldenRules: [
    "Écrivez d'abord pour les humains, ensuite pour les moteurs : Google récompense de mieux en mieux ce qui aide vraiment.",
    "Méritez vos liens. Créez quelque chose qui vaut un lien, puis faites-le connaître. N'achetez pas et n'échangez pas de liens.",
    "La vitesse est une fonctionnalité, pas un luxe. Un site lent perd à la fois des positions et des conversions, surtout sur mobile.",
    "La régularité bat l'intensité. Cinq articles de qualité par an sur un même sujet valent mieux que 50 articles dispersés.",
    "Le mobile d'abord n'est pas négociable. Google indexe la version mobile de votre site : s'il est cassé sur téléphone, vous ne vous positionnez pas.",
  ],
  glossaryTitle: "Glossaire",
  glossaryIntro:
    "Chaque terme expliqué simplement, avec le « pourquoi c'est important » que la plupart des glossaires oublient.",
  whyItMatters: "Pourquoi c'est important :",
  glossary: [
    {
      term: "Balise title",
      short: "Le titre cliquable de votre résultat de recherche.",
      why: "C'est le signal le plus fort dont Google dispose sur le sujet d'une page. Visez 50 à 60 caractères, avec le mot-clé principal au début.",
    },
    {
      term: "Meta description",
      short: "Le texte de résumé affiché sous le titre dans les résultats.",
      why: "Ce n'est pas un facteur de classement direct, mais elle pèse beaucoup sur le taux de clic. 120 à 155 caractères avec une promesse claire.",
    },
    {
      term: "Balise canonical",
      short: "Indique à Google la version principale d'une page quand des pages similaires existent.",
      why: "Sans canonical, Google devine quelle URL est la « vraie » et peut répartir vos signaux de classement entre les doublons.",
    },
    {
      term: "Core Web Vitals",
      short: "Les trois indicateurs d'expérience de page de Google : LCP, INP, CLS.",
      why: "LCP sous 2,5 s, INP sous 200 ms, CLS sous 0,1. Les rater pénalise à la fois le classement et les conversions sur les pages commerciales.",
    },
    {
      term: "E-E-A-T",
      short: "Expérience, Expertise, Autorité, Fiabilité.",
      why: "Ce que les évaluateurs qualité de Google recherchent dans un contenu. De vrais auteurs avec de vraies compétences battent le contenu IA anonyme, surtout sur les sujets YMYL (santé, argent, droit).",
    },
    {
      term: "Données structurées (JSON-LD)",
      short: "Des données lisibles par les machines qui disent à Google de quoi parle votre page.",
      why: "Elles débloquent les résultats enrichis (étoiles d'avis, FAQ dépliables, infos produit, fil d'Ariane) qui améliorent directement le taux de clic et la visibilité.",
    },
    {
      term: "Mot-clé à portée de main",
      short: "Un mot-clé sur lequel vous êtes classé entre la 4e et la 15e position.",
      why: "Ce sont les mots-clés les plus rentables à optimiser. De petites améliorations vous font passer en page 1 ou dans le top 3, là où se font presque tous les clics.",
    },
    {
      term: "Érosion du contenu",
      short: "Quand une page bien classée perd du trafic avec le temps.",
      why: "Rafraîchir un contenu qui s'érode récupère du trafic pour une fraction du coût d'un nouvel article. C'est la tâche de contenu la plus rentable, et la plus négligée.",
    },
    {
      term: "Cocon sémantique (cluster)",
      short: "Une page pilier sur un sujet large, entourée d'articles de soutien qui pointent vers elle.",
      why: "Il démontre l'autorité thématique, c'est-à-dire la couverture en profondeur d'un sujet, l'un des signaux de qualité les plus forts depuis les mises à jour « helpful content ».",
    },
    {
      term: "Backlink",
      short: "Un lien d'un autre site vers le vôtre.",
      why: "Toujours l'un des principaux facteurs de classement. La qualité compte bien plus que la quantité : un lien d'un site pertinent et reconnu vaut mieux que cinquante liens médiocres.",
    },
  ],
  linksTitle: "Le netlinking en 2026",
  linksIntro:
    "Ce qui marche encore, classé selon l'effort réaliste et le gain. Rien de tout ça n'est du « 50 liens PBN pas chers ». De vrais liens demandent une vraie valeur.",
  hardRulesTitle: "Les règles fermes de 2026",
  linkRules: [
    "Le fichier de désaveu est presque obsolète : l'équipe anti-spam de Google neutralise les mauvais liens automatiquement. Ne désavouez qu'après une pénalité manuelle.",
    "Les réseaux PBN sont détectables et dévalués. Arrêtez de dépenser du budget dans des réseaux de liens privés.",
    "Les liens réciproques (je te lie, tu me lies) passent à petite échelle. À grande échelle, ils laissent une empreinte.",
    "La diversité des ancres compte plus que leur densité en mots-clés. Visez 70 % d'ancres de marque ou génériques, 30 % d'ancres optimisées.",
    "DR et DA sont des corrélations, pas des causes. Un vrai lien d'un site pertinent à DR 30 peut battre un lien payé à DR 70.",
    "Le contenu sponsorisé avec un attribut rel nofollow ou sponsored ne pose pas de problème. Le placement payé caché est risqué.",
  ],
  effort: "effort :",
  payoff: "gain :",
  levels: { low: "faible", medium: "moyen", high: "élevé", "very high": "très élevé" },
  linkPlays: [
    {
      name: "Relations presse digitales / études de données",
      summary:
        "Publiez une étude ou une enquête originale aux résultats surprenants. Proposez-la aux journalistes qui couvrent le sujet. Le moyen le plus fiable d'obtenir des liens de médias et de sites institutionnels en 2026.",
      effort: "high",
      payoff: "high",
    },
    {
      name: "Récupération de liens cassés",
      summary:
        "Repérez sur des sites concurrents ou de votre niche des pages cassées qui faisaient un lien vers un sujet que vous traitez. Écrivez au webmaster avec une URL de remplacement qui fonctionne. Taux de réussite de 5 à 15 %.",
      effort: "medium",
      payoff: "medium",
    },
    {
      name: "Pages de ressources",
      summary:
        "Cherchez `inurl:ressources` + votre niche. Si votre contenu convient mieux que ce qui y figure, demandez. Idéal pour des outils ou des guides réellement utiles.",
      effort: "medium",
      payoff: "medium",
    },
    {
      name: "Réponses aux journalistes (HARO, Qwoted…)",
      summary:
        "Répondez aux demandes de journalistes avec une expertise citable. Des retombées presse dans des médias nationaux et spécialisés. Une habitude de 15 minutes par jour.",
      effort: "low",
      payoff: "high",
    },
    {
      name: "Insertions de liens dans des articles existants",
      summary:
        "Trouvez des articles pertinents sur des sites reconnus et proposez une mise à jour d'une section où votre lien apporte quelque chose. Aucun nouveau contenu à leur demander.",
      effort: "medium",
      payoff: "medium",
    },
    {
      name: "Articles invités (avec discernement)",
      summary:
        "Uniquement sur des sites avec de vrais lecteurs et une ligne éditoriale. L'article invité façon PBN est une tactique des années 2010, dévaluée par les mises à jour anti-spam.",
      effort: "high",
      payoff: "low",
    },
    {
      name: "Mentions sans lien",
      summary:
        "Mettez en place une alerte ou une veille sur votre marque. Quand quelqu'un vous cite sans lien, demandez-le. Environ 30 % de réussite si la mention est positive.",
      effort: "low",
      payoff: "medium",
    },
    {
      name: "Créer des contenus qui attirent les liens",
      summary:
        "Outils gratuits, calculateurs, guides de référence, compilations de statistiques. On fait un lien parce que le contenu résout un problème : des liens gagnés passivement pendant des années.",
      effort: "high",
      payoff: "very high",
    },
    {
      name: "Audit du maillage interne (effet cumulé)",
      summary:
        "Ce n'est pas du netlinking externe, mais cela double l'effet de chaque backlink obtenu. Faites circuler l'autorité de vos pages les plus fortes vers les plus faibles chaque mois.",
      effort: "low",
      payoff: "high",
    },
  ],
  folkloreTitle: "Légendes du SEO : les mythes à ignorer",
  folkloreIntro:
    "Les mauvais conseils qu'on lit encore dans de vieux articles et sur les forums. Épargnez-vous les efforts inutiles.",
  folklore: [
    {
      title: "La densité de mots-clés doit être de 2 à 3 %",
      truth: "Google a dit clairement que la densité de mots-clés n'est pas un facteur de classement. Écrivez naturellement et laissez la pertinence sémantique parler.",
    },
    {
      title: "La balise meta keywords compte",
      truth: "Google n'utilise plus la balise meta keywords comme signal depuis plus de dix ans. C'est une pure légende : laissez-la de côté.",
    },
    {
      title: "Inscrivez votre site dans 100 annuaires",
      truth: "Les inscriptions massives dans des annuaires douteux peuvent nuire au classement. Concentrez-vous sur quelques citations pertinentes dans votre niche.",
    },
    {
      title: "Un seul H1 par page",
      truth: "HTML5 autorise plusieurs H1 et Google les gère très bien. Ce qui compte, c'est une hiérarchie de titres claire, pas leur nombre.",
    },
    {
      title: "Le mot-clé exact dans l'URL est indispensable",
      truth: "Utile mais très surestimé. Des URL courtes, descriptives et lisibles battent les URL bourrées de mots-clés.",
    },
  ],
  toolTitle: "Vous voulez apprendre l'outil lui-même ?",
  toolIntro:
    "Cette page enseigne le SEO. Les guides pas à pas de la section Docs enseignent l'application : auditer un site, rédiger et publier un article, le rapport mensuel, l'équipe et les rôles.",
  toolLink: "Ouvrir les guides",
};

export function learnContent(locale: Locale | string): LearnContent {
  return locale === "fr" ? fr : en;
}
