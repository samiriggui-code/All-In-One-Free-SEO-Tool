import { METHODOLOGIES } from "./methodologies.generated";

/**
 * A versioned writing playbook from BlogPilot. The content studio puts
 * these in the system prompt so the model follows a stated method
 * rather than its own idea of SEO best practice.
 */
export interface Methodology {
  id: string;
  title: string;
  when?: string;
  inputs?: string;
  outputs?: string;
  source?: string;
  body: string;
}

export function loadMethodologies(): Methodology[] {
  return METHODOLOGIES;
}

export function getMethodology(id: string): Methodology | undefined {
  return METHODOLOGIES.find((m) => m.id === id);
}

export function methodologyAsPrompt(id: string): string {
  const m = getMethodology(id);
  if (!m) throw new Error(`Unknown methodology: ${id}`);
  return `# Methodology: ${m.title}\n${m.source ? `Source: ${m.source}\n` : ""}\n${m.body}\n`;
}
