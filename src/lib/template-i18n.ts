/**
 * Task templates in the workspace language.
 *
 * Templates are matched (site preflight, de-duplication) by their English
 * title; this module only turns one into what gets written to the task
 * list. English is returned untouched.
 */

import { PLAYBOOKS_FR, PLAYBOOK_CATEGORIES_FR, TEMPLATES_FR } from "./template-fr";

type Text = { title: string; description: string; whyItMatters: string };

export function localizeTemplate<T extends Text>(template: T, locale: string): T {
  if (locale !== "fr") return template;
  const fr = TEMPLATES_FR[template.title];
  if (!fr) return template;
  return { ...template, title: fr[0], description: fr[1], whyItMatters: fr[2] };
}

/** Every title a template may already be on a task list under. */
export function templateTitles(template: { title: string }): string[] {
  const fr = TEMPLATES_FR[template.title];
  return fr ? [template.title, fr[0]] : [template.title];
}

export function localizePlaybook<
  P extends { id: string; name: string; description: string; category: string; tasks: Text[] },
>(playbook: P, locale: string): P & { categoryLabel: string } {
  if (locale !== "fr") return { ...playbook, categoryLabel: playbook.category };
  const fr = PLAYBOOKS_FR[playbook.id];
  return {
    ...playbook,
    name: fr?.name ?? playbook.name,
    description: fr?.description ?? playbook.description,
    categoryLabel: PLAYBOOK_CATEGORIES_FR[playbook.category] ?? playbook.category,
    tasks: playbook.tasks.map((t) => localizeTemplate(t, locale)),
  };
}
