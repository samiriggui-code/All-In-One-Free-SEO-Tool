import { useTranslations } from "next-intl";
import type { Tx } from "@/lib/tx";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Wrench,
  Search,
  Lightbulb,
  AlertTriangle,
  Database,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";

export const dynamic = "force-dynamic";

const CAN_DO = (tx: Tx) => ([
  {
    icon: Database,
    title: tx("readYourOwnData"),
    examples: [
      tx("whichClientHasTheWorst"),
      tx("whatSTheMostCommon"),
      tx("showMeStrikingDistanceKeywords"),
      tx("whichPagesOnClientX"),
      tx("whatDidTheDailyAgent"),
    ],
  },
  {
    icon: Wrench,
    title: tx("writeCodeOnRequest"),
    examples: [
      tx("writeAWordpressPluginThat"),
      tx("generateJsonLdSchemaFor"),
      tx("giveMeHtaccessToRedirect"),
      tx("writeAShopifyLiquidSnippet"),
    ],
    note: tx("forComplexCodeTheSeo"),
    noteLink: { label: tx("useTheCodeGenerator"), href: "/tools/code-generator" },
  },
  {
    icon: Search,
    title: tx("researchLiveData"),
    examples: [
      tx("whatIsGoogleAiOverview"),
      tx("latestGoogleAlgorithmUpdatesThis"),
      tx("top10TrendingTopicsIn"),
      tx("whoSTheTopCompetitor"),
    ],
    note: tx("liveResearchUsesAnExternal"),
  },
  {
    icon: Lightbulb,
    title: tx("strategicAdvice"),
    examples: [
      tx("whatShouldIFocusOn"),
      tx("howDoIRankA"),
      tx("isItWorthPursuingAi"),
      tx("whatSTheBestLink"),
    ],
  },
  {
    icon: MessageCircle,
    title: tx("skillModeFocus"),
    examples: [
      tx("switchToLocalSeoSkill"),
      tx("switchToTechnicalSeoSkill"),
      tx("switchToAiVisibilityLlm"),
      "26 skills total covering every SEO specialty.",
    ],
    note: tx("skillsChangeTheSystemPrompt"),
  },
]);

const CANT_DO = (tx: Tx) => ([
  {
    title: tx("submitFormsOnThirdParty"),
    why: tx("mostDirectoriesRequireHumanVerification"),
    workaround:
      tx("useTheBacklinkProspectsLibrary"),
    workaroundHref: "/link-building/library",
  },
  {
    title: tx("modifySomeoneElseSSite"),
    why: tx("iCanWriteCodeBut"),
    workaround:
      tx("installTheWordpressBridgePlugin"),
  },
  {
    title: tx("verifyGoogleBusinessProfile"),
    why: tx("googleRequiresPostcardPhoneVideo"),
    workaround:
      tx("useTheGbpToolkitPage"),
    workaroundHref: "/gbp",
  },
  {
    title: tx("runRankChecksAtScale"),
    why: tx("freeBrowserModeRankChecking"),
    workaround:
      tx("spreadChecksAcrossDaysOr"),
  },
  {
    title: tx("guaranteeARankingOutcome"),
    why: tx("rankingDependsOnGoogleS"),
    workaround:
      tx("iLlTellYouWhat"),
  },
]);

const TIPS = (tx: Tx) => ([
  tx("beSpecificImproveMySeo"),
  tx("referenceRealDataThePricing"),
  tx("useSkillModeForNarrow"),
  tx("whenYouWantCodeSay"),
  tx("ifAnAnswerFeelsGeneric"),
]);

export default function ChatCapabilitiesPage() {
  const tx = useTranslations("ui.app_seo-chat_capabilities_page");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/seo-chat"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> {tx("backToSeoChat")}
      </Link>

      <PageHeader
        title={tx("whatTheAiChatCan")}
        description={tx("aCompleteReferenceOfWhat")}
        icon={Bot}
        accent="violet"
      />

      <section className="glass-apple relative overflow-hidden rounded-2xl">
        <header className="border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-sm font-semibold text-emerald-300 inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            {tx("thingsItCanDo")}
          </h2>
        </header>
        <ul className="divide-y divide-white/[0.06]">
          {CAN_DO(tx).map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={i} className="px-5 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-violet-300" />
                  <p className="text-sm font-medium">{c.title}</p>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {c.examples.map((e, j) => (
                    <li key={j} className="flex items-start gap-1.5">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-400" />
                      <span>&quot;{e}&quot;</span>
                    </li>
                  ))}
                </ul>
                {c.note && (
                  <p className="rounded-md bg-violet-500/5 p-2 text-[11px] text-violet-300 ring-1 ring-inset ring-violet-500/20">
                    {c.note}
                    {c.noteLink && (
                      <>
                        {" — "}
                        <Link
                          href={c.noteLink.href}
                          className="underline hover:text-violet-100"
                        >
                          {c.noteLink.label}
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="glass-apple relative overflow-hidden rounded-2xl">
        <header className="border-b border-white/[0.06] px-5 py-3">
          <h2 className="text-sm font-semibold text-rose-300 inline-flex items-center gap-1.5">
            <XCircle className="size-4" />
            {tx("thingsItCanTDo")}
          </h2>
        </header>
        <ul className="divide-y divide-white/[0.06]">
          {CANT_DO(tx).map((c, i) => (
            <li key={i} className="px-5 py-4 space-y-2 text-xs">
              <p className="text-sm font-medium">{c.title}</p>
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-400" />
                <span>{c.why}</span>
              </div>
              <div className="rounded-md bg-emerald-500/5 p-2 ring-1 ring-inset ring-emerald-500/20">
                <p className="text-[10px] uppercase tracking-wider text-emerald-300">
                  {tx("workaround")}
                </p>
                <p className="text-muted-foreground">
                  {c.workaround}
                  {c.workaroundHref && (
                    <>
                      {" "}
                      <Link
                        href={c.workaroundHref}
                        className="text-emerald-300 underline hover:text-emerald-100"
                      >
                        {tx("open")}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-3">
          {tx("tipsForGettingBetterAnswers")}
        </h2>
        <ul className="space-y-2 text-sm">
          {TIPS(tx).map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-apple relative overflow-hidden rounded-2xl p-5 text-xs text-muted-foreground">
        <p>
          {tx.rich("theChatUsesYourConfigured", { b0: (chunks) => <Link href="/settings" className="text-violet-300 hover:underline">{chunks}</Link> })}
        </p>
      </section>
    </div>
  );
}
