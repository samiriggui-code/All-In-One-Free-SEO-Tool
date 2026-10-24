import Link from "next/link";
import {
  BookOpen,
  Building,
  Compass,
  FileText,
  Gauge,
  Globe,
  Layers,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { CourseList, Section, type CourseLink } from "./knowledge-en";

/**
 * The knowledge hub in French. Same sections, same anchors and the same
 * links as knowledge-en.tsx; keep the two in step when one changes.
 */
export function KnowledgeFr() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Centre de connaissances SEO"
        description="Les règles qui se cumulent. Ce que Google récompense vraiment en 2026, la façon dont les sites les mieux classés (Backlinko, Yoast, le blog d'Ahrefs, RankMath) gagnent les résultats, et le plan d'action à appliquer sur vos sites ou ceux de vos clients : par technologie, par surface, par objectif."
        icon={Compass}
        accent="violet"
      />

      <Toc />

      <section className="glass-apple rounded-2xl p-5 space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span>📖</span> Méthodes décortiquées
        </h3>
        <p className="text-xs text-muted-foreground">
          Comment les sites SEO les mieux classés (Backlinko, RankMath, Search Engine Journal) gagnent réellement.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href="/knowledge/top-sites"
            className="rounded-md bg-violet-500/15 px-3 py-1.5 text-violet-300 ring-1 ring-inset ring-violet-500/30 hover:bg-violet-500/25"
          >
            Pourquoi Backlinko, RankMath et SEJ sont n°1 : la checklist
          </a>
          <Link
            href="/docs"
            className="rounded-md bg-emerald-500/15 px-3 py-1.5 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25"
          >
            Appliquer tout ça avec l&apos;outil : les guides pas à pas
          </Link>
        </div>
      </section>

      <FreeCourses />
      <RankingSignals />
      <TopicalAuthority />
      <WhyBlog />
      <BloggingRules />
      <DailyRhythm />
      <PageSpeedByStack />
      <Lcp />
      <GbpDeepDive />
      <KnowledgeGraph />
      <RichSnippets />
      <Eeat />
    </div>
  );
}

function Toc() {
  const items = [
    {
      id: "free-courses",
      label: "Formations gratuites et certifications (Google, HubSpot, Semrush…)",
    },
    { id: "ranking-signals", label: "Les signaux de classement qui comptent vraiment" },
    { id: "topical-authority", label: "L'autorité thématique : comment gagnent les meilleurs sites" },
    { id: "why-blog", label: "Pourquoi un site professionnel a besoin d'un blog" },
    { id: "blogging-rules", label: "Les règles du blog pour un site professionnel" },
    { id: "daily-rhythm", label: "Rythme de publication : site + fiche Google" },
    { id: "page-speed", label: "Vitesse de chargement selon la technologie" },
    { id: "lcp", label: "Améliorer le LCP et le score PageSpeed" },
    { id: "gbp", label: "Fiche d'établissement Google : le plan complet" },
    { id: "knowledge-graph", label: "Knowledge Graph et SEO des entités" },
    { id: "rich-snippets", label: "Résultats enrichis : ce qui marche" },
    { id: "eeat", label: "L'E-E-A-T en pratique" },
  ];
  return (
    <nav className="glass-apple rounded-2xl p-5">
      <h2 className="text-sm font-semibold">Dans ce guide</h2>
      <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        {items.map((i, idx) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="text-violet-300 hover:underline">
              {idx + 1}. {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function RankingSignals() {
  return (
    <Section id="ranking-signals" icon={Target} title="Les signaux de classement qui comptent vraiment" accent="violet">
      <p>
        Google utilise plus de 200 signaux, mais une petite partie explique
        presque tous les mouvements. Arrêtez d&apos;optimiser pour la longue
        traîne des légendes et concentrez-vous sur ceux-ci :
      </p>
      <h3>Les signaux dominants (2026)</h3>
      <ul>
        <li>
          <strong>Un contenu utile, écrit pour les gens</strong> : le système
          « Helpful Content » fait désormais partie du cœur de l&apos;algorithme.
          Un site avec une forte proportion de pages au ton d&apos;IA générique
          est freiné dans son ensemble. Auditez la proportion, pas seulement
          les pages une par une.
        </li>
        <li>
          <strong>La qualité et la quantité des liens entrants pertinents</strong> :
          des liens venant de sources reconnues et proches de votre sujet. Un
          lien du Monde vaut plus que 100 liens de blogs au hasard.
        </li>
        <li>
          <strong>Les signaux E-E-A-T</strong> : l&apos;expérience d&apos;abord
          (l&apos;usage réel), puis l&apos;expertise, l&apos;autorité et la
          fiabilité. Essentiel pour les requêtes YMYL (santé, finance, droit).
        </li>
        <li>
          <strong>La correspondance avec l&apos;intention de recherche</strong> :
          votre page répond-elle dans le format attendu (liste, tutoriel,
          comparatif, définition) ? Un décalage perd à chaque fois, aussi bon
          que soit le contenu.
        </li>
        <li>
          <strong>L&apos;autorité thématique</strong> : à quel point votre site
          couvre l&apos;ensemble du sujet, pas seulement une page.
        </li>
        <li>
          <strong>L&apos;expérience de page</strong> : Core Web Vitals (LCP,
          INP, CLS), compatibilité mobile, HTTPS, pas d&apos;interstitiels
          intrusifs.
        </li>
        <li>
          <strong>La fraîcheur</strong> : pour les requêtes qui l&apos;exigent
          (actualité, comparatifs, « meilleur X »). La date de mise à jour
          compte.
        </li>
        <li>
          <strong>Le maillage interne et la structure du site</strong> :
          hiérarchie claire, ancres descriptives, aucune page orpheline.
        </li>
        <li>
          <strong>Les données structurées</strong> : l&apos;éligibilité aux
          résultats enrichis (FAQ, tutoriel, article, produit, recette…).
        </li>
      </ul>
      <h3>Ce qui ne compte presque pas (ou relève de la légende)</h3>
      <ul>
        <li>La densité de mots-clés ou un réglage TF-IDF au pourcentage près</li>
        <li>Le mot-clé exact dans l&apos;URL</li>
        <li>La balise meta keywords</li>
        <li>Le nombre de mots en soi (sans profondeur)</li>
        <li>La règle « un seul H1 »</li>
        <li>L&apos;âge du domaine</li>
        <li>Le taux de rebond (Google a confirmé ne pas l&apos;utiliser directement)</li>
      </ul>
    </Section>
  );
}

function TopicalAuthority() {
  return (
    <Section id="topical-authority" icon={Layers} title="L'autorité thématique : comment gagnent les meilleurs sites" accent="cyan">
      <p>
        L&apos;autorité thématique explique pourquoi Backlinko se classe sur
        presque toutes les requêtes SEO, Yoast sur tout le SEO WordPress et
        Doctissimo sur chaque symptôme. Ils ont couvert leur sujet si
        complètement que Google leur fait confiance comme source de
        référence.
      </p>
      <h3>Le modèle pilier et satellites</h3>
      <ul>
        <li>
          <strong>Page pilier</strong> : le guide de référence sur le sujet
          large (par exemple « Netlinking »). 3 000 à 8 000 mots, avec un lien
          vers chaque page satellite ; c&apos;est elle qui se classe sur la
          requête principale.
        </li>
        <li>
          <strong>Pages satellites</strong> : chacune traite un sous-sujet
          précis (liens cassés, réponses aux journalistes, relations presse,
          articles invités). 800 à 2 500 mots chacune. Chaque satellite
          renvoie vers le pilier et vers les satellites voisins.
        </li>
        <li>
          <strong>Objectif de couverture</strong> : pour revendiquer
          l&apos;autorité sur un cocon, prévoyez 15 à 30 pages par grand
          sujet. Le pilier seul ne suffit pas.
        </li>
      </ul>
      <h3>Planifier un cocon (à la manière de Backlinko ou d&apos;Ahrefs)</h3>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>Choisissez le sujet principal. Trouvez son sujet parent (plus large) et ses sujets voisins.</li>
        <li>
          Exploitez les « Autres questions posées », Reddit, les forums et les
          commentaires YouTube pour trouver les vraies questions. Chacune
          devient un satellite potentiel.
        </li>
        <li>
          Analysez la page de résultats : qu&apos;est-ce qui se classe ? Si
          les listes dominent le top 3, votre satellite sera une liste. Ne
          luttez pas contre l&apos;intention.
        </li>
        <li>
          Construisez le cocon d&apos;un seul bloc, sur 4 à 8 semaines. Un
          cocon à moitié construit sous-performe : le maillage interne ne
          joue qu&apos;une fois le cocon dense.
        </li>
        <li>
          Maillez le cocon : pilier vers tous les satellites, satellites vers
          le pilier, et satellites entre eux quand c&apos;est pertinent.
          Utilisez des ancres descriptives, pas « cliquez ici ».
        </li>
        <li>
          Mettez le pilier à jour tous les 60 à 90 jours. Revoyez les liens
          internes si vous changez la navigation. Google récompense les
          cocons visiblement entretenus.
        </li>
      </ol>
      <h3>Pourquoi « un article par semaine pour toujours » échoue</h3>
      <p>
        Des articles isolés sur des sujets sans lien ne se cumulent jamais.
        Publier 30 articles au hasard rapporte moins que 30 articles dans un
        cocon bien ciblé : le second débloque un gain d&apos;autorité
        thématique que le premier n&apos;obtient jamais.
      </p>
    </Section>
  );
}

function WhyBlog() {
  return (
    <Section id="why-blog" icon={FileText} title="Pourquoi un site professionnel a besoin d'un blog" accent="emerald">
      <p>
        « Nous n&apos;avons pas besoin de blog, nous sommes une entreprise
        sérieuse » vous prive de trafic organique pour toujours. La raison
        est mécanique, pas du marketing :
      </p>
      <ul>
        <li>
          <strong>La plupart des requêtes informationnelles ne correspondent
          à aucune page produit ou service.</strong> Sans blog, vous ne pouvez
          pas vous classer sur les 90 % de recherches qui commencent par
          « comment », « quoi », « pourquoi », « meilleur », « vs ». Vos
          concurrents qui bloguent les prendront toutes.
        </li>
        <li>
          <strong>Les liens internes vers vos pages commerciales dépendent du
          blog.</strong>{" "}
          Sans articles pour les porter, vos pages qui rapportent reçoivent
          peu d&apos;autorité de l&apos;intérieur du site.
        </li>
        <li>
          <strong>L&apos;autorité thématique demande de l&apos;ampleur.</strong>{" "}
          Un site vitrine de 6 pages ne peut pas démontrer d&apos;autorité. Un
          site de 60 pages avec un cocon serré autour de votre métier, si.
        </li>
        <li>
          <strong>Ce qui attire les liens vit dans le blog, pas dans les pages
          produit.</strong>{" "}
          On fait des liens vers des études, des recherches originales, des
          « guides complets », pas vers votre page /tarifs.
        </li>
        <li>
          <strong>Les signaux de confiance.</strong> Un blog avec des auteurs
          signés, des dates et des sources est la façon la moins chère de
          démontrer l&apos;E-E-A-T.
        </li>
        <li>
          <strong>L&apos;éligibilité au Knowledge Graph.</strong> Votre page
          « À propos » et une présence d&apos;auteurs cohérente sur le blog
          sont ce qui vous fait entrer dans le graphe d&apos;entités de Google.
        </li>
      </ul>
    </Section>
  );
}

function BloggingRules() {
  return (
    <Section id="blogging-rules" icon={BookOpen} title="Les règles du blog pour un site professionnel" accent="emerald">
      <h3>Les 12 règles, celles que suivent les meilleurs blogs SEO</h3>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <strong>Un sujet par article.</strong> Si un article a besoin de 3
          sections H2 sur des sujets sans rapport, faites-en 3 articles.
        </li>
        <li>
          <strong>Alignez-vous sur l&apos;intention avant d&apos;écrire.</strong>{" "}
          Regardez le top 5. Si ce ne sont que des listes, écrivez une liste.
          Un mauvais format perd dans 100 % des cas.
        </li>
        <li>
          <strong>Commencez par la réponse, pas par le préambule.</strong> Les
          100 premiers mots doivent donner au visiteur une raison de rester.
        </li>
        <li>
          <strong>Un auteur. Une vraie bio. Une vraie signature.</strong>{" "}
          « Publié par Admin » supprime entièrement le signal E-E-A-T.
        </li>
        <li>
          <strong>Date de publication ET date de mise à jour.</strong> Visibles
          par le lecteur et présentes dans les données structurées. Mettez à
          jour les anciens articles et la date quand le contenu change
          vraiment.
        </li>
        <li>
          <strong>Des sources externes reconnues.</strong> Au moins 3 par
          article. Ne craignez pas de « perdre du jus » : Google récompense
          les contenus bien sourcés.
        </li>
        <li>
          <strong>3 à 5 liens internes par article.</strong> Ancres
          descriptives. Maillez anciens et nouveaux articles dans les deux
          sens.
        </li>
        <li>
          <strong>Des images, graphiques et captures originaux.</strong> Les
          photos de banque d&apos;images n&apos;apportent rien. Un schéma
          maison ou une capture annotée gagne des liens et du trafic image.
        </li>
        <li>
          <strong>Des données structurées fidèles au contenu.</strong> Article
          + Auteur pour les articles. FAQ seulement pour de vraies questions
          et réponses. HowTo pour un vrai pas-à-pas. Ne trichez pas.
        </li>
        <li>
          <strong>Au moins une section au format extrait optimisé.</strong>{" "}
          Un H2 formulé comme la question, puis un paragraphe de 40 à 60 mots
          qui y répond directement. Décroche l&apos;extrait environ une fois
          sur trois.
        </li>
        <li>
          <strong>Mettez à jour avant de publier du neuf.</strong> Un article
          de 12 mois remis à jour bat souvent un nouvel article. Rafraîchissez
          d&apos;abord ceux qui s&apos;érodent.
        </li>
        <li>
          <strong>Un seul appel à l&apos;action par article.</strong> Soit
          collecter un e-mail, soit renvoyer vers une page de service, soit
          mettre en avant un outil. Trois appels = zéro conversion.
        </li>
      </ol>
      <h3>Longueur : une direction, pas un objectif</h3>
      <ul>
        <li>Tutoriel / comment faire : 1 200 à 2 200 mots</li>
        <li>Liste (top 10, meilleurs X) : 1 800 à 3 500 mots</li>
        <li>Guide complet (pilier) : 3 000 à 8 000 mots</li>
        <li>Comparatif (X vs Y) : 1 500 à 2 500 mots</li>
        <li>Définition / réponse rapide : 400 à 900 mots</li>
        <li>Étude de cas / étude de données : 1 500 à 3 000 mots + un graphique</li>
      </ul>
    </Section>
  );
}

function DailyRhythm() {
  return (
    <Section id="daily-rhythm" icon={TrendingUp} title="Rythme de publication : site + fiche Google" accent="amber">
      <h3>Une semaine type (tenable pour une équipe de 1 ou 2 personnes)</h3>
      <ul>
        <li>
          <strong>Lundi</strong> : publier 1 nouvel article ou en rafraîchir 1 ancien
        </li>
        <li>
          <strong>Mardi</strong> : maillage interne de l&apos;article de la
          semaine passée + 5 liens contextuels depuis d&apos;anciens articles
        </li>
        <li>
          <strong>Mercredi</strong> : 1 post sur la fiche Google (offre,
          événement, actualité, produit, histoire : alternez les types)
        </li>
        <li>
          <strong>Jeudi</strong> : prospection et netlinking (réponses aux
          journalistes, propositions de liens cassés)
        </li>
        <li>
          <strong>Vendredi</strong> : revue de la Search Console : une baisse ?
          1 ou 2 corrections rapides sur des mots-clés à portée de main
        </li>
        <li>
          <strong>Chaque jour</strong> : répondre à chaque avis Google sous
          24 h. 5 étoiles : avec le prénom et un détail précis ; 1 à 3
          étoiles : avec empathie et une solution hors ligne.
        </li>
      </ul>
      <h3>Les posts de la fiche Google : ce qui marche</h3>
      <ul>
        <li>
          Au minimum 1 post par semaine, 2 ou 3 si vous pouvez tenir. Les
          posts disparaissent du fil, mais le signal d&apos;activité aide la
          visibilité dans le pack local.
        </li>
        <li>
          L&apos;accroche dans les 12 premiers mots : la fiche coupe ensuite
          sur mobile.
        </li>
        <li>
          1 image (1200×900 ou plus). Un post avec image obtient environ deux
          fois plus de clics qu&apos;un post texte.
        </li>
        <li>
          Toujours un bouton d&apos;action : Réserver, Commander, Appeler, En
          savoir plus, S&apos;inscrire. Adapté à votre activité.
        </li>
        <li>
          Variez les types dans la semaine. Que des offres, ça fait spam ;
          alternez actualités, histoires et produits.
        </li>
      </ul>
      <h3>Pourquoi la régularité compte plus que « l&apos;article parfait »</h3>
      <p>
        Les signaux de fraîcheur de Google et les signaux d&apos;activité de
        la fiche récompensent la cadence. Un site qui publie un article
        correct chaque semaine pendant 2 ans bat un site qui publie un
        article brillant par trimestre.
      </p>
    </Section>
  );
}

function PageSpeedByStack() {
  return (
    <Section id="page-speed" icon={Gauge} title="Vitesse de chargement selon la technologie" accent="cyan">
      <p>
        Les conseils de vitesse génériques ne servent à rien : le goulet
        d&apos;étranglement change d&apos;une technologie à l&apos;autre.
        Voici le plan selon ce que vous utilisez réellement :
      </p>
      <h3>WordPress</h3>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <strong>Une extension de cache</strong> : WP Rocket (payante, la
          meilleure), LiteSpeed Cache (gratuite, nécessite un serveur
          LiteSpeed), W3 Total Cache (gratuite, complexe). Sans cache, chaque
          page est régénérée à chaque visite.
        </li>
        <li>
          <strong>Faire le tri dans les extensions</strong> : chaque extension
          active charge du JS et du CSS. Visez moins de 15. Utilisez Query
          Monitor pour voir celles qui se chargent partout. Remplacez les plus
          lourdes (Elementor → thèmes par blocs) quand c&apos;est possible.
        </li>
        <li>
          <strong>Optimisation des images</strong> : ShortPixel, Smush ou
          EWWW. Conversion en WebP. Chargement différé sous la ligne de
          flottaison.
        </li>
        <li>
          <strong>Cloudflare devant le site</strong> : l&apos;offre gratuite
          réduit la latence partout. Activez Auto Minify, Brotli et Polish
          (avec perte).
        </li>
        <li>
          <strong>L&apos;hébergement compte</strong> : un mutualisé d&apos;entrée
          de gamme vous bloque à un TTFB de 600 ms ou plus. Passez sur Kinsta,
          Cloudways, o2switch ou Hetzner si la vitesse compte.
        </li>
      </ol>
      <h3>Shopify</h3>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <strong>Faire le tri dans les applications</strong> : chaque
          application injecte des scripts. Vérifiez dans Paramètres →
          Applications et supprimez les abandonnées. Chacune ajoute souvent
          200 à 800 ms.
        </li>
        <li>
          <strong>Thème : Dawn ou un thème payant rapide.</strong> Les anciens
          thèmes à sections (Debut) sont lents, tout comme les constructeurs
          de pages (Shogun, PageFly).
        </li>
        <li>
          <strong>Compression des images</strong> : moins de 100 Ko par image
          produit. Shopify sert le WebP automatiquement, gardez simplement des
          fichiers source légers.
        </li>
        <li>
          <strong>Chargement différé en Liquid</strong> : remplacez{" "}
          <code>img_url</code> par <code>image_tag</code> avec{" "}
          <code>loading: &quot;lazy&quot;</code>.
        </li>
        <li>
          <strong>Différer les scripts tiers</strong> : analytics, chat, avis.
          Chargez-les après l&apos;affichage de la page.
        </li>
      </ol>
      <h3>Next.js</h3>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <strong>next/image avec priority</strong> sur l&apos;image LCP.
          Indiquez width et height pour éviter les décalages de mise en page.
        </li>
        <li>
          <strong>next/font</strong> pour héberger vos polices. Supprime la
          requête de police externe qui bloque l&apos;affichage.
        </li>
        <li>
          <strong>next/script avec strategy=&quot;afterInteractive&quot;</strong>{" "}
          pour l&apos;analytics, le chat, GTM.
        </li>
        <li>
          <strong>Imports dynamiques</strong> pour les composants client sous
          la ligne de flottaison. Réduit le bundle initial.
        </li>
        <li>
          <strong>ISR ou rendu statique</strong> pour le contenu qui n&apos;a
          pas besoin de données à la requête. <code>revalidate: 3600</code>{" "}
          sur les articles.
        </li>
        <li>
          <strong>Runtime Edge</strong> pour les parties qui le permettent. Fait
          passer le TTFB d&apos;environ 300 ms à 30 ms dans beaucoup de régions.
        </li>
      </ol>
      <h3>Wix / Squarespace</h3>
      <p>Peu de contrôle. La liste honnête de ce que vous POUVEZ faire :</p>
      <ul>
        <li>Compresser les images avant l&apos;envoi (200 Ko max pour une bannière, 80 Ko pour une galerie)</li>
        <li>Désactiver les applications inutilisées (chacune rallonge le chargement)</li>
        <li>Réduire le code personnalisé dans le &lt;head&gt; : chaque intégration a un coût</li>
        <li>Choisir un modèle rapide : les modèles récents sont souvent 30 à 50 % plus rapides</li>
        <li>
          Être honnête avec le client : Wix ou Squarespace ne battront jamais
          Shopify ou Next.js en vitesse. Misez plutôt sur le contenu et la
          conversion.
        </li>
      </ul>
    </Section>
  );
}

function Lcp() {
  return (
    <Section id="lcp" icon={Zap} title="Améliorer le LCP et le score PageSpeed" accent="amber">
      <p>
        Le LCP (Largest Contentful Paint) est le Core Web Vital qui fait le
        plus souvent bouger le classement, parce que la plupart des sites
        l&apos;échouent sur mobile. Objectif :{" "}
        <strong>moins de 2,5 s</strong> pour 75 % des visiteurs mobiles.
      </p>
      <h3>Les 5 corrections du LCP qui comptent (dans l&apos;ordre)</h3>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <strong>Identifier l&apos;élément LCP</strong> : ouvrez Lighthouse,
          le rapport l&apos;indique. Neuf fois sur dix, c&apos;est l&apos;image
          principale, le bloc de titre ou l&apos;affiche d&apos;une vidéo.
        </li>
        <li>
          <strong>Le précharger</strong> :{" "}
          <code>&lt;link rel=&quot;preload&quot; as=&quot;image&quot; href=&quot;hero.webp&quot; fetchpriority=&quot;high&quot;&gt;</code>
          . Sur Next.js, ajoutez la propriété <code>priority</code> à l&apos;image.
        </li>
        <li>
          <strong>Compresser et servir un format moderne</strong> : WebP ou
          AVIF. Une image principale doit peser moins de 100 Ko, même en
          haute densité.
        </li>
        <li>
          <strong>Supprimer les ressources bloquantes</strong> : différer le
          CSS non critique, charger le JS en async, passer les polices en
          swap ou en font-display:optional.
        </li>
        <li>
          <strong>Réduire le TTFB</strong> : cache, CDN, hébergement plus
          rapide. Au-delà de 600 ms de TTFB, un LCP sous 2,5 s est presque
          impossible.
        </li>
      </ol>
      <h3>Gains rapides sur le score PageSpeed (de 60 à 85+)</h3>
      <ul>
        <li>Redimensionner les images principales à leur taille d&apos;affichage réelle</li>
        <li>Charger en différé toutes les images sous la ligne de flottaison</li>
        <li>Mettre defer ou async sur chaque balise &lt;script&gt;</li>
        <li>Intégrer le CSS critique (au-dessus de la ligne de flottaison) dans le &lt;head&gt;</li>
        <li>Charger l&apos;analytics en <code>afterInteractive</code></li>
        <li>Héberger soi-même les Google Fonts (ou utiliser les polices système)</li>
        <li>Supprimer les widgets tiers bloquants (chat, boutons sociaux)</li>
        <li>
          Ajouter <code>width</code> et <code>height</code> à chaque image
          pour supprimer le CLS
        </li>
      </ul>
      <h3>Selon le serveur ou l&apos;hébergement</h3>
      <ul>
        <li>
          <strong>Apache en mutualisé</strong> : activer mod_pagespeed si
          disponible, gzip + brotli, forcer HTTPS, mod_expires pour les en-têtes
          de cache des fichiers statiques.
        </li>
        <li>
          <strong>Nginx</strong> : fastcgi cache pour WordPress (TTFB vers
          50 ms), gzip + brotli, http2_push pour le CSS critique, proxy_cache
          pour les réponses d&apos;API.
        </li>
        <li>
          <strong>Cloudflare devant n&apos;importe quel site</strong> :
          gratuit, réduit le TTFB partout, Auto Minify + Brotli + Cache
          Reserve. La meilleure optimisation pour l&apos;effort.
        </li>
        <li>
          <strong>Vercel / Netlify</strong> : déjà en périphérie. Le réglage du
          LCP ne dépend plus que du poids des ressources et du chemin de rendu.
        </li>
      </ul>
    </Section>
  );
}

function GbpDeepDive() {
  return (
    <Section id="gbp" icon={Building} title="Fiche d'établissement Google : le plan complet" accent="cyan">
      <p>
        Le classement dans le pack local dépend surtout des signaux de la
        fiche, encore plus que du SEO du site sur les requêtes du type
        « [service] près de moi ».
      </p>
      <h3>Une fiche complète (à faire une fois, et bien)</h3>
      <ul>
        <li>
          Nom de l&apos;établissement : <strong>exactement</strong> celui de
          l&apos;enseigne et du nom légal. Pas de bourrage de mots-clés
          (« Dupont Plomberie - Dépannage 24h/24 ») : Google rétrograde.
        </li>
        <li>
          Catégorie principale : la plus précise possible. Ajoutez 3 à 5
          catégories secondaires.
        </li>
        <li>
          NAP (nom, adresse, téléphone) : identique au site et à chaque
          citation dans les annuaires.
        </li>
        <li>Horaires : jours fériés compris. Mettez-les à jour 7 jours avant une fermeture.</li>
        <li>Zone desservie : seulement si vous ne recevez pas le public à une adresse.</li>
        <li>
          Lien vers le site : vers la page la plus pertinente, pas toujours
          l&apos;accueil. Pour plusieurs établissements, vers la page de
          l&apos;établissement.
        </li>
        <li>Lien de réservation : si vous prenez des rendez-vous. Direct, pas via Réserver avec Google.</li>
        <li>
          Produits / services : ajoutez-les tous. Chacun devient une
          sous-fiche que Google peut indexer.
        </li>
        <li>
          Attributs : accessibilité, moyens de paiement, entreprise dirigée
          par une femme, etc. Ils alimentent les filtres.
        </li>
        <li>
          Photos : au moins 10, variées : extérieur, intérieur, équipe,
          produits, clients (avec leur accord).
        </li>
      </ul>
      <h3>Les avis : le plus gros levier du classement local</h3>
      <ul>
        <li>Objectif : plus de 50 avis, une moyenne de 4,5 ou plus, au moins 1 nouvel avis par semaine dans la durée.</li>
        <li>
          Demandez à chaque client au moment où il est le plus satisfait :
          le jour de la prestation, pas des semaines après.
        </li>
        <li>
          Utilisez un lien court (g.page/r/{"<id>"}) sur les factures, dans
          les signatures d&apos;e-mail, sur l&apos;écran de remerciement
          après achat.
        </li>
        <li>
          Répondez à chaque avis sous 24 h. Oui, même aux 5 étoiles : Google
          lit l&apos;échange.
        </li>
        <li>
          Avis négatifs : empathie et proposition de régler le problème hors
          ligne. Ne jamais polémiquer, ne jamais exposer d&apos;informations
          sur le client.
        </li>
        <li>
          Reprenez naturellement les mots-clés des avis dans vos réponses :
          ils sont indexés pour la fiche.
        </li>
      </ul>
      <h3>Les posts : au minimum chaque semaine</h3>
      <ul>
        <li>1 à 3 posts par semaine. Alternez offres, événements, actualités, produits, histoires.</li>
        <li>Image de 1200×900 minimum. Google pénalise les posts flous.</li>
        <li>L&apos;accroche dans les 12 premiers mots, et toujours un bouton d&apos;action à la fin.</li>
        <li>Un détail local : citez la ville, le quartier ou un lieu connu.</li>
      </ul>
      <h3>Citations et cohérence</h3>
      <ul>
        <li>
          Les plus importantes : Apple Business Connect, Bing Places,
          PagesJaunes, Facebook, Foursquare, Yelp.
        </li>
        <li>
          Les citations de votre secteur comptent plus que 100 annuaires au
          hasard. Un cabinet dentaire sur Doctolib et les annuaires de santé
          bat 50 fiches génériques.
        </li>
        <li>
          Cohérence du NAP jusqu&apos;à la ponctuation : « Bât. A », « Bâtiment
          A » et « Bat A » doivent être unifiés.
        </li>
      </ul>
      <h3>Questions et réponses</h3>
      <p>
        Beaucoup d&apos;entreprises l&apos;ignorent. Publiez vous-même vos
        questions les plus fréquentes avec de bonnes réponses : elles sont
        indexées et parfois reprises dans le panneau d&apos;information.
      </p>
    </Section>
  );
}

function KnowledgeGraph() {
  return (
    <Section id="knowledge-graph" icon={Globe} title="Knowledge Graph et SEO des entités" accent="violet">
      <p>
        Le Knowledge Graph de Google est sa base d&apos;entités (personnes,
        entreprises, lieux, choses). Faire reconnaître votre entreprise, votre
        marque et vos auteurs comme des entités débloque le panneau
        d&apos;information, une meilleure page de résultats sur votre marque
        et davantage de citations dans les AI Overviews et les réponses des
        LLM.
      </p>
      <h3>Obtenir le statut d&apos;entité</h3>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <strong>Une fiche Wikidata</strong> : le signal le moins cher et le
          plus direct. Créez-la avec des références notables (articles de
          presse, livres, citations académiques, site officiel).
        </li>
        <li>
          <strong>Un article Wikipédia</strong> : seulement si vous remplissez
          les critères de notoriété. Ne trichez pas, les administrateurs
          suppriment les pages promotionnelles.
        </li>
        <li>
          <strong>Données structurées Organization / Person avec sameAs</strong> :
          reliez votre page d&apos;accueil à LinkedIn, X, Crunchbase, Wikidata,
          Wikipédia. Google lit sameAs comme une preuve d&apos;identité.
        </li>
        <li>
          <strong>Le même nom partout</strong> : même nom légal, même
          orthographe de marque, même logo sur toutes les plateformes. Les
          incohérences fragmentent l&apos;entité.
        </li>
        <li>
          <strong>Des mentions qui font autorité</strong> : articles de presse,
          podcasts, pages d&apos;intervenants de conférences, profil GitHub.
          Elles construisent l&apos;entité même sans lien.
        </li>
        <li>
          <strong>Une page par auteur</strong> : chaque auteur du blog a une
          page /auteur/{"<slug>"} avec bio, photo, profils sociaux, données
          structurées Person complètes et la liste de ses articles.
        </li>
      </ol>
      <h3>Optimiser la page de résultats sur votre marque</h3>
      <ul>
        <li>Cherchez le nom de votre marque. Cette première page, c&apos;est votre réputation.</li>
        <li>
          Assurez-vous de maîtriser les 5 premiers résultats : accueil,
          catégorie clé, À propos, LinkedIn, X.
        </li>
        <li>
          Les liens annexes (sitelinks) sont générés par Google. Aidez-le avec
          une architecture claire et des titres de page bien distincts.
        </li>
      </ul>
    </Section>
  );
}

function RichSnippets() {
  return (
    <Section id="rich-snippets" icon={Star} title="Résultats enrichis : ce qui marche en 2026" accent="amber">
      <p>
        Après les nettoyages de Google entre 2023 et 2025, beaucoup de types
        de données structurées ne produisent plus de résultat enrichi
        visible. Voici ce qui apparaît réellement aujourd&apos;hui et ce qui
        vaut la peine d&apos;être mis en place :
      </p>
      <h3>Produisent encore des résultats enrichis</h3>
      <ul>
        <li><strong>Article / NewsArticle</strong> : à la une, enrichi de l&apos;auteur et de la date.</li>
        <li>
          <strong>Product</strong> : prix, disponibilité, notes (seulement avec
          de vraies données d&apos;agrégateur d&apos;avis, pas auto-déclarées).
        </li>
        <li><strong>Recipe</strong> : carrousel complet, temps de cuisson, calories, note.</li>
        <li><strong>Event</strong> : date, lieu, billets.</li>
        <li>
          <strong>FAQ</strong> : seulement pour les sites officiels et les
          sites de santé reconnus (retiré pour tous les autres en 2023).
        </li>
        <li><strong>HowTo</strong> : seulement sur ordinateur, seulement pour un vrai pas-à-pas.</li>
        <li><strong>Breadcrumb</strong> : remplace l&apos;URL peu lisible dans le résultat.</li>
        <li><strong>Video</strong> : vignette et durée dans les résultats. Indispensable pour la vidéo.</li>
        <li><strong>LocalBusiness</strong> : horaires, adresse, téléphone dans le panneau d&apos;information.</li>
        <li><strong>Sitelinks Search Box</strong> : seulement pour les sites établis avec une marque forte.</li>
        <li>
          <strong>Review (au niveau de l&apos;organisation)</strong> : pour les
          entreprises de services, étoiles dans les résultats si elles
          viennent d&apos;un agrégateur tiers.
        </li>
      </ul>
      <h3>N&apos;affichent plus de résultat enrichi (à ignorer ou à reléguer)</h3>
      <ul>
        <li>FAQ sur les pages commerciales (retiré)</li>
        <li>HowTo sur mobile (retiré)</li>
        <li>Review auto-déclaré sans source tierce</li>
        <li>JobPosting (fonctionne encore, mais seulement dans Google pour l&apos;emploi)</li>
      </ul>
      <h3>Règles de mise en place</h3>
      <ul>
        <li>
          Les données structurées doivent refléter ce qui est visible sur la
          page. Tricher vaut une action manuelle.
        </li>
        <li>
          Utilisez du JSON-LD dans le &lt;head&gt;. Les microdonnées sont plus
          dures à maintenir et les erreurs sont fréquentes.
        </li>
        <li>
          Validez chaque page dans le test des résultats enrichis de Google
          avant de la considérer comme terminée.
        </li>
        <li>
          Une seule entité canonique par page : pas 5 objets différents qui
          décrivent la même chose.
        </li>
      </ul>
    </Section>
  );
}

function Eeat() {
  return (
    <Section id="eeat" icon={Sparkles} title="L'E-E-A-T en pratique" accent="emerald">
      <p>
        Expérience, Expertise, Autorité, Fiabilité. Essentiel pour les sujets
        YMYL (santé, finance, droit, actualité), important partout ailleurs.
        Ces signaux se voient, ce ne sont pas des impressions. Auditez-les :
      </p>
      <h3>Signaux visibles sur chaque page publiée</h3>
      <ul>
        <li><strong>Signature de l&apos;auteur</strong> avec un lien vers sa page /auteur/{"<slug>"}</li>
        <li>
          <strong>Bio de l&apos;auteur</strong> juste sous la signature ou à
          côté : diplômes, années d&apos;expérience, spécialité
        </li>
        <li><strong>Date de publication ET date de mise à jour</strong> visibles par le lecteur</li>
        <li>
          <strong>Ligne de relecture</strong> pour le YMYL : « Relu par le Dr X,
          [titre] » ou « Vérifié par [éditeur] »
        </li>
        <li>
          <strong>Sources externes</strong> : au moins 3 sources reconnues
          (sites officiels, universités, publications à comité de lecture,
          sources primaires). Avec un lien, pas seulement citées.
        </li>
        <li>
          <strong>Visuels originaux</strong> : votre capture, votre photo,
          votre graphique. Pas de banque d&apos;images.
        </li>
      </ul>
      <h3>Pages de confiance à l&apos;échelle du site</h3>
      <ul>
        <li>À propos : de vraies personnes, de vraies bios, de vraies photos</li>
        <li>Charte éditoriale / méthodologie</li>
        <li>Contact : téléphone, e-mail, adresse physique le cas échéant</li>
        <li>Mentions légales, politique de confidentialité et CGU, en lien dans le pied de page de chaque page</li>
        <li>
          Sources et transparence : déclarez l&apos;affiliation sur un site
          affilié. Pour un contenu assisté par IA, envisagez de le signaler.
        </li>
      </ul>
      <h3>Données structurées</h3>
      <ul>
        <li>Person pour les auteurs, avec des liens sameAs vers leurs profils</li>
        <li>Organization sur la page d&apos;accueil, avec des liens sameAs</li>
        <li>Article avec author, datePublished et dateModified sur chaque article</li>
      </ul>
      <p>
        Lancez l&apos;audit E-E-A-T de l&apos;outil (Outils → Audit E-E-A-T)
        sur n&apos;importe quelle page pour obtenir un score et une liste de
        corrections concrètes.
      </p>
    </Section>
  );
}

const SEO_COURSES: CourseLink[] = [
  {
    title: "Google Search Central : documentation et tutoriels",
    provider: "Google",
    url: "https://developers.google.com/search/docs",
    duration: "À votre rythme",
    cert: "no",
    blurb:
      "La source officielle de Google : documentation sur le classement, consignes de SEO technique, spécification des données structurées. À garder en favori avant tout le reste.",
  },
  {
    title: "Les fondamentaux du marketing numérique",
    provider: "Google (Ateliers Numériques)",
    url: "https://learndigital.withgoogle.com/digitalgarage/course/digital-marketing",
    duration: "~40 heures",
    cert: "yes",
    blurb:
      "Formation certifiante gratuite : bases du SEO, marketing de contenu, analytics, publicité et réseaux sociaux. Reconnue par l'IAB Europe et l'Open University.",
  },
  {
    title: "SEO Certification Course",
    provider: "HubSpot Academy",
    url: "https://academy.hubspot.com/courses/seo-training",
    duration: "~6 heures",
    cert: "yes",
    blurb:
      "Certificat gratuit. Une bonne introduction pour les marketeurs non techniques : recherche de mots-clés, on-page, netlinking, bases du SEO technique.",
  },
  {
    title: "SEO Toolkit Course",
    provider: "Semrush Academy",
    url: "https://www.semrush.com/academy/courses/semrush-seo-toolkit-course/",
    duration: "~3 heures",
    cert: "yes",
    blurb:
      "Certificat Semrush gratuit. Pratique : comment utiliser les outils SEO pour auditer et rechercher, même sans abonnement Semrush.",
  },
  {
    title: "Devenir spécialiste SEO (parcours LinkedIn Learning)",
    provider: "LinkedIn Learning",
    url: "https://www.linkedin.com/learning/paths/become-an-seo-expert",
    duration: "~15 heures",
    cert: "paid",
    blurb:
      "Gratuit avec LinkedIn Premium ou le mois d'essai. Ajoute un badge au profil LinkedIn : utile pour les freelances et les recrues d'agence.",
  },
  {
    title: "Yoast SEO Academy",
    provider: "Yoast",
    url: "https://yoast.com/academy/all-academy-courses/",
    duration: "Variable",
    cert: "paid",
    blurb:
      "Quelques cours gratuits (SEO pour débutants), la plupart payants. Excellent si vous travaillez sur WordPress : fonctionnement de Yoast et SEO technique WordPress.",
  },
  {
    title: "Spécialisation SEO Coursera (UC Davis)",
    provider: "Coursera × UC Davis",
    url: "https://www.coursera.org/specializations/seo",
    duration: "~5 mois",
    cert: "paid",
    blurb:
      "Certificat universitaire, avec une option d'accès gratuit aux cours. Complet mais plus lent : intéressant pour un CV.",
  },
  {
    title: "Blog et chaîne YouTube d'Ahrefs",
    provider: "Ahrefs",
    url: "https://ahrefs.com/blog/",
    duration: "À votre rythme",
    cert: "no",
    blurb:
      "Pas une formation, mais le meilleur contenu SEO gratuit du web : études originales, vraies expériences, zéro remplissage. Le blog et la chaîne YouTube valent n'importe quel programme payant.",
  },
  {
    title: "Moz SEO Learning Center et Whiteboard Friday",
    provider: "Moz",
    url: "https://moz.com/learn/seo",
    duration: "À votre rythme",
    cert: "no",
    blurb:
      "La ressource historique de l'apprentissage du SEO. Les vidéos Whiteboard Friday restent le moyen le plus rapide de comprendre une nouvelle notion.",
  },
];

const ADS_COURSES: CourseLink[] = [
  {
    title: "Google Ads Skillshop (parcours de certification complets)",
    provider: "Google Skillshop",
    url: "https://skillshop.exceedlms.com/student/path/18128-google-ads-certifications",
    duration: "~5 à 10 heures par certification",
    cert: "yes",
    blurb:
      "Les certifications officielles Google Ads : Search, Display, Vidéo, Shopping, Applications, Mesure, campagnes Performance Max. Gratuites, valables 12 mois. Obligatoires pour une agence qui vise le statut Google Partner.",
  },
  {
    title: "Certification Google Analytics 4",
    provider: "Google Skillshop",
    url: "https://skillshop.exceedlms.com/student/path/2938-google-analytics-certification",
    duration: "~4 heures",
    cert: "yes",
    blurb:
      "Certification GA4 officielle et gratuite. Indispensable pour présenter des résultats publicitaires : la plupart des agences n'ont toujours personne qui maîtrise vraiment GA4.",
  },
  {
    title: "Certification Meta Blueprint",
    provider: "Meta",
    url: "https://www.facebook.com/business/learn/certification",
    duration: "Variable selon la certification",
    cert: "paid",
    blurb:
      "Les certifications publicitaires officielles Facebook et Instagram. L'examen est payant (99 à 150 $), mais toute la préparation est gratuite. À viser : Media Buying Professional, Media Planning Professional.",
  },
  {
    title: "Cours gratuits Meta Blueprint",
    provider: "Meta",
    url: "https://www.facebook.com/business/learn",
    duration: "À votre rythme",
    cert: "no",
    blurb:
      "La bibliothèque de cours est entièrement gratuite : Meta ne fait payer que l'examen. Des centaines de modules sur la création d'annonces, le ciblage, le Pixel et l'API Conversions, les campagnes Advantage+.",
  },
  {
    title: "LinkedIn Marketing Labs",
    provider: "LinkedIn",
    url: "https://business.linkedin.com/marketing-solutions/success/learning-center",
    duration: "~5 à 10 heures par certification",
    cert: "yes",
    blurb:
      "Certificats LinkedIn gratuits : stratégie marketing, marketing de contenu, analytics. Le badge « Marketing Strategy Certified » est rare sur LinkedIn : un vrai signal de confiance.",
  },
  {
    title: "TikTok Academy",
    provider: "TikTok",
    url: "https://www.tiktok.com/business/en/blog/tiktok-academy-launch",
    duration: "Variable",
    cert: "yes",
    blurb:
      "Certificat TikTok gratuit. Spark Ads, TikTok Shop, bonnes pratiques créatives. Indispensable si vous touchez à l'e-commerce et aux publics jeunes.",
  },
  {
    title: "Microsoft Advertising Certified Professional",
    provider: "Microsoft Advertising",
    url: "https://about.ads.microsoft.com/en-us/resources/training",
    duration: "~8 heures",
    cert: "yes",
    blurb:
      "Certification Microsoft Ads (Bing) gratuite. Moins de trafic, mais des CPC plus bas et une part de marché qui pèse à grande échelle.",
  },
  {
    title: "Certificat Google Marketing digital et e-commerce (Coursera)",
    provider: "Coursera × Google",
    url: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce",
    duration: "~6 mois",
    cert: "paid",
    blurb:
      "Certificat professionnel délivré par Google. Environ 50 $ par mois sur Coursera, aide financière possible. SEO, SEA, réseaux sociaux, e-mail, analytics e-commerce. Valorisable sur un CV.",
  },
];

const ANALYTICS_COURSES: CourseLink[] = [
  {
    title: "Les fondamentaux de Google Tag Manager",
    provider: "Google Skillshop",
    url: "https://skillshop.exceedlms.com/student/path/12158-google-tag-manager",
    duration: "~3 heures",
    cert: "yes",
    blurb:
      "Certification officielle gratuite. Presque tous les problèmes de suivi publicitaire viennent d'une mauvaise installation de GTM : de quoi éviter des heures de débogage.",
  },
  {
    title: "Tutoriels Looker Studio (ex-Data Studio)",
    provider: "Google",
    url: "https://support.google.com/looker-studio/answer/9171315",
    duration: "À votre rythme",
    cert: "no",
    blurb:
      "Tutoriels officiels gratuits pour construire des tableaux de bord clients. Looker Studio est le moyen le moins cher d'avoir des rapports mensuels professionnels.",
  },
  {
    title: "CXL Conversion Optimization Mini-Degree (aperçu gratuit)",
    provider: "CXL Institute",
    url: "https://cxl.com/institute/all-courses/",
    duration: "~20 heures (aperçu gratuit)",
    cert: "paid",
    blurb:
      "Le programme CRO le plus rigoureux. Le cursus payant est cher (environ 300 $ par mois), mais les leçons gratuites comptent parmi le meilleur contenu CRO en ligne.",
  },
];

const CERT_LABELS = { yes: "Certif. gratuite", paid: "Certif. payante", no: "Sans certif." };
const openLabel = (title: string) => `Ouvrir ${title} (nouvel onglet)`;

function FreeCourses() {
  return (
    <Section id="free-courses" icon={BookOpen} title="Formations gratuites et certifications" accent="emerald">
      <p>
        Une sélection de formations gratuites (et quelques payantes choisies)
        qui valent votre temps. Quand un certificat gratuit est proposé, il
        est signalé : il va directement sur LinkedIn et sur le CV.{" "}
        <strong>Vert = certificat gratuit.</strong>{" "}
        <strong>Orange = certificat payant, cours gratuits.</strong>{" "}
        <strong>Gris = sans certificat, mais à lire quand même.</strong>
      </p>
      <p>Les formations sont en anglais pour la plupart ; Google et Meta proposent souvent une version française.</p>

      <h3>SEO : des bases au niveau avancé</h3>
      <CourseList courses={SEO_COURSES} certLabels={CERT_LABELS} openLabel={openLabel} />

      <h3>Publicité : Google Ads, Meta, LinkedIn, TikTok</h3>
      <CourseList courses={ADS_COURSES} certLabels={CERT_LABELS} openLabel={openLabel} />

      <h3>Analytics, suivi, optimisation de la conversion</h3>
      <CourseList courses={ANALYTICS_COURSES} certLabels={CERT_LABELS} openLabel={openLabel} />

      <h3>Le bon ordre pour quelqu&apos;un qui démarre</h3>
      <ol>
        <li>
          <strong>Semaines 1 et 2 :</strong> Les fondamentaux du marketing
          numérique de Google (une base large) + la documentation Google
          Search Central (parcourez chaque section)
        </li>
        <li>
          <strong>Semaine 3 :</strong> la certification SEO de HubSpot, le
          chemin le plus court vers un certificat
        </li>
        <li>
          <strong>Semaine 4 :</strong> la certification Google Ads Search, la
          plus valorisable de cette liste
        </li>
        <li>
          <strong>Semaine 5 :</strong> la certification Google Analytics 4 :
          les données de chaque client passent par GA4, rien ne marche sans
        </li>
        <li>
          <strong>En continu :</strong> le blog d&apos;Ahrefs, Whiteboard
          Friday de Moz et la newsletter de Search Engine Land (ou Abondance en
          français). Les certifications n&apos;apprennent plus rien au bout de
          quelques mois ; les blogs, si.
        </li>
      </ol>

      <p className="mt-3 rounded-md bg-violet-500/[0.06] px-3 py-2 text-xs text-violet-200 ring-1 ring-inset ring-violet-500/20">
        💡 Toutes les certifications expirent 12 à 24 mois après leur
        obtention. Mettez un rappel pour la repasser : les questions évoluent
        avec les plateformes, et une certification expirée fait pire
        qu&apos;aucune (elle montre que vous avez arrêté d&apos;apprendre).
      </p>
    </Section>
  );
}
