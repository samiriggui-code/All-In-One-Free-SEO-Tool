# Handoff : rank_forge (SEO-Tool), 11 novembre 2026

Point de reprise après la journée du 11 novembre (travail fait sur le PC fixe Omarchy, à poursuivre sur le portable). Le handoff du 24 octobre est conservé plus bas : ses sections 3 à 7 restent valables.

Dépôt : `https://github.com/samiriggui-code/All-In-One-Free-SEO-Tool` (le fork de samir). **Ne jamais ouvrir de PR sur `IamRamgarhia/All-In-One-Free-SEO-Tool`** (le projet d'origine) : GitHub le propose par défaut, c'est l'erreur de la PR #45 du 22 octobre.

## A. Reprendre sur le portable

```bash
git clone https://github.com/samiriggui-code/All-In-One-Free-SEO-Tool.git   # ou git pull
cd All-In-One-Free-SEO-Tool
git switch feat/clients-projets-liste      # le lot en cours, voir §D
corepack enable && pnpm install
cp .env.example .env                        # renseigner SEO_SESSION_SECRET
pnpm dev                                    # migrations puis Next sur :3000
```

- La base (`data.db`) est locale et n'est pas dans git : le portable repart d'une base vide, sauf à copier `data.db` depuis le PC fixe. Les migrations s'appliquent seules au démarrage (jusqu'à `0080`).
- Sur le PC fixe, une sauvegarde d'avant la migration 0080 existe : `data.db.bak-avant-0080`.
- Vérifications avant de pousser : `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. État au 11/11 : 1 403 tests passent.
- Une clé `ANTHROPIC_API_KEY` invalide dans le terminal fait échouer les appels IA (401). Lancer avec `env -u ANTHROPIC_API_KEY pnpm dev`, ou coller une clé valide dans Paramètres → Connexion IA.

## B. Ce qui a été fusionné sur `main` le 11 novembre

| PR | Contenu |
|---|---|
| #39 | Next.js 16.4.6 et dépendances vulnérables mises à jour (149 alertes → 4), lint, Docker, tests navigateur |
| #40 | Mode clair lisible (teintes 200-400 foncées en clair, `light-white-alpha.css` généré par `scripts/gen-light-white-alpha.mjs`), menu en une couleur. Bouton « Update now » : vérifie le fork, `main` seulement, plus de `git clean` ni de `reset --hard` |
| #41 | **Paramètres en fenêtre façon GsKnora** (voir §C), un seul menu de compte dans l'en-tête, une seule couleur d'accent dans toute l'app, rapports PDF dans la langue de l'espace de travail, journal des erreurs, page Google, bouton « Plan d'action » de la fiche client |
| #42 | **Modèle Client → Projet → Mission** en base (migration `0080`), voir §D |
| #43 | **Menu de gauche à 8 entrées** ; les anciennes rubriques sont sur la page Boîte à outils (`/tools`) |
| #44 | **Fiche projet en onglets** (Vue d'ensemble, Missions, Réglages du projet) avec création de mission |

Hors code : la PR #45 ouverte par erreur chez l'auteur d'origine est fermée, et l'issue #59 lui propose nos améliorations (mise à jour Next, moteur 373 règles, navigation). Sans réponse au 11/11. Il s'était dit intéressé par deux PR séparées : la landing publique sans marque, et les traductions françaises seules.

## C. Règles d'interface décidées avec samir

Le modèle est **GsKnora** (`~/Projects/gsms-template`, `frontend/src/components/SettingsModalShell.vue`, `settings/SettingDrawer.vue`, `views/settings/*.vue`). À respecter pour tout nouvel écran :

1. **On consulte dans la page ou la fenêtre, on modifie dans un panneau latéral** (« sheet »). Jamais de formulaire long directement dans la fenêtre Paramètres. Les préférences simples (liste, interrupteur) peuvent rester en ligne.
   - Composants : `src/app/settings/gsk-sheet.tsx` (`GskSheet`, `ValueRow`, `SheetField`, `SheetSwitch`), styles `src/app/settings/settings-window.css` (classes `gsk-*`, chargées pour toute l'app).
   - Exemples à copier : `brand-form.tsx`, `smtp-form.tsx`, `ai-providers-panel.tsx`, `google/google-connections.tsx`, `errors/error-log.tsx`, `clients/[id]/missions-panel.tsx`.
2. **Sobre** : une seule couleur d'accent (`--primary`). Vert, ambre et rouge uniquement pour un état. Pas de dégradés, pas de halos, pas d'icônes de couleurs différentes. Les gammes Tailwind décoratives sont redirigées vers la marque dans `globals.css`.
3. **Trois types de fenêtre** : page (consulter), panneau latéral (ajouter, modifier, détail), fenêtre centrée (Paramètres et confirmations seulement).
4. **Tout en français**, avec l'anglais à côté (`messages/fr.json` et `en.json` ; tables typées `report-i18n.ts`, `next-actions-i18n.ts` pour les textes à paramètres).
5. Un lien ouvert depuis un client reste dans ce client.

## D. Le chantier en cours : réorganiser l'app autour du client

Constat (détaillé dans `docs/AUDIT-UX.md`, écrit le 24/10 et toujours vrai) : l'app est rangée par outils (241 pages), pas par client.

**Modèle décidé avec samir**

- **Client** = l'entreprise (table `client_accounts`).
- **Projet** = un site du client. C'est la table `clients` existante : rien n'a été re-pointé, les 55 tables liées à `client_id` continuent de désigner le site.
- **Mission** = ce qui est vendu sur un projet (table `missions`) : `audit`, `monitoring` (suivi SEO), `full` (accompagnement complet), `redesign` (refonte, avec la stack demandée), `other`. Global IT SS fait du SEO et du développement : un audit peut déboucher sur une refonte puis un suivi.
- **Règle** : tout projet commence par un audit (rapide puis complet). Aucune mission tant que l'audit complet n'est pas terminé. L'audit suggère la mission : score < 50 ou site injoignable → refonte puis suivi ; score < 80 ou un critique → accompagnement complet ; sinon suivi. Code : `src/lib/missions.ts` (règles pures, testées), `src/lib/projects.ts` (lectures et écritures).
- **Réglages à trois étages** : application (fenêtre Paramètres), client (contact, portail, équipe), projet (Search Console, Analytics, WordPress : onglet « Réglages du projet »).
- **Refonte** : suivi léger pour commencer (devis, étapes, tâches, contrôles SEO avant et après), plus un cahier des charges généré depuis l'audit. Pas de gestion de projet complète.

**Fait** : modèle en base (#42), menu à 8 entrées (#43), fiche projet en onglets avec missions (#44).

**En cours, branche `feat/clients-projets-liste` (poussée, non fusionnée, non vérifiée à l'écran)**

- `/clients` : une carte par client, avec ses projets, leur étape, leur score et leurs missions ; bouton « Ajouter un projet ».
- `/clients/new?account=<id>` : crée un projet dans un client existant.
- Création d'un projet : audit rapide, puis audit complet lancé à la suite en arrière-plan.
- Typage, lint et tests passent. **La vérification dans le navigateur n'a pas pu être faite** à cause de la boucle décrite en §E. À faire avant de fusionner : ouvrir `/clients`, `/clients/new?account=1`, créer un projet de test et vérifier les deux audits.

**Reste à faire, dans l'ordre**

1. Vérifier et fusionner `feat/clients-projets-liste`.
2. Fiche projet : remplacer la colonne des 40 outils par 3 à 5 outils utiles selon l'onglet et les missions ; n'afficher que ce qui correspond aux missions du projet.
3. Réglages du projet : les passer en « valeurs + panneau latéral » (Google, WordPress, envoi des rapports), comme les Paramètres.
4. Page du client (l'entreprise) : contact, facturation, portail, liste des projets.
5. Rattacher les 28 pages `/x/c/[clientId]` (audits, mots-clés, contenu, liens…) à des onglets du projet.
6. Tâches : une tâche par problème et par projet, avec les adresses en sous-cases (aujourd'hui 60 tâches pour ND Prestige) ; échéances réalistes.
7. Tableau de bord portefeuille ; vues globales Audits et Rapports.
8. Retirer le bouton Guidé/Pro de l'en-tête (il ne filtre plus le menu).
9. Mission « refonte » : cahier des charges généré depuis l'audit.

## E. Problèmes ouverts

- **Boucle de rechargement en mode développement.** `pnpm dev` (Next 16.4.6, Turbopack) envoie par moments `{"type":"reloadPage","data":"HMR hash mismatch"}` en continu : toutes les pages se rechargent en boucle. Observé trois fois le 11/11, y compris sur `main` et avec un seul onglet neuf ; à d'autres moments le même code ne boucle pas. Cause non identifiée (aucun fichier ne change sur le disque pendant la boucle). La version de production n'est pas touchée : pour utiliser l'app, faire `pnpm build` puis `pnpm exec next start -p 3000`. Pistes non explorées : vider `.next/dev`, désactiver Turbopack, version de Next.
- **Deux liens morts** : « Build from scratch » dans `/automations` (`/automations/new` n'existe pas) et l'outil « content attack brief » du panneau d'outils (`client-tools-launcher.tsx`, `/tools/content-attack-brief`).
- **Erreur réelle depuis le 22/10** dans le journal : « Functions cannot be passed directly to Client Components » sur `/audits/c/[clientId]` et `/keywords/c/[clientId]`.
- **Tests navigateur (Playwright)** : pas relancés depuis le menu à 8 entrées ; ceux qui décrivent l'ancienne barre latérale sont à ajuster.
- **Encore en anglais** : les noms et messages des 373 règles d'audit (visibles dans les rapports PDF et les recommandations), les étapes des fournisseurs IA (`api-providers.ts`), les sous-pages Sauvegarde, Santé, Edge, Équipe, Consommation IA, Apprentissage IA, Installer l'application, et les blocs de l'onglet « Réglages du projet ».
- **Rapport PDF** : une même règle est répétée une fois par page touchée (75 fois « Canonical Pointing to Homepage ») ; à regrouper en une ligne par règle avec le nombre de pages.
- **API et webhooks** (Paramètres) : la création de clés ne passe pas encore par un panneau latéral.
- **PostgreSQL** : la migration 0080 n'a été jouée que sur SQLite.

---

# Handoff précédent : 24 octobre 2026

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
