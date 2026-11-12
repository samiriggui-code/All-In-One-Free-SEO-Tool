import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { GraderForm } from "./grader-form";

export const dynamic = "force-dynamic";

export default function GraderPage() {
  const tx = useTranslations("ui.app_grader_page");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("instantAudit")}
        description={tx("dropAnyUrlWeLl")}
        icon={Sparkles}
        accent="fuchsia"
      />

      <GraderForm />

      {/* What we check */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Capsule
          tone="violet"
          title={tx("onPageSeo")}
          items={[
            tx("titleLength"),
            tx("metaDescription"),
            "H1 + heading hierarchy",
            tx("canonicalLink"),
            tx("viewportTag"),
            tx("opengraphTags"),
          ]}
        />
        <Capsule
          tone="cyan"
          title={tx("technicalHealth")}
          items={[
            "HTTPS",
            tx("serverResponseTime"),
            "JSON-LD schema",
            "robots.txt + sitemap",
            tx("securityHeaders"),
          ]}
        />
        <Capsule
          tone="amber"
          title={tx("contentImages")}
          items={[
            tx("wordCount"),
            tx("imageAltText"),
            tx("lazyLoading"),
            tx("modernFormatsWebpAvif"),
            tx("langAttribute"),
          ]}
        />
      </section>
    </div>
  );
}

function Capsule({
  tone,
  title,
  items,
}: {
  tone: "violet" | "cyan" | "amber";
  title: string;
  items: string[];
}) {
  const accent = {
    violet: "from-violet-500/15",
    cyan: "from-cyan-500/15",
    amber: "from-amber-500/15",
  }[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-card/40 p-4 backdrop-blur-md">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${accent} to-transparent blur-3xl`}
      />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-foreground/85">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-1.5">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />
              {it}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
