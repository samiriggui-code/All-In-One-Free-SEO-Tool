import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Link2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Rule, Section } from "./top-sites-en";

export function TopSitesFr() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Pourquoi Backlinko, RankMath et Search Engine Journal sont n°1"
        description="La méthode, décortiquée, des trois sites qui dominent les résultats de recherche sur le SEO. Chaque règle ci-dessous est appliquée par au moins deux des trois. Servez-vous-en comme checklist pour vos propres contenus."
        icon={GraduationCap}
        accent="violet"
      />

      <Section
        id="content-depth"
        icon={BookOpen}
        title="Profondeur et originalité du contenu"
        accent="emerald"
      >
        <p>
          Le constat le plus constant : chaque page en tête des résultats est
          nettement plus complète que 90 % des pages concurrentes.
        </p>
        <Rule>
          <strong>Les guides piliers font 3 000 à 8 000 mots.</strong> Le
          « Skyscraper Technique » de Backlinko faisait environ 3 000 mots ;
          leur article « 200 Ranking Factors » en fait environ 6 000. La
          longueur suit le sujet, mais chaque article phare est la page la
          plus complète des résultats.
        </Rule>
        <Rule>
          <strong>Des données originales, pas des avis recyclés.</strong>{" "}
          Backlinko publie ses propres études (des millions de résultats de
          recherche analysés, des milliers de marketeurs interrogés). Search
          Engine Journal commande des enquêtes sectorielles. RankMath publie
          les données brutes de son extension. Recherche originale = backlinks
          = positions.
        </Rule>
        <Rule>
          <strong>De vraies captures, de vrais exemples, de vrais
          chiffres.</strong> Les photos de banque d&apos;images n&apos;apportent
          rien. Chaque article de Backlinko contient des captures annotées de
          la Search Console, de vraies pages de résultats et de vraies courbes
          de trafic client.
        </Rule>
        <Rule>
          <strong>Donnez un nom à vos méthodes.</strong> The Skyscraper
          Technique, The Reverse Outreach Method, The Content Hub Model. Une
          méthode qui a un nom se cite, se lie et se retient. L&apos;article
          Skyscraper a reçu plus de 23 400 backlinks, justement parce
          qu&apos;il porte un nom.
        </Rule>
      </Section>

      <Section id="topical-authority" icon={Target} title="L'autorité thématique avant la chasse aux mots-clés" accent="cyan">
        <Rule>
          <strong>Une architecture en étoile (pilier et satellites).</strong>{" "}
          Les trois sites organisent leurs contenus en grappes : un guide
          pilier et 15 à 30 articles satellites liés entre eux. Ils ne
          publient jamais d&apos;article isolé sur un sujet sans rapport.
        </Rule>
        <Rule>
          <strong>Couvrir tout le sujet avant de passer au suivant.</strong>{" "}
          Search Engine Journal n&apos;aborde pas une nouvelle niche avant
          d&apos;avoir couvert le terme principal, chaque question « Autres
          questions posées », chaque comparatif voisin et chaque tutoriel
          courant. Ensuite, ils creusent plutôt que d&apos;élargir.
        </Rule>
        <Rule>
          <strong>Un maillage interne dense.</strong> 5 à 15 liens internes
          contextuels par article, avec des ancres descriptives. Le pilier
          pointe vers chaque satellite ; les satellites renvoient vers le
          pilier ET vers les satellites voisins quand c&apos;est pertinent.
        </Rule>
        <Rule>
          <strong>Le sujet avant le mot-clé.</strong> SEJ ne part
          volontairement pas du volume de recherche. Ils partent de « quel
          sujet une référence de cette niche doit-elle maîtriser ? », puis
          exploitent les données de mots-clés pour bâtir la grappe.
        </Rule>
      </Section>

      <Section id="format-match" icon={Sparkles} title="Adopter le format qu'impose la page de résultats" accent="amber">
        <Rule>
          <strong>Choisissez le format que les résultats réclament.</strong>{" "}
          Si les 5 premiers sont des listes, écrivez une liste. Si ce sont des
          pages de définition, écrivez une page de définition. Un format
          décalé perd à tous les coups : les internautes (et Google) veulent
          ce qui domine déjà la page.
        </Rule>
        <Rule>
          <strong>Au moins une section taillée pour l&apos;extrait
          optimisé.</strong> Chaque article de Backlinko a au moins un H2
          formulé en question, suivi immédiatement d&apos;une réponse directe
          de 40 à 60 mots. Cela décroche l&apos;extrait de type paragraphe
          environ 30 % du temps.
        </Rule>
        <Rule>
          <strong>Les listes utilisent de vrais H2, pas une suite de
          puces.</strong> Chaque élément est son propre H2/H3, avec une courte
          introduction, les critères et un verdict. Éligible aux extraits.
        </Rule>
        <Rule>
          <strong>Un sommaire en haut des longs articles.</strong> Des ancres
          vers chaque H2 : Google s&apos;en sert parfois comme liens annexes
          de l&apos;article dans les résultats.
        </Rule>
      </Section>

      <Section id="eeat" icon={Star} title="Les signaux E-E-A-T (ceux qui se voient)" accent="emerald">
        <Rule>
          <strong>Un auteur signé, sur chaque article, à chaque fois.</strong>{" "}
          Un vrai nom, une vraie photo, une vraie page /author/&lt;slug&gt;
          avec ses références. Le nom de Brian Dean figure sur chaque article
          de Backlinko. Les articles de RankMath portent le nom d&apos;un
          contributeur précis, jamais « l&apos;équipe RankMath ».
        </Rule>
        <Rule>
          <strong>Une bio d&apos;auteur avec des références liées au
          sujet.</strong> « Brian Dean est le fondateur d&apos;Exploding
          Topics. Il a auparavant fondé Backlinko, revendu à Semrush en
          2022. » Précis. Vérifiable. Pas « passionné de marketing digital ».
        </Rule>
        <Rule>
          <strong>Une date de mise à jour sur chaque article.</strong> Visible
          en haut, plus la donnée structurée{" "}
          <code className="rounded bg-white/5 px-1 py-0.5">dateModified</code>.
          Mettez à jour les anciens articles tous les 90 à 180 jours et
          actualisez la date.
        </Rule>
        <Rule>
          <strong>Des citations de sources qui font autorité.</strong> 5 à 15
          liens sortants par article : documentation Google, études
          universitaires, presse, sources .gov / .edu. N&apos;ayez pas peur de
          « perdre du jus SEO » : un contenu bien sourcé se positionne mieux.
        </Rule>
        <Rule>
          <strong>Une mention de relecteur sur les sujets YMYL.</strong>{" "}
          « Relu par le Dr X » pour les contenus médicaux, juridiques ou
          financiers. Search Engine Journal le fait sur chaque article
          consacré à une mise à jour d&apos;algorithme.
        </Rule>
      </Section>

      <Section id="link-magnets" icon={Link2} title="Gagner les backlinks qui font gagner les positions" accent="violet">
        <Rule>
          <strong>Publiez au moins un « aimant à liens » par
          trimestre.</strong> Une étude de données, une enquête sectorielle,
          un glossaire, un outil gratuit. Ce sont eux qui attirent les
          backlinks « passifs » qui s&apos;accumulent pendant des années.
        </Rule>
        <Rule>
          <strong>Faites la promotion dès la sortie.</strong> Chaque étude de
          Backlinko part par e-mail personnalisé à plus de 100 journalistes et
          blogueurs concernés avant sa mise en ligne. Les liens des 30
          premiers jours décident des positions des 5 années suivantes.
        </Rule>
        <Rule>
          <strong>Utilisez HARO, Qwoted ou Help-A-B2B-Writer tous les
          jours.</strong> 15 minutes par jour = 2 à 3 liens de qualité par
          mois, régulièrement. Sur un an, cela fait plus de 30 liens venant de
          médias que vous ne pourriez pas démarcher à froid.
        </Rule>
        <Rule>
          <strong>N&apos;achetez pas de liens.</strong> Pas de PBN. Pas
          d&apos;inscriptions en masse dans des annuaires. Tous les grands
          blogs SEO le déconseillent explicitement, et les mises à jour
          anti-spam de Google en 2024 ont fait le ménage chez la plupart des
          sites qui le faisaient.
        </Rule>
      </Section>

      <Section id="technical" icon={CheckCircle2} title="Le socle technique (non négociable)" accent="cyan">
        <Rule>
          <strong>Core Web Vitals au vert sur mobile.</strong> Les trois sites
          passent LCP &lt; 2,5 s, INP &lt; 200 ms et CLS &lt; 0,1 sur mobile.
          Lancez{" "}
          <Link href="/tools/local-cwv" className="text-violet-300 hover:underline">
            /tools/local-cwv
          </Link>{" "}
          chaque mois sur vos pages qui rapportent.
        </Rule>
        <Rule>
          <strong>HTTPS partout, HSTS, TLS récent.</strong> Pas de contenu
          mixte. Pas de certificat expiré. Le strict minimum.
        </Rule>
        <Rule>
          <strong>Des données structurées sur chaque page qui s&apos;y
          prête.</strong> Article sur les articles, Person sur les pages
          auteur, Organization sur l&apos;accueil, BreadcrumbList partout.
          Validez avec{" "}
          <Link href="/tools/schema-validate" className="text-violet-300 hover:underline">
            /tools/schema-validate
          </Link>
          .
        </Rule>
        <Rule>
          <strong>Regardez votre site comme Google le voit.</strong> Lancez
          une requête site:votredomaine.com. Repérez les résultats qui
          devraient être désindexés (pages pauvres, catégories en double, URL
          à paramètres) et nettoyez-les.
        </Rule>
        <Rule>
          <strong>Sitemap XML, robots.txt, surveillance.</strong> Tout est à
          jour et soumis à la Search Console et à Bing Webmaster. Archivez
          régulièrement votre robots.txt avec{" "}
          <Link href="/tools/robots-history" className="text-violet-300 hover:underline">
            /tools/robots-history
          </Link>{" "}
          pour repérer un « Disallow: / » ajouté par erreur.
        </Rule>
      </Section>

      <Section id="cadence" icon={TrendingUp} title="Rythme de publication et d'entretien" accent="rose">
        <Rule>
          <strong>Publiez au moins une fois par semaine. Actualisez en
          continu.</strong> Backlinko publie environ un article très fouillé
          par semaine. SEJ publie tous les jours, mais actualise aussi plus de
          5 articles par semaine avec des données récentes. Mettre à jour les
          dates et refléter les bonnes pratiques actuelles est un travail
          permanent, pas ponctuel.
        </Rule>
        <Rule>
          <strong>Un budget dédié à l&apos;actualisation.</strong> 30 à 40 %
          du temps éditorial sert à actualiser l&apos;existant plutôt
          qu&apos;à publier du neuf. Utilisez{" "}
          <Link href="/tools/refresh" className="text-violet-300 hover:underline">
            /tools/refresh
          </Link>{" "}
          pour trouver les contenus qui déclinent.
        </Rule>
        <Rule>
          <strong>Suivez positions et trafic article par article, pas en
          global.</strong> Chaque article a un mot-clé principal clair, suivi
          chaque semaine. Si un article phare passe derrière le leader des
          résultats, il est actualisé sous 7 jours.
        </Rule>
      </Section>

      <Section id="ux" icon={Sparkles} title="Expérience et conversion (tout nourrit le classement)" accent="amber">
        <Rule>
          <strong>Un seul appel à l&apos;action par article.</strong>{" "}
          Backlinko : l&apos;inscription par e-mail. RankMath : installer
          l&apos;extension. SEJ : la newsletter. Trois appels à l&apos;action
          par article = zéro conversion.
        </Rule>
        <Rule>
          <strong>Une accroche visible sans faire défiler.</strong> Les 100
          premiers mots doivent donner une raison de continuer. Pas de
          préambule. Backlinko ouvre ses articles par un bénéfice et un
          chiffre qui le prouve.
        </Rule>
        <Rule>
          <strong>Une mise en forme facile à parcourir.</strong> Paragraphes
          courts (4 lignes maximum), intertitres descriptifs, listes à puces,
          affirmations clés en gras, encadrés pour les astuces. Pas de pavés
          de 200 mots.
        </Rule>
        <Rule>
          <strong>Pensé mobile d&apos;abord.</strong> Testez l&apos;article
          sur un écran de 375 px. S&apos;il paraît à l&apos;étroit, corrigez
          l&apos;affichage mobile avant de publier.
        </Rule>
      </Section>

      <Section id="ai-aware" icon={Sparkles} title="La réalité de 2026 : la visibilité dans la recherche IA" accent="violet">
        <p>
          Backlinko, RankMath et SEJ apparaissent tous dans les AI Overviews,
          ChatGPT Search et les citations de Perplexity. Pourquoi :
        </p>
        <Rule>
          <strong>Une structure qui mérite d&apos;être citée.</strong> Chaque
          article contient des affirmations factuelles claires et sourcées.
          Les LLM citent les contenus dont la source est sans ambiguïté et
          l&apos;affirmation précise.
        </Rule>
        <Rule>
          <strong>Une marque reconnue comme entité.</strong> Chaque auteur a
          une fiche Wikidata ; la marque a des données Organization avec des
          liens sameAs ; elle est citée de façon cohérente sur le web. Les LLM
          assimilent des entités, pas des URL.
        </Rule>
        <Rule>
          <strong>Une présence sur Reddit et les forums de niche.</strong>{" "}
          Reddit apparaît dans environ 40 % des citations des LLM. Les auteurs
          de SEJ répondent eux-mêmes aux questions sur Reddit / r/SEO avec
          leurs comptes personnels. Pas du spam de liens : de vraies réponses.
        </Rule>
        <Rule>
          <strong>Un llms.txt publié et les robots IA autorisés.</strong> Ils
          veulent être cités, donc GPTBot, ClaudeBot, PerplexityBot,
          OAI-SearchBot et Google-Extended sont tous autorisés dans le
          robots.txt.
        </Rule>
      </Section>

      <Section id="anti-patterns" icon={Star} title="Ce qu'ils ne font PAS (et vous non plus)" accent="rose">
        <Rule>
          <strong>Pas de réglage de densité de mots-clés.</strong> Google a dit
          il y a des années que ça n&apos;existe pas. Ne visez pas 2,5 %.
        </Rule>
        <Rule>
          <strong>Pas de domaine ni de slug en correspondance exacte.</strong>{" "}
          Les slugs sont descriptifs, pas bourrés de mots-clés.
        </Rule>
        <Rule>
          <strong>Pas de PBN, pas d&apos;achat de liens, pas de spam en
          commentaires.</strong>
        </Rule>
        <Rule>
          <strong>Pas de contenu généré par IA sans relecture
          humaine.</strong> Search Engine Land a publié une étude montrant
          qu&apos;un contenu retravaillé par un humain se positionne 8 fois
          plus souvent qu&apos;un texte 100 % IA.
        </Rule>
        <Rule>
          <strong>Pas de données FAQ sur les pages commerciales.</strong>{" "}
          Google a retiré les résultats enrichis FAQ pour les sites qui ne
          font pas autorité en 2023. Réservez-les aux pages .gov, santé ou de
          référence.
        </Rule>
        <Rule>
          <strong>Pas d&apos;AMP.</strong> Officiellement abandonné. Quitter
          AMP a rendu les pages de la plupart des grands éditeurs plus
          rapides, pas plus lentes.
        </Rule>
      </Section>

      <section className="glass-apple rounded-2xl p-5 space-y-2">
        <h3 className="text-sm font-semibold">En une phrase</h3>
        <p className="text-sm text-muted-foreground">
          Choisissez un sujet que vous pouvez légitimement maîtriser,
          planifiez dès le départ toute la grappe pilier et satellites,
          écrivez pour chaque satellite la page la plus utile des résultats,
          nommez vos méthodes, citez généreusement, actualisez en continu, et
          ne prenez jamais un raccourci SEO contraire aux règles anti-spam de
          Google. Le reste n&apos;est que de l&apos;exécution.
        </p>
      </section>
    </div>
  );
}
