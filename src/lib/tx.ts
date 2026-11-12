import type { useTranslations } from "next-intl";

/**
 * A translator handed down to a helper or a module-level list, so text
 * that is built outside a component can still be translated.
 */
export type Tx = ReturnType<typeof useTranslations>;
