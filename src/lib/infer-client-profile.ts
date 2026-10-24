export type ClientNiche = "local" | "ecommerce" | "saas" | "blog" | "services";

export type InferredClientProfile = {
  niche: ClientNiche | null;
  businessType: string | null;
  confidence: "high" | "medium" | "low";
};

function haystack(input: {
  description?: string | null;
  businessType?: string | null;
  name?: string | null;
}): string {
  return [input.name, input.description, input.businessType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function nicheFromTech(stack: string[] | null | undefined): ClientNiche | null {
  if (!stack?.length) return null;
  const set = new Set(stack.map((s) => s.toLowerCase()));
  if (
    set.has("shopify") ||
    set.has("woocommerce") ||
    set.has("magento") ||
    set.has("bigcommerce")
  ) {
    return "ecommerce";
  }
  if (set.has("ghost") || set.has("hugo") || set.has("jekyll")) return "blog";
  return null;
}

/**
 * Best-effort niche + business type for onboarding autofill.
 * Never blocks saves — user can override everything.
 */
export function inferClientProfile(input: {
  description?: string | null;
  businessType?: string | null;
  name?: string | null;
  techStack?: string[] | null;
  gbpUrl?: string | null;
  city?: string | null;
  existingNiche?: ClientNiche | null;
}): InferredClientProfile {
  if (input.existingNiche) {
    return {
      niche: input.existingNiche,
      businessType: input.businessType?.trim() || null,
      confidence: "high",
    };
  }

  const text = haystack(input);
  let niche: ClientNiche | null = nicheFromTech(input.techStack);
  let confidence: InferredClientProfile["confidence"] = niche ? "medium" : "low";

  if (!niche && (input.gbpUrl || input.city)) {
    niche = "local";
    confidence = "medium";
  }

  if (!niche) {
    if (
      /(?<!\p{L})(vtc|chauffeur|taxi|uber|transfert|aéroport|cdg|orly|plombier|électricien|dentist|coiffeur|restaurant|boulangerie|agence immobilière|garage|clinique|vétérinaire)(?!\p{L})/iu.test(
        text,
      )
    ) {
      niche = "local";
      confidence = "high";
    } else if (/(?<!\p{L})(saas|software|b2b|api platform|crm)(?!\p{L})/iu.test(text)) {
      niche = "saas";
      confidence = "medium";
    } else if (/(?<!\p{L})(blog|magazine|media|journal|actualités)(?!\p{L})/iu.test(text)) {
      niche = "blog";
      confidence = "medium";
    } else if (
      /(?<!\p{L})(avocat|law firm|consultant|accountant|agency|marketing agency|freelance|services professionnels)(?!\p{L})/iu.test(
        text,
      )
    ) {
      niche = "services";
      confidence = "medium";
    }
  }

  let businessType: string | null = input.businessType?.trim() || null;
  if (!businessType && input.description) {
    if (/(?<!\p{L})(vtc|chauffeur)(?!\p{L})/iu.test(input.description)) {
      businessType = "VTC / chauffeur privé";
    } else if (/\bboulangerie\b/i.test(input.description)) {
      businessType = "Boulangerie";
    }
  }

  if (!businessType && niche === "local" && input.city) {
    businessType = `Commerce local · ${input.city}`;
    confidence = confidence === "high" ? "high" : "low";
  }

  return { niche, businessType, confidence };
}
