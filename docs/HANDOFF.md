# Handoff : rank_forge (SEO-Tool), 24 octobre 2026

Point de reprise pour continuer en local (Omarchy). Ce document décrit l'état de `main`, ce que chaque chantier a livré, ce qui reste ouvert et comment relancer l'app.

## 1. Démarrer en local

```bash
git clone https://github.com/samiriggui-code/All-In-One-Free-SEO-Tool.git
cd All-In-One-Free-SEO-Tool
corepack enable              # pnpm 10 (packageManager dans package.json)
pnpm install
cp .env.example .env         # puis renseigner SEO_SESSION_SECRET (32+ caractères)
pnpm dev                     # lance les migrations puis Next sur :3000
```

- Node 20.11 ou plus récent. La base est SQLite (better-sqlite3), dans `./data` par défaut (`SEO_DATA_DIR` / `SEO_DB_PATH` pour la déplacer).
- Le premier compte créé sur `/register` devient le propriétaire. Dès qu'un compte existe, l'app exige une connexion.
- Vérifications avant de pousser : `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
  - Le test `article-export` échoue parfois selon l'heure (instable, déjà sur main) et passe s'il est relancé seul.
- Production : VPS de samir 187.77.166.124, `/opt/gsms-seo-tool` (seo.global-it-ss.com). Redéploiement :
  `cd /opt/gsms-seo-tool && git pull origin main && docker compose up -d --build`
- Règle : nd-prestige (VPS client 2.24.44.215) est le site d'exemple pour les tests. **Ne jamais modifier le site en ligne du client.**

## 2. État de `main`

Toutes les PR ci-dessous sont fusionnées. Il n'y a pas de migration nouvelle depuis `0079_service_offers.sql`.

| PR | Contenu |
|---|---|
| #19, #20 | Un seul audit (moteur maison de 373 règles, façon SEOmator), rôles appliqués aux réglages et routes admin |
| #21 à #25 | BlogPilot intégré nativement : studio de rédaction `/content`, diffusion (WordPress, exports CMS, social, newsletter), outils (arbre de questions, couverture de sujet, rafraîchissement de page, llms.txt) |
| #23 | Barre latérale réorganisée selon le flux d'une agence SEO (11 sections). Ne jamais retirer d'outil, seulement réordonner |
| #26 | Authentification : pages de connexion brandées, session révoquée = déconnecté, permissions par rôle, tiroir mobile à gauche |
| #27 | Docs : le bouton Aide ouvre les guides intégrés, guides en français |
| #28 | Devis : catalogue de prestations, volume de travail par gravité, taux horaire ou forfait, facture depuis le devis |
| #29, #32 | Portail client « boutique » `/portal/[token]` : devis en ligne, options recalculées en direct, explications IA, acceptation, livrables PDF |
| #30 | Landing publique `/accueil` avant la connexion, nom de produit `<rank_forge/>` |
| #31 | Sécurité de toutes les actions serveur + interface en français (voir §3) |
| #34 | Aperçu d'audit : 404 si l'accès est refusé, ancien bloc de score traduit |
| #33 | Le bleu rank_forge partout : logo `<rf/>`, thème et langue sur les pages de connexion (voir §5) |

## 3. Chantier « Authentification, rôles, sécurité, traduction »

**Sécurité (PR #31)**
- Chaque action serveur (447 actions) commence par `await requireSignedIn()` (`src/lib/action-guard.ts`).
  - Le test `src/lib/action-guard.test.ts` analyse le code (AST TypeScript) et échoue si une action, même inline `"use server"`, n'a pas ce contrôle.
  - **Toute nouvelle action doit l'appeler.**
- Exceptions publiques volontaires :
  - `src/app/embed/grader/actions.ts`, `src/app/portal/[token]/chat-actions.ts` et `quote-actions.ts` : protégés par le jeton de partage.
  - Les lectures du layout (`getUiMode`, `getThemePreference`, `getLocalePreference`, `getConnectionMode`, `getAiConnectionStatus`) : les deux dernières renvoient une valeur neutre si personne n'est connecté.
- Rôles :
  - `requireEditor()` pour toute écriture ;
  - `requireSettingsAdmin()` / `assertOwner()` pour ce qui est réservé au propriétaire ;
  - `requireClientAccess(clientId, { edit })` pour toute action sur un client ;
  - `visibleClientIds(user)` pour filtrer les listes (null = tout voir).
- SSRF : tout appel vers une URL fournie par l'utilisateur passe par `guardedFetch` (`src/lib/url-guard.ts`), y compris le pont WordPress. `SEO_ALLOW_PRIVATE_WP_ENDPOINT=1` autorise un WordPress sur le réseau local.
- `accountsEnabled()` échoue fermé : seule l'absence de la table `users` est traitée comme « pas de comptes ».

**Traduction (next-intl, fr par défaut, en)**
- Les textes courts vont dans `messages/fr.json` et `messages/en.json`, avec les deux langues à chaque fois. Les longs textes sont dans des fichiers parallèles en/fr choisis par `getLocale()` (`docs-guides.ts` / `.fr.ts`, `learn/content.ts`, `knowledge-en.tsx` / `knowledge-fr.tsx`).
- Déjà traduit :
  - le shell : barre latérale, barre du haut, menu utilisateur, notifications (textes serveur compris), recherche, ajout rapide de client, invite de démarrage ;
  - le tableau de bord, la fiche client et ses panneaux, le formulaire « Nouveau client » et l'assistant Google ;
  - Apprendre, le Centre de connaissances (top-sites compris), l'équipe, et le guide « Équipe » dans les docs.
- Reste en anglais : les pages audits, rapports et outils (~93 outils), plus le widget de don de l'auteur d'origine (`maintainer-credit.tsx`), à traduire ou à retirer selon le choix de samir.
- Nom du produit dans l'interface : `rank_forge`.

## 4. Chantier « Devis, catalogue et portail client »

Tout est fusionné (#28, #29, #32), et rien n'est ouvert.
- `/portal/[token]` est public : le jeton de partage est la seule clé. Chaque action vérifie le jeton, puis que la ligne appartient au client.
- Une proposition n'apparaît dans le portail que si son statut est « sent ».
- L'acceptation est repricée côté serveur (`acceptQuote`), passe la proposition en « accepted », puis lance `materialisePlan`.
- `src/lib/quote-cart.ts` est pur : il tourne dans le navigateur et une seconde fois sur le serveur. Seule la sélection est envoyée, jamais un montant.
- Les factures sont traduites FR/EN, et le PDF de facture est partagé dans `src/lib/invoice-pdf.ts` (paginé).
- Reste à faire : « SEO tool » est encore le nom affiché dans `portal.footer`, `footerDefault` et le PDF de facture. À passer en rank_forge.

## 5. Chantier « Landing et identité visuelle »

Tout est fusionné : #30 (landing `/accueil`, e28e792) et #33 (le bleu rank_forge partout, 60df920).
- Pages de connexion :
  - `AuthCard` affiche le logo `<rf/>` (`ProductMark`) sauf si une icône est passée ;
  - un bouton clair/sombre côté client (clé localStorage `rf-auth-theme`, script inline dans `src/components/auth/auth-theme-script.ts`) ;
  - un bouton FR/EN (`src/components/locale-toggle.tsx`, cookie `NEXT_LOCALE`).
- L'en-tête de la barre latérale affiche `ProductMark` + `ProductWordmark`. `nav.appName` et `auth.appName` valent « rank_forge ».
- `globals.css` redéfinit les gammes Tailwind violet/purple/fuchsia/indigo en bleu/cyan, ce qui couvre environ 250 fichiers sans les modifier. Les couleurs des graphiques ne changent pas.
- L'accent par défaut passe de `#7c3aed` à `#0b7fae` (dans `brand.ts`, `themeColor` du layout, manifest, og-image, global-error). favicon et icônes PWA reprennent la marque `<rf/>`.
- Constantes de marque : `src/components/brand/product-logo.tsx` (`PRODUCT_NAME`, `BRAND_GRADIENT`, `INK`).
- Pièges :
  - les actions serveur sont bloquées sur les pages publiques, donc tout réglage hors connexion (thème, langue) reste côté client ;
  - en cas de conflit sur `nav.appName` dans `messages/*.json`, garder « rank_forge ».
- Reste à faire (facultatif) : le nom dans le `<title>` des pages, le nom du manifest et le repli « SEO Tool » de `displayName()` dans `brand.ts`.

## 6. Chantier « Audit et rapport façon SEOmator »

Tout est fusionné, et rien n'est ouvert.
- #20 (a613968) :
  - les rôles sont appliqués aux pages, actions et routes admin des réglages (`guardOwnerRequest`, `guardClientRequest`) ;
  - le rapport d'audit est présenté comme celui de SEOmator : bandeau avec l'og:image ou la capture du site, logo du site (`PageSnapshot.logo`, apple-touch-icon d'abord), anneaux de score, métriques clés, problèmes à corriger d'abord, colonne latérale sur ordinateur, onglets collants sur mobile ;
  - modèle de vue dans `src/lib/engine-report.ts`, interface dans `src/components/audits/engine-report.tsx` et `report-layout.tsx`.
- #34 (c996a3b) : la route d'aperçu renvoie 404 si l'accès est refusé, et l'ancien bloc de score est traduit.
- Pas encore construit : les tableaux élément / valeur / problème par constat, et les scores Lighthouse de SEOmator.
- Les audits lancés avant #20 n'ont pas de logo enregistré. Relancer un audit (par exemple nd-prestige) après le redéploiement.
- Comparaison : l'outil gratuit de SEOmator donne 90 à nd-prestige (172 contrôles sur une page + Lighthouse), et le nôtre 95.
- Pièges :
  - le dépôt n'a pas de config prettier, et `prettier --write` reformate des fichiers entiers : ne pas le lancer ;
  - nd-prestige.com est bloqué depuis les bacs à sable cloud, mais Firecrawl y accède, en lecture seule.

## 7. Branches

- `main` est la seule référence. Les branches `claude/project-thread-*` sont celles des chantiers. Fusionnées, elles peuvent être supprimées.
- Les branches `cursor/*`, `feature/global-rank-auth-landing` et `feature/seomator-audit-engine` viennent de Cursor (abandonné le 24/10). Ne pas les réutiliser.

## 8. Prochaines étapes proposées

1. Traduire les audits, les rapports et les pages d'outils.
2. Passer « SEO tool » en rank_forge dans le portail, le PDF de facture, le `<title>`, le manifest et `displayName()`.
3. Rapport d'audit : tableaux par constat et scores Lighthouse comme SEOmator.
4. Restreindre les notifications aux clients visibles par un membre (aujourd'hui elles listent les audits de tous les clients).
