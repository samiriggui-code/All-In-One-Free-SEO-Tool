import { describe, expect, it } from "vitest";
import { nicheTemplates, playbooks } from "./niche-templates";
import { getTemplatesByKey, STACK_LABELS } from "./tech-stack-templates";
import { PLAYBOOKS_FR, PLAYBOOK_CATEGORIES_FR, TEMPLATES_FR } from "./template-fr";
import { localizePlaybook, localizeTemplate, templateTitles } from "./template-i18n";

const all = [
  ...Object.values(nicheTemplates).flat(),
  ...Object.keys(STACK_LABELS).flatMap((k) =>
    getTemplatesByKey(k as Parameters<typeof getTemplatesByKey>[0]),
  ),
  ...playbooks.flatMap((p) => p.tasks),
];

describe("template translations", () => {
  it("has French text for every template", () => {
    const missing = all.filter((t) => !TEMPLATES_FR[t.title]).map((t) => t.title);
    expect(missing).toEqual([]);
  });

  it("has no French entry for a template that no longer exists", () => {
    const known = new Set(all.map((t) => t.title));
    expect(Object.keys(TEMPLATES_FR).filter((k) => !known.has(k))).toEqual([]);
  });

  it("has French text for every playbook and category", () => {
    for (const p of playbooks) {
      expect(PLAYBOOKS_FR[p.id], p.id).toBeTruthy();
      expect(PLAYBOOK_CATEGORIES_FR[p.category], p.category).toBeTruthy();
    }
  });

  it("leaves English untouched and translates French", () => {
    const t = all[0];
    expect(localizeTemplate(t, "en")).toBe(t);
    const fr = localizeTemplate(t, "fr");
    expect(fr.title).toBe(TEMPLATES_FR[t.title][0]);
    expect(fr.priority).toBe(t.priority);
    expect(templateTitles(t)).toEqual([t.title, fr.title]);
  });

  it("translates a playbook and keeps its task count", () => {
    const pb = playbooks[0];
    const fr = localizePlaybook(pb, "fr");
    expect(fr.name).toBe(PLAYBOOKS_FR[pb.id].name);
    expect(fr.tasks).toHaveLength(pb.tasks.length);
    expect(localizePlaybook(pb, "en").name).toBe(pb.name);
  });
});
