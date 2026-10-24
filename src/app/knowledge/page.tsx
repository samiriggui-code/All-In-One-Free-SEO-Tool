import { getLocale } from "next-intl/server";
import { KnowledgeEn } from "./knowledge-en";
import { KnowledgeFr } from "./knowledge-fr";

/**
 * The knowledge hub. Long-form teaching text, so each language is its
 * own component rather than hundreds of message keys.
 */
export default async function KnowledgeHubPage() {
  return (await getLocale()) === "fr" ? <KnowledgeFr /> : <KnowledgeEn />;
}
