"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  Plus,
  AlertCircle,
  CheckCircle2,
  Webhook,
  ListChecks,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAutomation,
  type SaveAutomationResult,
} from "./actions";

export function NewAutomationForm({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const tx = useTranslations("ui.app_automations_new-form");
  const [actionKind, setActionKind] = useState<
    "webhook" | "create_task" | "log"
  >("create_task");

  const [state, formAction, pending] = useActionState<
    SaveAutomationResult | null,
    FormData
  >(createAutomation, null);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/5 bg-card/40 p-5 backdrop-blur-md"
    >
      <input type="hidden" name="actionKind" value={actionKind} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">{tx("name")}</Label>
          <Input
            id="name"
            name="name"
            placeholder={tx("alertOnLowScores")}
            required
            minLength={2}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trigger">{tx("whenThisHappens")}</Label>
          <select
            id="trigger"
            name="trigger"
            defaultValue="audit_completed"
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 py-1 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="audit_completed">{tx("auditCompleted")}</option>
            <option value="audit_failed">{tx("auditFailed")}</option>
            <option value="score_drop">{tx("scoreDropped")}</option>
            <option value="page_change">{tx("pageChanged")}</option>
            <option value="rank_drop">{tx("rankDropped")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientId">{tx("clientFilter")}</Label>
          <select
            id="clientId"
            name="clientId"
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-white/10 bg-card/60 px-3 py-1 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="">{tx("allClients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <Label>{tx("thenDoThis")}</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <ActionTab
            active={actionKind === "create_task"}
            onClick={() => setActionKind("create_task")}
            icon={ListChecks}
            label={tx("createTask")}
          />
          <ActionTab
            active={actionKind === "webhook"}
            onClick={() => setActionKind("webhook")}
            icon={Webhook}
            label={tx("sendWebhook")}
          />
          <ActionTab
            active={actionKind === "log"}
            onClick={() => setActionKind("log")}
            icon={FileText}
            label={tx("logActivity")}
          />
        </div>
      </div>

      <div className="mt-4">
        {actionKind === "create_task" && (
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="taskTitle">{tx("taskTitle")}</Label>
              <Input
                id="taskTitle"
                name="taskTitle"
                placeholder="Investigate score drop on {{clientName}}"
              />
              <p className="text-[11px] text-muted-foreground">
                Use{" "}
                <code className="rounded bg-white/5 px-1">{"{{score}}"}</code>,{" "}
                <code className="rounded bg-white/5 px-1">{"{{previousScore}}"}</code>,{" "}
                <code className="rounded bg-white/5 px-1">{"{{topIssue}}"}</code>{" "}
                etc. as placeholders.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taskPriority">{tx("priority")}</Label>
              <select
                id="taskPriority"
                name="taskPriority"
                defaultValue="medium"
                className="flex h-9 rounded-md border border-white/10 bg-card/60 px-3 py-1 text-sm"
              >
                <option value="high">{tx("high")}</option>
                <option value="medium">{tx("medium")}</option>
                <option value="low">{tx("low")}</option>
              </select>
            </div>
          </div>
        )}

        {actionKind === "webhook" && (
          <div className="space-y-1.5">
            <Label htmlFor="webhookUrl">{tx("webhookUrl")}</Label>
            <Input
              id="webhookUrl"
              name="webhookUrl"
              placeholder="https://hooks.slack.com/..."
              type="url"
            />
            <p className="text-[11px] text-muted-foreground">
              {tx("sameFormatDetectionAsThe")}
            </p>
          </div>
        )}

        {actionKind === "log" && (
          <div className="space-y-1.5">
            <Label htmlFor="logMessage">{tx("logMessage")}</Label>
            <Input
              id="logMessage"
              name="logMessage"
              placeholder="Score dropped to {{score}} on {{clientName}}"
            />
          </div>
        )}
      </div>

      {state && (
        <div
          className={
            state.ok
              ? "mt-3 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300"
              : "mt-3 flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-300"
          }
        >
          {state.ok ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <AlertCircle className="size-3.5" />
          )}
          {state.ok ? tx("automationCreated") : state.error}
        </div>
      )}

      <div className="mt-4">
        <Button
          type="submit"
          disabled={pending}
          className="shadow-md shadow-fuchsia-500/20"
        >
          <Plus className="size-4" />
          {pending ? tx("creating") : tx("createAutomation")}
        </Button>
      </div>
    </form>
  );
}

function ActionTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Webhook;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-md bg-fuchsia-500/15 px-2.5 py-1.5 text-xs font-medium text-fuchsia-300 ring-1 ring-inset ring-fuchsia-500/30"
          : "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
      }
    >
      <Icon className="size-3" />
      {label}
    </button>
  );
}
