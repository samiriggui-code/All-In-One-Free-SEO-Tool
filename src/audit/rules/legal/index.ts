import { cookieConsentRule } from "@/audit/rules/legal/cookie-consent";
import { registerRule } from "@/audit/engine/rule-registry";

registerRule(cookieConsentRule);
