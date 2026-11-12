import { useTranslations } from "next-intl";
import { ScanText } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { ScreenshotImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  const tx = useTranslations("ui.app_import_page");
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={tx("importFromScreenshot")}
        description={tx("uploadAScreenshotOfAny")}
        icon={ScanText}
        accent="fuchsia"
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-inset ring-white/10">
            {tx("tesseractJsRunsLocally")}
          </span>
        }
      />

      <ScreenshotImportForm />

      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="font-semibold text-foreground">{tx("whyThisExists")}</div>
          <p className="mt-1 text-muted-foreground">
            {tx("someDataLivesBehindPaid")}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="font-semibold text-foreground">{tx("howItWorks")}</div>
          <p className="mt-1 text-muted-foreground">
            {tx("tesseractJsDoesTheOcr")}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <div className="font-semibold text-foreground">{tx("whatWorksBest")}</div>
          <p className="mt-1 text-muted-foreground">
            {tx("highResolutionScreenshotsWithClear")}
          </p>
        </div>
      </div>
    </div>
  );
}
