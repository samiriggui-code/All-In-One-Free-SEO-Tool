# Audit UX de rank_forge — 24 octobre 2026

État de l'app en production après les PR #33 à #38, à partir des captures du
24/10 et du code. Rien n'est modifié tant que le plan (§3) n'est pas validé.

## 1. Le problème en une phrase

L'app est organisée autour de ses **outils** (≈ 95), pas autour du **travail
d'une agence sur un client**. Résultat : on ne sait ni où on en est, ni quoi
faire ensuite, ni pourquoi une info est affichée.

## 2. Constats page par page

### Barre latérale
- 11 sections numérotées et ~55 entrées. La numérotation suggère un circuit,
  mais chaque entrée ouvre un outil isolé, sans lien avec le client en cours.
- Pages globales (tableau de bord, tâches) et pages par client (audits,
  mots-clés, backlinks, rapports) sont mélangées au même niveau.
- Rien n'indique où en est chaque client dans le circuit.

### Pages « section » (Audits, Mots-clés, Backlinks, Rapports)
- Ce ne sont pas des vues globales : ce sont des **sélecteurs de client** qui
  redirigent vers `/audits/c/<id>`, `/keywords/c/<id>`… Avec un seul client,
  on a l'impression de « tomber direct sur le client ».
- La page Audits du client (`/audits/c/6`) et le bloc Audits de la fiche
  client (`/clients/6`) montrent les mêmes données **avec deux présentations
  différentes**.
- Aucune vue transversale : impossible de voir tous les audits, tous les
  scores ou toutes les tâches de l'agence d'un coup d'œil.

### Fiche client (`/clients/[id]`, 1 300 lignes)
- ~15 blocs empilés sans onglets : prochaines actions, panneau de **40 outils**
  à gauche, en-tête + score, 3 compteurs, automatisation quotidienne, Google,
  pont WordPress, planning de rapports, stack technique, niche, checklist,
  audits, partage, zone de danger.
- Le panneau des 40 outils occupe l'écran dès l'arrivée : on ne sait pas
  lequel lancer ni lequel a déjà tourné.
- Les « prochaines actions » sont en anglais et ne disent pas où on en est.

### Tableau de bord (`/`)
- Salutation, compteurs, derniers audits, tâches prioritaires, briefing du
  matin, checklist de démarrage, proposition d'autonomie, panneaux trafic et
  gains rapides.
- **Pas de liste ni de cartes clients**, pas de graphique de portefeuille,
  pas d'état d'avancement par client.

### Tâches (`/tasks`) — le pire
- **Une tâche par page et par problème** : 13 tâches « Trim the title on /…
  to under 60 chars » pour un seul constat.
- Les tâches sont créées **déjà en retard** (« 2 j de retard » le jour même).
- Texte en anglais, enregistré tel quel en base (vient de `quick-wins.ts`).
- Pas de regroupement par client ni par type de problème, pas de vue
  d'avancement (graphique), 24 tâches ouvertes / 0 terminée sans contexte.

### Audit
- Quand le site est injoignable (nd-prestige.tech), le score affiché est
  **0/100** comme si c'était un vrai résultat, au lieu de « audit échoué ».
- Logo du client cassé sur les anciens audits.

### Langue
- Reste en anglais : Prospects, Audit instantané, panneau d'outils du client,
  prochaines actions, tâches générées, constats du moteur.

## 3. Plan proposé : un circuit d'audit SEO de A à Z

Le circuit d'une agence, dans l'ordre :

1. **Prospect** → audit instantané, proposition
2. **Onboarding** → fiche client, comptes Google, accès WordPress
3. **Audit** → audit complet, score, constats
4. **Plan** → tâches regroupées et priorisées, validées avec le client
5. **Exécution** → corrections, contenu, liens, SEO local
6. **Suivi** → positions, trafic, nouvel audit
7. **Rapport** → rapport mensuel, facture

### 3.0 Séparer le cœur des modules

Ce n'est pas qu'un problème d'affichage : il faut trier ce qui **fait
tourner l'agence** (le circuit, toujours présent) et ce qui est **une option**
(un module, activé dans Réglages selon les prestations vendues).

**Le cœur — toujours actif, toujours fonctionnel :**
Tableau de bord · Clients · Audits · Plan & tâches · Rapports ·
Prospects (audit instantané, propositions, devis) · Factures · Réglages.
Il ne dépend que du crawl maison, sans clé payante. Si une page du cœur ne
fonctionne pas, c'est un bug, pas une option.

**Les modules — un par prestation du catalogue (`service-offers.ts`), plus
deux modules internes (Automatisation, Veille) qui sont globaux à l'agence
et ne dépendent d'aucune prestation vendue :**

| Module | Prestation | Pages et outils regroupés | Prérequis |
|---|---|---|---|
| Technique | Mise en conformité technique | CWV, liens cassés, cannibalisation, redirections, robots, sitemap, schema, hreflang, rendu, sécurité, scan WordPress | aucun (PageSpeed facultatif) |
| Mots-clés & suivi | Suivi SEO mensuel | Mots-clés suivis, concurrents, scans SERP, monitoring de pages, snapshots | Search Console conseillée |
| Contenu | Production de contenu | Studio de rédaction, tests de titres, réécriture des metas, outils de contenu | clé IA |
| Netlinking | Netlinking | Backlinks, link building, outreach, désaveu | aucun |
| SEO local | SEO local | Google Business Profile, citations, suivi local, heatmap | URL GBP du client |
| Visibilité IA (GEO) | Visibilité IA | Suivi de visibilité IA, llms.txt, robots IA, score GEO, citations IA | clé IA |
| Publicité | Publicité | Ad Funnel Architect, marque / hors marque | clé IA |
| Automatisation | (interne) | Agent IA, autopilot, automatisations, digest, briefing du matin | clé IA |
| Veille | (interne) | Actus SEO, mises à jour d'algorithme, historique des outils | aucun |

**Règles :**
1. **Réglages → Modules** : une carte par module avec un interrupteur, ses
   prérequis et leur état (✔ prêt / ⚠ il manque la clé X → bouton
   « Configurer »). Remplace l'interrupteur Guidé/Pro.
2. **Module désactivé** : ses pages disparaissent du menu et de la fiche
   client. Elles restent visibles, grisées, dans le catalogue d'outils avec
   « Activer le module ».
3. **Module activé mais pas configuré** : ses pages s'affichent avec un
   encart unique « Il manque X — Configurer » au lieu d'un écran cassé ou
   vide (on réutilise `tool-readiness.ts`, déjà écrit pour ça).
4. **Par client** : la fiche client ne montre que les onglets des modules
   correspondant aux **prestations vendues à ce client** (devis accepté),
   plus un bouton « Ajouter une prestation ». Un client en audit seul ne
   voit pas Netlinking ni SEO local.
5. **Catalogue des 95 outils** : une seule entrée « Boîte à outils », qui sert
   de réserve. Rien n'est supprimé, mais ce n'est plus le menu principal.

### 3.1 Barre latérale : 8 entrées globales

| Entrée | Contenu |
|---|---|
| Tableau de bord | Vue portefeuille (voir 3.3) |
| Clients | Liste ou cartes, avec l'étape du circuit de chaque client |
| Audits | **Tous** les audits de l'agence (tableau + graphique) |
| Tâches | Toutes les tâches, regroupées (voir 3.4) |
| Rapports | Tous les rapports, générés ou à générer |
| Prospects | Prospects + audit instantané + propositions |
| Boîte à outils | Le catalogue des 95 outils, modules inactifs grisés |
| Réglages | Compte, équipe, marque, connexions, **modules** |

Sous ces 8 entrées : une section « Modules actifs » qui liste seulement les
modules activés (ex. « SEO local », « Netlinking »), chacun ouvrant sa vue
globale tous clients confondus.

### 3.2 Fiche client : un espace de travail en onglets

En haut : nom, site, score, et une **frise du circuit** (Onboarding → Audit →
Plan → Exécution → Suivi → Rapport) avec chaque étape cochée, en cours ou à
faire, et un seul bouton « Prochaine étape ».

| Onglet | Contenu |
|---|---|
| Vue d'ensemble | Frise, 4 indicateurs, évolution du score, prochaine action |
| Audit | Le même rapport d'audit que la page globale (un seul composant) |
| Plan & tâches | Tâches de ce client, regroupées par problème |
| Mots-clés & contenu | Positions, opportunités, rédaction |
| Liens & local | Backlinks, citations, Google Business Profile |
| Rapports | Rapports envoyés, planning, partage |
| Réglages | Google, WordPress, branding, automatisations, suppression |

Les outils ne s'affichent plus en bloc de 40 : chaque onglet propose les 3 à
5 outils utiles à cette étape.

### 3.3 Tableau de bord = portefeuille
- Bascule **cartes / liste** des clients : logo, score, tendance (mini
  courbe), étape du circuit, tâches ouvertes, dernier audit.
- Graphiques : répartition des scores, tâches terminées par semaine, audits
  du mois.
- Bloc « À faire aujourd'hui » : 5 actions maximum, toutes clients confondus.

### 3.4 Tâches
- **Une tâche par problème et par client**, avec la liste des URL concernées
  en sous-cases (« Raccourcir 13 titres trop longs — 0/13 »).
- Regroupement par client, puis par étape du circuit ; filtres et kanban
  conservés.
- Échéances calculées à partir de la date de l'audit + délai réaliste, jamais
  en retard à la création.
- Barre d'avancement par client et graphique hebdomadaire.
- Textes en français, générés dans la langue de l'utilisateur.

### 3.5 Corrections ponctuelles
- Audit injoignable : afficher « Audit échoué — site injoignable » et le
  diagnostic, pas 0/100.
- Traduire Prospects, Audit instantané, prochaines actions et constats.

## 4. Ordre de réalisation proposé

| Lot | Contenu | Taille |
|---|---|---|
| 0 | **Recette fonctionnelle** : ouvrir chaque page du cœur et de chaque module en prod, noter ce qui marche, ce qui est vide, ce qui casse, ce qui demande une clé | Moyenne |
| 1 | Registre des modules (un seul fichier, relié au catalogue de prestations et à `tool-readiness`) + Réglages → Modules + barre latérale à 8 entrées | Grande |
| 2 | Fiche client en onglets + frise du circuit + onglets selon les prestations vendues | Grande |
| 3 | Tâches regroupées, échéances, avancement, français | Moyenne |
| 4 | Tableau de bord portefeuille + Clients cartes/liste + Audits globale + graphiques | Moyenne |
| 5 | Encart « à configurer » sur toutes les pages de module, audit échoué ≠ 0/100, traductions restantes | Moyenne |

Chaque lot = une PR, vérifiée (typecheck, lint, tests, build) avant fusion.
