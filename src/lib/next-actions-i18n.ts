/**
 * The words of the ranked "what to do next" list (next-actions.ts), in
 * each interface language. Same approach as report-i18n.ts: a typed
 * table, so a missing translation does not compile, and the workspace
 * language decides.
 */

import type { Locale } from "@/i18n/config";

const s = (n: number, one: string, other: string) => (n === 1 ? one : other);

const en = {
  firstAuditTitle: "Run the first audit",
  firstAuditWhy: "Nothing else here has anything to work from until the site has been crawled once.",
  firstAuditBecause: "no completed audit for this client",
  recrawlTitle: (days: number) => `Re-crawl: the last audit is ${days} days old`,
  recrawlWhy:
    "Findings older than a month describe a site that may already have changed, and acting on them means fixing problems that are gone.",
  recrawlBecause: (days: number) => `last audit ${days} days ago`,
  unreachableTitle: "The site could not be reached at all",
  unreachableWhy:
    "The last crawl fetched no pages, so every number on this client is describing nothing. Usually a wrong URL, a site that is down, or a firewall blocking us.",
  unreachableBecause: "the crawler fetched zero pages",
  agentFixTitle: (n: number) => `${n} ${s(n, "finding", "findings")} the agent can fix itself`,
  agentFixWhy:
    "These need no decision from you. Turn the agent on for this client and they get done overnight, with an undo on every change.",
  agentFixBecauseSplit: (crawl: number, tools: number) =>
    `${crawl} from the crawl and ${tools} from the tools match a fixable type`,
  agentFixBecause: (n: number) => `${n} open ${s(n, "finding matches", "findings match")} a fixable type`,
  worstWhy: "The agent has no way to do this one: it needs a decision, a server change, or a person who knows the business.",
  worstBecause: (n: number, sev: string) => `${n} open ${sev} ${s(n, "finding", "findings")} of one type`,
  onPages: (what: string, n: number) => `${what}, on ${n} pages`,
  gscTitle: "Connect Search Console",
  gscWhy:
    "Free, ten minutes, and it is the only source of what people actually searched to reach this site. Half the tools here stay guesses without it.",
  gscBecause: "no Search Console property connected",
  rankCheckTitle: (n: number) =>
    `Check where ${n} tracked ${s(n, "keyword actually ranks", "keywords actually rank")}`,
  rankCheckWhy:
    "They have been tracked since onboarding and never once checked, so every report about them is currently blank.",
  rankCheckBecause: (n: number) => `${n} ${s(n, "keyword", "keywords")} tracked, 0 rank checks recorded`,
  droppedTitle: (n: number) => `${n} ${s(n, "keyword", "keywords")} lost ground in search`,
  droppedWhy:
    "A page that was ranking and now is not is the cheapest traffic to win back: it already had whatever it needed once.",
  droppedBecause: (query: string, move: string) => `worst: "${query}" ${move}`,
  moveOut: (from: number) => `fell from #${from} out of the results entirely`,
  moveTo: (from: number, to: number) => `fell from #${from} to #${to}`,
  overdueTitle: (n: number) => `${n} ${s(n, "task is", "tasks are")} past their due date`,
  overdueWhy:
    "A plan nobody is following is worse than no plan: it hides the things that do still matter. Clear them or move the dates.",
  overdueBecause: (n: number) => `${n} to-do ${s(n, "task", "tasks")} past due`,
  toolWhy:
    "Found by one of the tools rather than the crawl, and serious enough to be worth a look before anything cosmetic.",
  toolBecauseOne: (sev: string, tool: string) => `1 open ${sev} finding from ${tool}`,
  toolBecauseMany: (n: number) => `${n} open critical or high findings across the tools`,
  closeTitle: (n: number) => `${n} ${s(n, "keyword", "keywords")} sitting just off page one`,
  closeWhy:
    "These already rank and already get impressions. Moving one from 11 to 8 is a title and a few internal links, not a new page.",
  closeBecause: (q: string, pos: number, impr: number) =>
    `best opportunity: "${q}" at #${pos} on ${impr} impressions`,
  decayTitle: (n: number) => `${n} ${s(n, "page", "pages")} losing traffic they used to earn`,
  decayWhy:
    "A page that ranked and slipped is the cheapest traffic to win back: it already had whatever it needed once.",
  decayBecause: (page: string, pct: number, clicks: number) => `worst: ${page} down ${pct}% from ${clicks} clicks`,
  planOverdueTitle: (n: number) => `${n} ${s(n, "item", "items")} of the approved plan overdue`,
  planOverdueWhy:
    "This is the work the client signed off, and the monthly report will say whether it happened. Slipping quietly is how an engagement ends.",
  planOverdueBecause: (week: number, total: number, phase: string | null, done: number, all: number) =>
    `week ${week} of ${total}${phase ? `, ${phase}` : ""}: ${done} of ${all} done`,
  lostLinksTitle: (n: number) => `${n} ${s(n, "backlink", "backlinks")} disappeared`,
  lostLinksWhy:
    "Someone already agreed to link to this site once, so asking why it went is a far shorter conversation than earning a new one.",
  lostLinksBecause: (n: number) => `${n} ${s(n, "link", "links")} checked and no longer found on the source page`,
  writePlanTitle: "Write the plan this client signs off",
  writePlanWhy:
    "One document with what we found, where their keywords stand and what happens in which week. It also freezes the starting numbers, so next month has something to be measured against.",
  writePlanBecause: "no approval document exists for this client",
  sendPlanTitle: "Send the plan: it is still a draft",
  sendPlanWhy: "It is written and the client has not seen it. Work agreed in writing is work you do not have to justify later.",
  sendPlanBecause: "approval document exists but status is draft",
  severity: { critical: "critical", high: "high", medium: "medium", low: "low" } as Record<string, string>,
};

export type NextActionStrings = typeof en;

const fr: NextActionStrings = {
  firstAuditTitle: "Lancer le premier audit",
  firstAuditWhy: "Rien d'autre ici n'a de quoi travailler tant que le site n'a pas été exploré une première fois.",
  firstAuditBecause: "aucun audit terminé pour ce client",
  recrawlTitle: (days) => `Relancer l'exploration : le dernier audit date de ${days} jours`,
  recrawlWhy:
    "Des résultats de plus d'un mois décrivent un site qui a peut-être déjà changé : agir dessus, c'est corriger des problèmes qui n'existent plus.",
  recrawlBecause: (days) => `dernier audit il y a ${days} jours`,
  unreachableTitle: "Le site n'a pas pu être atteint",
  unreachableWhy:
    "La dernière exploration n'a récupéré aucune page : tous les chiffres de ce client ne décrivent rien. Le plus souvent une mauvaise adresse, un site en panne ou un pare-feu qui nous bloque.",
  unreachableBecause: "l'exploration n'a récupéré aucune page",
  agentFixTitle: (n) => `${n} ${s(n, "problème que l'agent peut corriger", "problèmes que l'agent peut corriger")} seul`,
  agentFixWhy:
    "Aucune décision à prendre. Activez l'agent pour ce client : ce sera fait dans la nuit, chaque modification pouvant être annulée.",
  agentFixBecauseSplit: (crawl, tools) =>
    `${crawl} issus de l'exploration et ${tools} des outils correspondent à un type corrigeable`,
  agentFixBecause: (n) =>
    `${n} ${s(n, "problème ouvert correspond", "problèmes ouverts correspondent")} à un type corrigeable`,
  worstWhy:
    "L'agent ne peut pas s'en charger : il faut une décision, une modification du serveur ou quelqu'un qui connaît l'activité.",
  worstBecause: (n, sev) => `${n} ${s(n, "problème ouvert", "problèmes ouverts")} de gravité ${sev}, d'un même type`,
  onPages: (what, n) => `${what}, sur ${n} pages`,
  gscTitle: "Connecter Search Console",
  gscWhy:
    "Gratuit, dix minutes, et c'est la seule source de ce que les gens ont réellement cherché pour arriver sur ce site. Sans elle, la moitié des outils restent des estimations.",
  gscBecause: "aucune propriété Search Console connectée",
  rankCheckTitle: (n) =>
    `Vérifier la position réelle ${s(n, "du mot-clé suivi", `des ${n} mots-clés suivis`)}`,
  rankCheckWhy:
    "Ils sont suivis depuis l'intégration mais n'ont jamais été vérifiés : chaque rapport à leur sujet est vide pour l'instant.",
  rankCheckBecause: (n) => `${n} ${s(n, "mot-clé suivi", "mots-clés suivis")}, aucun relevé de position`,
  droppedTitle: (n) => `${n} ${s(n, "mot-clé a perdu", "mots-clés ont perdu")} des places`,
  droppedWhy:
    "Une page qui était bien classée et ne l'est plus, c'est le trafic le moins cher à récupérer : elle avait déjà tout ce qu'il fallait.",
  droppedBecause: (query, move) => `le pire : « ${query} » ${move}`,
  moveOut: (from) => `est passé de la position ${from} à hors des résultats`,
  moveTo: (from, to) => `est passé de la position ${from} à ${to}`,
  overdueTitle: (n) => `${n} ${s(n, "tâche a dépassé", "tâches ont dépassé")} leur échéance`,
  overdueWhy:
    "Un plan que personne ne suit est pire que pas de plan : il cache ce qui compte encore. Terminez-les ou décalez les dates.",
  overdueBecause: (n) => `${n} ${s(n, "tâche à faire en retard", "tâches à faire en retard")}`,
  toolWhy:
    "Trouvé par un des outils plutôt que par l'exploration, et assez sérieux pour passer avant les détails cosmétiques.",
  toolBecauseOne: (sev, tool) => `1 problème ouvert de gravité ${sev} trouvé par ${tool}`,
  toolBecauseMany: (n) => `${n} problèmes ouverts critiques ou élevés relevés par les outils`,
  closeTitle: (n) => `${n} ${s(n, "mot-clé juste aux portes", "mots-clés juste aux portes")} de la première page`,
  closeWhy:
    "Ils sont déjà classés et ont déjà des impressions. Passer de la 11e à la 8e place, c'est un titre et quelques liens internes, pas une nouvelle page.",
  closeBecause: (q, pos, impr) => `meilleure opportunité : « ${q} » en position ${pos} avec ${impr} impressions`,
  decayTitle: (n) => `${n} ${s(n, "page perd", "pages perdent")} le trafic qu'elles gagnaient`,
  decayWhy:
    "Une page bien classée qui a glissé, c'est le trafic le moins cher à récupérer : elle avait déjà tout ce qu'il fallait.",
  decayBecause: (page, pct, clicks) => `le pire : ${page}, en baisse de ${pct} % sur ${clicks} clics`,
  planOverdueTitle: (n) => `${n} ${s(n, "action du plan validé est", "actions du plan validé sont")} en retard`,
  planOverdueWhy:
    "C'est le travail que le client a validé, et le rapport mensuel dira s'il a été fait. Prendre du retard en silence, c'est ainsi qu'une collaboration se termine.",
  planOverdueBecause: (week, total, phase, done, all) =>
    `semaine ${week} sur ${total}${phase ? `, ${phase}` : ""} : ${done} sur ${all} réalisées`,
  lostLinksTitle: (n) => `${n} ${s(n, "backlink a disparu", "backlinks ont disparu")}`,
  lostLinksWhy:
    "Quelqu'un a déjà accepté une fois de faire un lien vers ce site : demander pourquoi il a disparu est bien plus court que d'en obtenir un nouveau.",
  lostLinksBecause: (n) => `${n} ${s(n, "lien vérifié et introuvable", "liens vérifiés et introuvables")} sur la page source`,
  writePlanTitle: "Rédiger le plan que le client valide",
  writePlanWhy:
    "Un document avec ce que nous avons trouvé, où en sont ses mots-clés et ce qui se passe chaque semaine. Il fige aussi les chiffres de départ, pour que le mois prochain ait une base de comparaison.",
  writePlanBecause: "aucun document de validation pour ce client",
  sendPlanTitle: "Envoyer le plan : il est encore en brouillon",
  sendPlanWhy:
    "Il est rédigé et le client ne l'a pas vu. Un travail validé par écrit, c'est un travail qu'on n'a pas à justifier ensuite.",
  sendPlanBecause: "le document de validation existe mais il est en brouillon",
  severity: { critical: "critique", high: "élevée", medium: "moyenne", low: "faible" },
};

const STRINGS: Record<Locale, NextActionStrings> = { en, fr };

export function nextActionStrings(locale: Locale): NextActionStrings {
  return STRINGS[locale];
}
