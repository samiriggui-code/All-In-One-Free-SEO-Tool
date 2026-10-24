// Strings inside /tools/* pages, under tools.ui.{slug}. Split into batches
// so translators working in parallel never edit the same file; each slug
// lives in exactly one batch.
import batch1En from "../../messages/tools-ui/batch-1.en.json";
import batch1Fr from "../../messages/tools-ui/batch-1.fr.json";
import batch2En from "../../messages/tools-ui/batch-2.en.json";
import batch2Fr from "../../messages/tools-ui/batch-2.fr.json";
import batch3En from "../../messages/tools-ui/batch-3.en.json";
import batch3Fr from "../../messages/tools-ui/batch-3.fr.json";
import batch4En from "../../messages/tools-ui/batch-4.en.json";
import batch4Fr from "../../messages/tools-ui/batch-4.fr.json";
import batch5En from "../../messages/tools-ui/batch-5.en.json";
import batch5Fr from "../../messages/tools-ui/batch-5.fr.json";

export const TOOL_UI_BATCHES = {
  en: [batch1En, batch2En, batch3En, batch4En, batch5En],
  fr: [batch1Fr, batch2Fr, batch3Fr, batch4Fr, batch5Fr],
} as const;

export const TOOL_UI = {
  en: Object.assign({}, ...TOOL_UI_BATCHES.en) as Record<string, unknown>,
  fr: Object.assign({}, ...TOOL_UI_BATCHES.fr) as Record<string, unknown>,
} as const;
