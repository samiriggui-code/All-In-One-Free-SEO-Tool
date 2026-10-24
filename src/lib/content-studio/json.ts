/**
 * Tolerant JSON extraction for model output.
 *
 * Providers that support schema-constrained decoding return clean JSON, but the
 * free/local models this app failovers to often ignore `response_format` and
 * wrap the payload in prose or a markdown fence. This replaces the ad-hoc
 * `indexOf("{") … lastIndexOf("}")` slice that was copy-pasted across nine call
 * sites — that version silently mangled any response containing a stray brace
 * before the payload, and could not handle a top-level array at all.
 */

/** Strip ```json … ``` (or bare ```) fences, if the whole body is fenced. */
function stripFences(text: string): string {
  const fenced = /^\s*```(?:json|JSON)?\s*\n([\s\S]*?)\n?\s*```\s*$/.exec(text);
  return fenced ? fenced[1] : text;
}

/**
 * Scan for the first balanced JSON object or array, respecting string literals
 * and escapes so braces inside strings don't confuse the matcher.
 */
function extractBalanced(text: string): string | null {
  for (let i = 0; i < text.length; i++) {
    const open = text[i];
    if (open !== "{" && open !== "[") continue;
    const close = open === "{" ? "}" : "]";

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        if (inString) escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return text.slice(i, j + 1);
      }
    }
  }
  return null;
}

/**
 * Parse a model response into `T`, or return null when nothing usable is found.
 * Callers keep their existing deterministic fallbacks for the null case.
 */
export function parseJsonResponse<T>(text: string): T | null {
  if (!text) return null;
  const body = stripFences(text.trim());

  try {
    return JSON.parse(body) as T;
  } catch {
    /* not bare JSON — keep going */
  }

  const balanced = extractBalanced(body);
  if (balanced) {
    try {
      return JSON.parse(balanced) as T;
    } catch {
      /* malformed */
    }
  }
  return null;
}

/**
 * A JSON Schema plus the name providers require for schema-constrained output.
 * Kept deliberately small: object/array/string/number/boolean plus `required`
 * and `additionalProperties`, which is the intersection every provider accepts.
 */
export interface JsonSchemaSpec {
  name: string;
  schema: Record<string, unknown>;
}

/** Helper for the common "object with these required properties" shape. */
export function objectSchema(
  name: string,
  properties: Record<string, unknown>,
  required: string[]
): JsonSchemaSpec {
  return {
    name,
    schema: {
      type: "object",
      properties,
      required,
      additionalProperties: false
    }
  };
}
