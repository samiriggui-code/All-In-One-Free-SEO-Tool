"use client";

import { useState } from "react";
import {
  Building,
  Check,
  Copy,
  Globe,
  Mail,
  MapPin,
  Phone,
  User,
  Calendar,
  AtSign,
} from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Quick-copy card showing every NAP / brand field a freelancer needs while
 * doing link-building, citation submissions, or outreach. Each value has a
 * one-click copy button.
 *
 * Place on the client page, the link-building per-client view, the
 * citations per-client view — anywhere a user might be filling out a
 * directory submission form.
 */

export type ClientInfo = {
  name: string;
  url: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  businessType?: string | null;
  /** Simple "tagline" — first sentence of the description, or business type. */
  shortDescription?: string | null;
};

const FIELDS: {
  key: keyof ClientInfo;
  icon: typeof Building;
}[] = [
  { key: "name", icon: Building },
  { key: "url", icon: Globe },
  { key: "email", icon: Mail },
  { key: "phone", icon: Phone },
  { key: "address", icon: MapPin },
  { key: "city", icon: MapPin },
  { key: "country", icon: MapPin },
  { key: "businessType", icon: User },
  { key: "shortDescription", icon: AtSign },
  { key: "description", icon: Calendar },
];

export function ClientInfoCard({ info }: { info: ClientInfo }) {
  const t = useTranslations("clientInfoCard.card");
  const fields = FIELDS.map((f) => ({
    ...f,
    value: (info[f.key] as string | null | undefined) ?? "",
  })).filter((f) => f.value);

  return (
    <section className="glass-apple relative overflow-hidden rounded-2xl">
      <header className="border-b border-white/[0.06] px-5 py-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Copy className="size-4 text-cyan-300" />
          {t("title")}
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {t("intro")}
        </p>
      </header>
      <ul className="divide-y divide-white/[0.04]">
        {fields.map((f) => (
          <CopyRow
            key={f.key}
            label={t(`fields.${f.key}`)}
            value={f.value}
            icon={f.icon}
          />
        ))}
        <li className="px-5 py-3">
          <CopyAllNapButton info={info} />
        </li>
      </ul>
    </section>
  );
}

function CopyRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Building;
}) {
  const t = useTranslations("clientInfoCard.card");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  const isLong = value.length > 80;

  return (
    <li className="flex items-start gap-3 px-5 py-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`mt-0.5 text-sm ${isLong ? "" : "truncate"}`}
          title={value}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-inset ring-white/10 hover:bg-white/10 hover:text-foreground"
      >
        {copied ? (
          <>
            <Check className="size-3" />
            {t("copied")}
          </>
        ) : (
          <>
            <Copy className="size-3" />
            {t("copy")}
          </>
        )}
      </button>
    </li>
  );
}

function CopyAllNapButton({ info }: { info: ClientInfo }) {
  const t = useTranslations("clientInfoCard.card");
  const [copied, setCopied] = useState(false);

  function copy() {
    const lines: string[] = [];
    if (info.name) lines.push(info.name);
    if (info.address) lines.push(info.address);
    if (info.phone) lines.push(info.phone);
    if (info.url) lines.push(info.url);
    if (info.email) lines.push(info.email);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-500/30 hover:bg-cyan-500/25"
    >
      {copied ? (
        <>
          <Check className="size-3" />
          {t("napCopied")}
        </>
      ) : (
        <>
          <Copy className="size-3" />
          {t("napCopy")}
        </>
      )}
    </button>
  );
}
