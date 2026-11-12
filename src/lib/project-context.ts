"use client";

import { useSyncExternalStore } from "react";

/**
 * The project the reader is working in, shared between the pieces of the
 * shell that are drawn in different layouts.
 *
 * The project's navigation (client-scope layout) knows the project; the
 * family tabs and a tool's back link (root layout, tool pages) need it to
 * keep their links inside that project. A layout further down cannot hand
 * a React context to one further up, hence this small store.
 *
 * It lasts as long as the browser tab navigates inside the app. After a
 * full reload on a tool page it is empty: links then fall back on the
 * `clientId` of the address, which is enough to stay in the project.
 */
export type ProjectContext = { id: number; name: string; url: string };

let current: ProjectContext | null = null;
const listeners = new Set<() => void>();

export function setProjectContext(next: ProjectContext): void {
  if (current && current.id === next.id && current.name === next.name && current.url === next.url) return;
  current = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProjectContext(): ProjectContext | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}
