/**
 * Turn audit findings into proposal scope lines.
 *
 * The restraint here IS the feature. A proposal generator that writes
 * "we will increase your organic traffic by 300%" is a lie generator
 * with a PDF export — and a proposal is the worst possible place for an
 * unfounded number, because the client keeps the document and holds you
 * to it.
 *
 * So this maps findings to work, and stops:
 *
 *   - Every line traces to findings that were actually observed. No work
 *     item appears because it is usually in a proposal.
 *   - No traffic, ranking or revenue forecast. None of those can be
 *     predicted from a crawl, and pretending otherwise is how agencies
 *     end up in arguments they lose.
 *   - Effort is a standard time per fix (minutesEach), shown so a quote
 *     can say how much work it is. It is a default the user edits in the
 *     catalogue, not a measurement: we do not know how fast this person
 *     works or what their client's CMS is like.
 *   - Pricing comes from the user's own rate or catalogue. The tool has
 *     no basis for pricing someone else's labour.
 *
 * What it does claim is the honest thing: here is what is wrong, here is
 * the work that addresses it, here is how many pages it affects.
 */

export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export type ScopeLine = {
  label: string;
  detail: string;
  /** How many findings this line covers. Real count, shown in the PDF. */
  findings: number;
  /** Which work item this is, so its minutes can be looked up and edited. */
  key?: string;
  /** Standard minutes to fix one finding of this kind. */
  minutesEach?: number;
  /** The same findings, counted by audit severity. */
  bySeverity?: Partial<Record<Severity, number>>;
};

export type Finding = {
  type: string;
  severity: string;
  url?: string | null;
};

/**
 * Groups of finding types that are one piece of work.
 *
 * Ordered by the order the work should be presented in — technical
 * foundations before content polish, because that is the order it should
 * be done in and a proposal that reads out of sequence invites
 * questions about whether the author thought about it.
 */
type WorkItem = {
  key: string;
  label: string;
  detail: string;
  /** French wording, used when the document is written in French. */
  fr: { label: string; detail: string };
  /** Default minutes to fix one finding. Editable in the catalogue. */
  minutesEach: number;
  types: string[];
};

const WORK_ITEMS: WorkItem[] = [
  {
    key: "indexability",
    label: "Fix indexability and crawl blockers",
    detail:
      "Anything stopping search engines reaching or indexing pages — robots rules, noindex tags, broken canonicals, redirect chains. Nothing else moves until these do.",
    fr: {
      label: "Débloquer l'indexation et l'exploration",
      detail:
        "Tout ce qui empêche les moteurs d'atteindre ou d'indexer les pages : règles robots, balises noindex, canoniques cassées, chaînes de redirection. Rien d'autre ne bouge tant que ce n'est pas réglé.",
    },
    minutesEach: 30,
    types: [
      "noindex_set",
      "blocked_by_robots",
      "missing_robots_txt",
      "invalid_robots_txt",
      "redirect_chain",
      "broken_link",
      "missing_canonical",
      "canonical_mismatch",
      "soft_404",
      "blocked_url",
    ],
  },
  {
    key: "titles",
    label: "Rewrite page titles and meta descriptions",
    detail:
      "Titles and descriptions that are missing, truncated in search results, or duplicated across pages. This is what people read before deciding whether to click.",
    fr: {
      label: "Réécrire les titres et meta descriptions",
      detail:
        "Titres et descriptions absents, coupés dans les résultats ou dupliqués entre pages. C'est ce que les internautes lisent avant de cliquer.",
    },
    minutesEach: 10,
    types: [
      "missing_title",
      "short_title",
      "long_title",
      
      
      "duplicate_title",
      "missing_meta_description",
      "short_meta_description",
      "long_meta_description",
      
      "duplicate_meta_description",
    ],
  },
  {
    key: "headings",
    label: "Correct heading structure",
    detail:
      "Pages with no H1 or a heading order that doesn't describe the content. Affects how clearly both readers and search engines understand each page.",
    fr: {
      label: "Corriger la structure des titres",
      detail:
        "Pages sans H1 ou avec une hiérarchie de titres qui ne décrit pas le contenu. Joue sur la compréhension de la page par les lecteurs comme par les moteurs.",
    },
    minutesEach: 10,
    types: ["missing_h1",  "heading_order", "h1_matches_title"],
  },
  {
    key: "schema",
    label: "Add structured data",
    detail:
      "Schema markup so pages can qualify for rich results — review stars, FAQs, breadcrumbs, product details. Which types apply depends on the page.",
    fr: {
      label: "Ajouter les données structurées",
      detail:
        "Balisage Schema pour viser les résultats enrichis : avis, FAQ, fil d'Ariane, fiches produit. Les types à poser dépendent de chaque page.",
    },
    minutesEach: 30,
    types: ["missing_schema", "invalid_schema", "schema_error"],
  },
  {
    key: "images",
    label: "Image optimisation and alt text",
    detail:
      "Images with no alt text, oversized files, or formats that slow pages down. Covers accessibility and image search as well as speed.",
    fr: {
      label: "Optimiser les images et leurs textes alternatifs",
      detail:
        "Images sans texte alternatif, trop lourdes ou dans un format qui ralentit les pages. Touche l'accessibilité et la recherche d'images autant que la vitesse.",
    },
    minutesEach: 5,
    types: [
      
      "missing_image_alt",
      "large_image",
      "oversized_image",
      "unoptimised_image",
    ],
  },
  {
    key: "speed",
    label: "Page speed and Core Web Vitals",
    detail:
      "Loading performance against Google's thresholds. What's achievable depends on the platform, and we'll say plainly what is and isn't controllable on yours.",
    fr: {
      label: "Vitesse des pages et Core Web Vitals",
      detail:
        "Performances de chargement face aux seuils de Google. Ce qui est atteignable dépend de la plateforme ; on dira clairement ce qui est maîtrisable sur la vôtre.",
    },
    minutesEach: 60,
    types: [
      "slow_page",
      "poor_lcp",
      "poor_cls",
      "poor_inp",
      "render_blocking",
      "large_page",
    ],
  },
  {
    key: "technical",
    label: "Mobile and technical hygiene",
    detail:
      "Viewport configuration, HTTPS, security headers, and the small technical details that quietly cost trust signals.",
    fr: {
      label: "Mobile et hygiène technique",
      detail:
        "Viewport, HTTPS, en-têtes de sécurité, et les petits détails techniques qui coûtent discrètement en confiance.",
    },
    minutesEach: 20,
    types: [
      "missing_viewport",
      "not_https",
      "mixed_content",
      "missing_security_headers",
      "invalid_ssl",
      "missing_hsts",
      // Added after the check reported these as unmapped on a real
      // audit. Leaving them out meant the proposal quietly understated
      // the work — which is the same class of error as overstating it,
      // just in the direction that costs the freelancer money.
      "missing_favicon",
      "missing_lang",
    ],
  },
  {
    key: "ai-policy",
    label: "Set an AI crawler policy",
    detail:
      "Decide which AI crawlers may use the site's content, and state it in robots.txt. A choice worth making deliberately rather than by default — in either direction.",
    fr: {
      label: "Définir la politique des robots d'IA",
      detail:
        "Choisir quels robots d'IA peuvent utiliser le contenu du site, et l'écrire dans le robots.txt. Un choix à faire délibérément, dans un sens comme dans l'autre.",
    },
    minutesEach: 30,
    types: ["missing_ai_crawler_policy", "missing_llms_txt"],
  },
  {
    key: "content",
    label: "Content depth",
    detail:
      "Pages too thin to answer the query they target, or duplicated across the site. Addressed by rewriting or consolidating, not by adding words.",
    fr: {
      label: "Profondeur du contenu",
      detail:
        "Pages trop minces pour répondre à la recherche visée, ou dupliquées sur le site. Se règle en réécrivant ou en regroupant, pas en ajoutant des mots.",
    },
    minutesEach: 60,
    types: ["thin_content", "duplicate_content", "low_word_count"],
  },
  {
    key: "social",
    label: "Social and sharing metadata",
    detail:
      "Open Graph and Twitter card tags, so links shared to social platforms and messaging apps render properly instead of as bare URLs.",
    fr: {
      label: "Métadonnées de partage social",
      detail:
        "Balises Open Graph et Twitter, pour que les liens partagés sur les réseaux et messageries s'affichent correctement au lieu d'une URL nue.",
    },
    minutesEach: 10,
    types: ["missing_og_tags", "missing_twitter_card", "missing_og_image"],
  },
  {
    key: "linking",
    label: "Sitemap and internal linking",
    detail:
      "XML sitemap coverage and the internal links that route authority between pages. Often the cheapest gain on a site that already has content.",
    fr: {
      label: "Sitemap et maillage interne",
      detail:
        "Couverture du sitemap XML et liens internes qui répartissent l'autorité entre les pages. Souvent le gain le moins cher sur un site qui a déjà du contenu.",
    },
    minutesEach: 20,
    types: [
      "missing_sitemap",
      "orphan_pages",
      "deep_page",
      "few_internal_links",
    ],
  },
];

/**
 * Build scope lines from findings.
 *
 * Only returns lines with at least one matching finding. A proposal
 * padded with work the site doesn't need is the thing prospects notice
 * and distrust.
 */
export function deriveScope(
  findings: Finding[],
  options: { locale?: string; minutes?: Record<string, number> | null } = {},
): ScopeLine[] {
  const lines: ScopeLine[] = [];
  const fr = options.locale === "fr";

  for (const item of WORK_ITEMS) {
    const matched = findings.filter((f) => item.types.includes(f.type));
    if (matched.length === 0) continue;
    const bySeverity: Partial<Record<Severity, number>> = {};
    for (const f of matched) {
      const sev = normaliseSeverity(f.severity);
      bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
    }
    lines.push({
      key: item.key,
      label: fr ? item.fr.label : item.label,
      detail: fr ? item.fr.detail : item.detail,
      findings: matched.length,
      minutesEach: options.minutes?.[item.key] ?? item.minutesEach,
      bySeverity,
    });
  }

  return lines;
}

/**
 * The work items with their default minutes, for the catalogue page
 * where the user sets their own time per fix.
 */
export function workItemDefaults(locale = "en"): { key: string; label: string; minutesEach: number }[] {
  return WORK_ITEMS.map((i) => ({
    key: i.key,
    label: locale === "fr" ? i.fr.label : i.label,
    minutesEach: i.minutesEach,
  }));
}

/**
 * Audits say critical/high/medium/low; the grader and older checks also
 * say warning/info. Anything unknown counts as low rather than vanishing.
 */
export function normaliseSeverity(s: string): Severity {
  if (s === "critical" || s === "high" || s === "medium" || s === "low") return s;
  if (s === "error") return "high";
  if (s === "warning") return "medium";
  return "low";
}

/**
 * Findings we recognised but have no work item for.
 *
 * Surfaced to the user rather than silently dropped: if an audit is
 * producing types this file doesn't know about, the proposal is
 * understating the work, and the person sending it should be the one to
 * decide what to do about that.
 */
export function unmappedFindingTypes(findings: Finding[]): string[] {
  const known = new Set(WORK_ITEMS.flatMap((i) => i.types));
  return [
    ...new Set(findings.map((f) => f.type).filter((t) => !known.has(t))),
  ].sort();
}

/** Every type this module knows how to scope. Exposed for tests. */
export const SCOPED_TYPES = WORK_ITEMS.flatMap((i) => i.types);
export { WORK_ITEMS };
