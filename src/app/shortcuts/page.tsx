import { useTranslations } from "next-intl";
import type { Tx } from "@/lib/tx";
import { Keyboard } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";

type Shortcut = {
  combo: string[];
  context: string;
  description: string;
};

const SHORTCUTS = (tx: Tx): Shortcut[] => ([
  {
    combo: ["⌘", "K"],
    context: "Anywhere",
    description: tx("openTheQuickSearchPalette"),
  },
  {
    combo: ["?"],
    context: "Anywhere",
    description: tx("openThisKeyboardShortcutsReference"),
  },
  {
    combo: ["Esc"],
    context: tx("modalOpen"),
    description:
      tx("closeAnyOpenModalTool"),
  },
  {
    combo: ["↑", "↓"],
    context: tx("searchPalette"),
    description: tx("navigateThroughSearchResults"),
  },
  {
    combo: ["Enter"],
    context: tx("searchPalette"),
    description: tx("openTheSelectedResult"),
  },
  {
    combo: [tx("click")],
    context: "Per-client tool sidebar",
    description:
      tx("cmdCtrlShiftMiddleClick"),
  },
]);

export default function ShortcutsPage() {
  const tx = useTranslations("ui.app_shortcuts_page");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={tx("keyboardShortcuts")}
        description={tx("everyBindingTheAppResponds")}
        icon={Keyboard}
        accent="violet"
      />

      <section className="glass-apple relative overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">{tx("shortcut")}</th>
              <th className="px-5 py-3 font-semibold">{tx("context")}</th>
              <th className="px-5 py-3 font-semibold">{tx("whatItDoes")}</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS(tx).map((s, i) => (
              <tr
                key={i}
                className="border-t border-white/[0.04] hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1">
                    {s.combo.map((k, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <kbd className="inline-flex items-center justify-center rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground/90 ring-1 ring-inset ring-white/15">
                          {k}
                        </kbd>
                        {idx < s.combo.length - 1 && (
                          <span className="text-muted-foreground/50">+</span>
                        )}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {s.context}
                </td>
                <td className="px-5 py-3">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-muted-foreground">
        {tx.rich("tipMostPlatformsUseCtrl", { b0: (chunks) => <kbd className="rounded bg-white/[0.06] px-1 text-[10px] ring-1 ring-inset ring-white/15">{chunks}</kbd>, b1: (chunks) => <kbd className="rounded bg-white/[0.06] px-1 text-[10px] ring-1 ring-inset ring-white/15">{chunks}</kbd> })}
      </p>
    </div>
  );
}
