import type { CheerioAPI } from "cheerio";
import type { SchemaNodeSummary } from "@/audit/types";

/**
 * Parsed JSON-LD. It is arbitrary third-party JSON, so rules probe it
 * defensively (typeof checks, optional chaining) rather than trusting a shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonLd = any;
export type JsonLdObject = Record<string, JsonLd>;
export type TypedItem = { type: string; data: JsonLdObject; fields: string[] };

export function extractJsonLdScripts($: CheerioAPI): JsonLd[] {
  const results: JsonLd[] = [];
  const jsonLdScripts = $('script[type="application/ld+json"]');
  jsonLdScripts.each((_, element) => {
    const rawContent = $(element).html() || "";
    const trimmedContent = rawContent.trim();
    if (!trimmedContent) {
      return;
    }
    try {
      const parsed = JSON.parse(trimmedContent);
      results.push(parsed);
    } catch {
    }
  });
  return results;
}
export function extractTypedItems2(data: JsonLd): TypedItem[] {
  const items: TypedItem[] = [];
  if (!data || typeof data !== "object") {
    return items;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      items.push(...extractTypedItems2(item));
    }
    return items;
  }
  const obj: JsonLdObject = data;
  if (Array.isArray(obj["@graph"])) {
    for (const graphItem of obj["@graph"]) {
      items.push(...extractTypedItems2(graphItem));
    }
  }
  if (obj["@type"]) {
    const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
    const fields = Object.keys(obj).filter((k) => !k.startsWith("@"));
    for (const type of types) {
      items.push({
        type,
        data: obj,
        fields
      });
    }
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === "@graph") continue;
    if (value && typeof value === "object") {
      items.push(...extractTypedItems2(value));
    }
  }
  return items;
}
export function findItemsByType($: CheerioAPI, targetTypes: string | string[]): TypedItem[] {
  const targets = Array.isArray(targetTypes) ? targetTypes : [targetTypes];
  const allItems: TypedItem[] = [];
  const scripts = extractJsonLdScripts($);
  for (const script of scripts) {
    allItems.push(...extractTypedItems2(script));
  }
  return allItems.filter((item) => targets.includes(item.type));
}
export function hasField(item: Pick<TypedItem, "data">, field: string): boolean {
  const value = item.data[field];
  if (value === null || value === void 0) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}
export function getMissingFields(item: Pick<TypedItem, "data">, required: string[]): string[] {
  return required.filter((field) => !hasField(item, field));
}
export const REF_KEYS = ["publisher", "author", "isPartOf", "mainEntityOfPage", "about", "brand", "provider"];
export const NODE_CAP = 40;
export function textValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return void 0;
}
export function idFrom(value: JsonLd): string | undefined {
  const direct = textValue(value);
  if (direct && (typeof value !== "object" || value === null)) return direct;
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  return textValue(value["@id"]);
}
export function addressOf(value: JsonLd): string | undefined {
  const direct = textValue(value);
  if (direct) return direct;
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const record: JsonLdObject = value;
  const parts = ["streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"].map((key) => {
    const part = record[key];
    return textValue(part) ?? (part && typeof part === "object" && !Array.isArray(part) ? textValue(part.name) : void 0);
  }).filter((part) => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : void 0;
}
export function refsFrom(data: JsonLdObject): string[] {
  const refs: string[] = [];
  for (const key of REF_KEYS) {
    const value = data[key];
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      const id = idFrom(item);
      if (id) refs.push(id);
    }
  }
  return refs;
}
export function summarizeSchemaNodes($: CheerioAPI): SchemaNodeSummary[] {
  const nodes: SchemaNodeSummary[] = [];
  const seen = new Set<string>();
  for (const script of extractJsonLdScripts($)) {
    for (const item of extractTypedItems2(script)) {
      const id = textValue(item.data["@id"]);
      const name = textValue(item.data.name);
      const key = `${id ?? ""}|${item.type}|${name ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const node: SchemaNodeSummary = {
        types: [item.type],
        refs: refsFrom(item.data)
      };
      if (id) node.id = id;
      if (name) node.name = name;
      const logo = textValue(item.data.logo) ?? textValue(
        item.data.logo && typeof item.data.logo === "object" && !Array.isArray(item.data.logo) ? item.data.logo.url : void 0
      );
      if (logo) node.logo = logo;
      const telephone = textValue(item.data.telephone);
      if (telephone) node.telephone = telephone;
      const address = addressOf(item.data.address);
      if (address) node.address = address;
      nodes.push(node);
      if (nodes.length >= NODE_CAP) return nodes;
    }
  }
  return nodes;
}
