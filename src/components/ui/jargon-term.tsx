import { useTranslations } from "next-intl";
import type { Tx } from "@/lib/tx";
import { cn } from "@/lib/utils";

/**
 * Inline jargon explainer. Wrap a single SEO term in `<JargonTerm>`
 * and it gets:
 *   - dotted underline (signals "hover me")
 *   - native `title` tooltip with the plain-English definition
 *   - subtle cursor-help on hover
 *
 * Uses a built-in glossary of the 25 terms a beginner most commonly
 * trips on. Unknown terms render as plain text without an underline
 * so component callers can sprinkle this on anything without first
 * checking the glossary.
 *
 * Usage:
 *   <p>Your <JargonTerm term="canonical" /> tag tells Google which
 *   version of a page is the main one.</p>
 *
 * For a custom definition on the fly:
 *   <JargonTerm term="rel=canonical" definition="..." />
 */
const GLOSSARY = (tx: Tx): Record<string, string> => ({
  canonical:
    tx("aSignalToGoogleAbout"),
  "meta description":
    tx("theSnippetOfTextShown"),
  "title tag":
    tx("thePageTitleShownIn"),
  serp:
    tx("searchEngineResultsPageThe"),
  ctr:
    "Click-Through Rate — the percentage of people who see your search result and actually click it.",
  cwv:
    tx("coreWebVitalsGoogleS"),
  lcp:
    tx("largestContentfulPaintHowLong"),
  cls:
    tx("cumulativeLayoutShiftHowMuch"),
  inp:
    tx("interactionToNextPaintHow"),
  schema:
    tx("structuredDataJsonLdYou"),
  "rich result":
    tx("anEnhancedGoogleSearchListing"),
  "alt text":
    tx("theDescriptiveTextOnAn"),
  hreflang:
    tx("anHtmlTagThatTells"),
  "robots.txt":
    tx("aFileAtTheRoot"),
  sitemap:
    tx("anXmlFileListingEvery"),
  cannibalization:
    tx("whenTwoOrMorePages"),
  "content decay":
    tx("theSlowDropInTraffic"),
  "striking distance":
    tx("aKeywordYouRankFor"),
  "share of voice":
    tx("yourSliceOfTotalSearch"),
  "e-e-a-t":
    tx("experienceExpertiseAuthoritativenessTrustworthinessGoogle"),
  "ai overview":
    tx("googleSAiGeneratedAnswer"),
  geo:
    tx("generativeEngineOptimizationGettingYour"),
  "llms.txt":
    tx("aProposedPlainTextFile"),
  backlink:
    tx("aLinkFromSomeoneElse"),
  "anchor text":
    tx("theClickableTextOfA"),
  nap:
    tx("nameAddressPhoneTheThree"),
  gbp:
    tx("googleBusinessProfileYourBusiness"),
  gsc:
    tx("googleSearchConsoleGoogleS"),
  ga4:
    tx("googleAnalytics4TheCurrent"),
  "indexability":
    tx("whetherGoogleIsAllowedTo"),
  "page experience":
    tx("googleSBundleOfUx"),
});

export function JargonTerm({
  term,
  definition,
  children,
  className,
}: {
  /** The term to look up in the glossary. Case-insensitive. */
  term: string;
  /** Custom definition that overrides the built-in glossary. */
  definition?: string;
  /** Display text. Defaults to the term itself. */
  children?: React.ReactNode;
  className?: string;
}) {
  const tx = useTranslations("ui.components_ui_jargon-term");
  const def = definition ?? GLOSSARY(tx)[term.toLowerCase()];
  const text = children ?? term;
  if (!def) {
    // Unknown term — render plain text so this component is safe to
    // sprinkle anywhere without breaking the UI when glossary misses.
    return <>{text}</>;
  }
  return (
    <span
      title={def}
      className={cn(
        "cursor-help border-b border-dotted border-muted-foreground/60 decoration-muted-foreground/60 underline-offset-2",
        className,
      )}
    >
      {text}
    </span>
  );
}
