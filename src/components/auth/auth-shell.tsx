import { getTranslations } from "next-intl/server";
import { FileSearch, PenLine, Send } from "lucide-react";
import { accentColor, displayName, loadBrand, type Brand } from "@/lib/brand";

/**
 * The frame every sign-in screen renders in: login, first-run owner
 * setup and invited signup.
 *
 * It replaces the app shell on those routes (see the root layout), and
 * it carries the agency's branding from Settings → Branding: name,
 * tagline, logo and accent colour. A client contact invited as a viewer
 * lands here first, and this is the page that should say whose tool
 * they are signing in to.
 */

/** Logos are rendered with <img>, so any image type is safe to show. */
const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i;

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth.shell");
  const brand = await loadBrand().catch(() => null);
  const name = brand ? displayName(brand) : "SEO Tool";
  const accent = brand ? accentColor(brand) : "#7c3aed";
  const tagline = brand?.tagline?.trim() || t("tagline");
  const year = new Date().getFullYear();

  const pillars = [
    { icon: FileSearch, title: t("auditTitle"), body: t("auditBody") },
    { icon: PenLine, title: t("writeTitle"), body: t("writeBody") },
    { icon: Send, title: t("publishTitle"), body: t("publishBody") },
  ];

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside
        className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between"
        style={{
          background: `radial-gradient(120% 90% at 0% 0%, ${accent} 0%, ${accent}cc 28%, #0b0a14 78%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-24 size-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: accent }}
        />
        <BrandMark brand={brand} name={name} accent={accent} size="lg" />

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              {t("headline")}
            </h2>
            <p className="text-sm leading-relaxed text-white/75">{tagline}</p>
          </div>
          <ul className="space-y-4">
            {pillars.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs leading-relaxed text-white/65">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          © {year} {name}
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <BrandMark brand={brand} name={name} accent={accent} size="sm" />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground lg:hidden">
          © {year} {name}
        </p>
      </main>
    </div>
  );
}

function BrandMark({
  brand,
  name,
  accent,
  size,
}: {
  brand: Brand | null;
  name: string;
  accent: string;
  size: "sm" | "lg";
}) {
  const logo =
    brand?.logoDataUrl && IMAGE_DATA_URL.test(brand.logoDataUrl)
      ? brand.logoDataUrl
      : null;
  const box = size === "lg" ? "size-11 rounded-xl" : "size-9 rounded-lg";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "S";

  return (
    <div className="relative flex items-center gap-3">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from settings
        <img
          src={logo}
          alt=""
          className={`${box} bg-white object-contain p-1 shadow-lg`}
        />
      ) : (
        <span
          className={`${box} grid place-items-center text-sm font-semibold text-white shadow-lg ring-1 ring-white/25`}
          style={{ background: `linear-gradient(135deg, ${accent}, #c026d3)` }}
        >
          {initials}
        </span>
      )}
      <span
        className={
          size === "lg"
            ? "text-lg font-semibold tracking-tight"
            : "text-base font-semibold tracking-tight text-foreground"
        }
      >
        {name}
      </span>
    </div>
  );
}
