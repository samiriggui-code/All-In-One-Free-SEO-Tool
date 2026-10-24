import type { IncomingMessage, ServerResponse } from "node:http";

export const PAGES: Record<string, string>;
export function handler(origin: () => string): (req: IncomingMessage, res: ServerResponse) => void;
