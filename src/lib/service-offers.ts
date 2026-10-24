/**
 * The agency's catalogue of services, and the starter set it opens with.
 *
 * The starter prices are indicative French-market figures for a
 * freelancer or small agency, there so a first quote is not built from
 * zeros. They are meant to be changed: the catalogue page says so, and
 * nothing else in the app treats them as anything but the user's own.
 */

export type OfferKind = "one_off" | "monthly";

/**
 * flat: the catalogue price. hourly: priced from the audit's findings,
 * times the minutes per fix, times the hourly rate.
 */
export type OfferBilling = "flat" | "hourly";

/** A service as copied into a proposal. Frozen; see proposals.offersJson. */
export type OfferSnapshot = {
  offerId: number;
  name: string;
  kind: OfferKind;
  billing: OfferBilling;
  summary: string;
  deliverables: string[];
  /** Total for one_off, per month for monthly. Ignored for hourly billing. */
  estimatedHours: number;
  /** Days to deliver (one_off) or minimum months (monthly). */
  duration: number;
  price: number;
};

export type OfferDraft = Omit<OfferSnapshot, "offerId">;

const FR: OfferDraft[] = [
  {
    name: "Audit SEO-Ready",
    kind: "one_off",
    billing: "flat",
    summary: "État des lieux complet du site : technique, contenu, visibilité IA. Pour un site neuf, une refonte, ou un prospect qui veut savoir où il en est.",
    deliverables: [
      "Audit complet du site (technique, contenu, Core Web Vitals, visibilité IA)",
      "Rapport d'audit avec les erreurs classées par gravité",
      "Liste des corrections priorisées, avec le temps estimé",
      "Point de restitution de 30 minutes",
    ],
    estimatedHours: 10,
    duration: 7,
    price: 900,
  },
  {
    name: "Mise en conformité technique",
    kind: "one_off",
    billing: "hourly",
    summary: "Correction des erreurs trouvées par l'audit, au temps passé : nombre d'erreurs × temps par correction × taux horaire.",
    deliverables: [
      "Corrections appliquées sur le site, des plus graves aux moins graves",
      "Nouvel audit pour vérifier chaque correction",
      "Compte rendu avant / après",
    ],
    estimatedHours: 0,
    duration: 21,
    price: 0,
  },
  {
    name: "Suivi SEO mensuel",
    kind: "monthly",
    billing: "flat",
    summary: "Progresser dans la durée : mesurer, corriger, produire et rendre compte chaque mois.",
    deliverables: [
      "Suivi des positions et du trafic (Search Console, GA4)",
      "Surveillance des pages et alertes en cas de problème",
      "Corrections techniques du mois",
      "Rapport mensuel et accès au portail client",
      "Nouvel audit complet chaque trimestre",
    ],
    estimatedHours: 8,
    duration: 6,
    price: 600,
  },
  {
    name: "Production de contenu (4 articles / mois)",
    kind: "monthly",
    billing: "flat",
    summary: "Articles rédigés dans la voix du client, optimisés face au top 10 de Google, puis publiés.",
    deliverables: [
      "Recherche de mots-clés et plan validé pour chaque article",
      "4 articles rédigés et optimisés (score SEO face au top 10)",
      "Publication sur le site avec balisage Schema",
      "Posts réseaux sociaux et extrait de newsletter",
    ],
    estimatedHours: 12,
    duration: 3,
    price: 600,
  },
  {
    name: "Netlinking",
    kind: "monthly",
    billing: "flat",
    summary: "Gagner de l'autorité avec des liens obtenus sur des sites pertinents.",
    deliverables: [
      "Analyse des backlinks et des concurrents",
      "Campagne de prospection et de relance",
      "Récupération des liens cassés",
      "Suivi des liens obtenus",
    ],
    estimatedHours: 6,
    duration: 3,
    price: 500,
  },
  {
    name: "SEO local",
    kind: "monthly",
    billing: "flat",
    summary: "Être trouvé autour de chez soi : fiche Google, annuaires, positions locales.",
    deliverables: [
      "Optimisation de la fiche Google Business Profile",
      "Inscription et nettoyage des citations (annuaires)",
      "Suivi des positions locales et carte de chaleur",
      "Publications mensuelles sur la fiche",
    ],
    estimatedHours: 5,
    duration: 3,
    price: 350,
  },
  {
    name: "Visibilité IA (GEO)",
    kind: "one_off",
    billing: "flat",
    summary: "Être cité par ChatGPT, Perplexity, Claude et les AI Overviews.",
    deliverables: [
      "Score de visibilité dans les assistants IA",
      "Audit GEO du site",
      "Fichier llms.txt et politique des robots d'IA",
      "Recommandations de contenu priorisées",
    ],
    estimatedHours: 8,
    duration: 10,
    price: 700,
  },
  {
    name: "Publicité (structure de campagnes)",
    kind: "one_off",
    billing: "flat",
    summary: "Pour un client qui achète aussi du trafic : une structure de campagnes cohérente avec le SEO.",
    deliverables: [
      "Architecture du funnel publicitaire",
      "Analyse marque / hors marque",
      "Recommandations de budget et de mots-clés",
    ],
    estimatedHours: 10,
    duration: 10,
    price: 800,
  },
];

const EN: OfferDraft[] = [
  {
    ...FR[0],
    name: "SEO-Ready audit",
    summary: "A full review of the site: technical, content, AI visibility. For a new site, a redesign, or a prospect who wants to know where they stand.",
    deliverables: [
      "Full site audit (technical, content, Core Web Vitals, AI visibility)",
      "Audit report with errors ranked by severity",
      "Prioritised list of fixes, with estimated time",
      "30-minute walkthrough call",
    ],
  },
  {
    ...FR[1],
    name: "Technical fixes",
    summary: "Fixing what the audit found, billed on time: number of errors × time per fix × hourly rate.",
    deliverables: [
      "Fixes applied to the site, most severe first",
      "A new audit to check every fix",
      "Before / after summary",
    ],
  },
  {
    ...FR[2],
    name: "Monthly SEO",
    summary: "Steady progress: measure, fix, produce and report every month.",
    deliverables: [
      "Rank and traffic tracking (Search Console, GA4)",
      "Page monitoring and alerts",
      "The month's technical fixes",
      "Monthly report and client portal access",
      "A full audit every quarter",
    ],
  },
  {
    ...FR[3],
    name: "Content (4 articles / month)",
    summary: "Articles written in the client's voice, scored against Google's top 10, then published.",
    deliverables: [
      "Keyword research and an approved outline per article",
      "4 articles written and optimised (SEO score against the top 10)",
      "Published on the site with schema markup",
      "Social posts and a newsletter excerpt",
    ],
  },
  {
    ...FR[4],
    name: "Link building",
    summary: "Build authority with links from relevant sites.",
    deliverables: [
      "Backlink and competitor analysis",
      "Outreach and follow-up campaign",
      "Broken link reclamation",
      "Tracking of links won",
    ],
  },
  {
    ...FR[5],
    name: "Local SEO",
    summary: "Get found nearby: Google profile, directories, local rankings.",
    deliverables: [
      "Google Business Profile optimisation",
      "Citation building and clean-up",
      "Local rank tracking and heatmap",
      "Monthly profile posts",
    ],
  },
  {
    ...FR[6],
    name: "AI visibility (GEO)",
    summary: "Get cited by ChatGPT, Perplexity, Claude and AI Overviews.",
    deliverables: [
      "AI assistant visibility score",
      "GEO audit of the site",
      "llms.txt file and AI crawler policy",
      "Prioritised content recommendations",
    ],
  },
  {
    ...FR[7],
    name: "Paid search (campaign structure)",
    summary: "For a client who also buys traffic: a campaign structure that fits the SEO work.",
    deliverables: [
      "Ad funnel architecture",
      "Branded / non-branded analysis",
      "Budget and keyword recommendations",
    ],
  },
];

/** The starter catalogue, in the workspace's language. */
export function defaultOffers(locale: string): OfferDraft[] {
  return locale === "en" ? EN : FR;
}

/** The frozen copy of a catalogue row that a proposal keeps. */
export function offerSnapshot(row: {
  id: number;
  name: string;
  kind: OfferKind;
  billing: OfferBilling;
  summary: string | null;
  deliverables: string[];
  estimatedHours: number;
  duration: number;
  price: number;
}): OfferSnapshot {
  return {
    offerId: row.id,
    name: row.name,
    kind: row.kind,
    billing: row.billing,
    summary: row.summary ?? "",
    deliverables: row.deliverables,
    estimatedHours: row.estimatedHours,
    duration: row.duration,
    price: row.price,
  };
}
