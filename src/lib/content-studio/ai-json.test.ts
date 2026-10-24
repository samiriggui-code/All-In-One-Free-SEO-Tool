import { describe, it, expect } from "vitest";
import { parseJsonResponse, objectSchema } from "@/lib/content-studio/json";

describe("parseJsonResponse", () => {
  it("parses bare JSON", () => {
    expect(parseJsonResponse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses a top-level array (the old slice could not)", () => {
    expect(parseJsonResponse<number[]>("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("strips a ```json fence", () => {
    const text = '```json\n{"a": 1, "b": "two"}\n```';
    expect(parseJsonResponse(text)).toEqual({ a: 1, b: "two" });
  });

  it("strips a bare ``` fence", () => {
    expect(parseJsonResponse('```\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("extracts JSON wrapped in prose", () => {
    const text = 'Sure! Here is the outline you asked for:\n{"title":"X"}\nLet me know if you want changes.';
    expect(parseJsonResponse(text)).toEqual({ title: "X" });
  });

  it("is not confused by a brace inside a string value", () => {
    // The old indexOf/lastIndexOf slice mangled payloads like this.
    const text = 'Here you go: {"note":"use {curly} braces","n":2} done';
    expect(parseJsonResponse(text)).toEqual({ note: "use {curly} braces", n: 2 });
  });

  it("is not confused by an escaped quote inside a string", () => {
    const text = '{"quote":"she said \\"hi\\" loudly"}';
    expect(parseJsonResponse<{ quote: string }>(text)?.quote).toBe('she said "hi" loudly');
  });

  it("handles nested objects and arrays", () => {
    const text = 'prefix {"a":{"b":[1,{"c":2}]}} suffix';
    expect(parseJsonResponse(text)).toEqual({ a: { b: [1, { c: 2 }] } });
  });

  it("returns null for prose with no JSON", () => {
    expect(parseJsonResponse("I cannot help with that request.")).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    expect(parseJsonResponse('{"a": }')).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseJsonResponse("")).toBeNull();
  });
});

describe("objectSchema", () => {
  it("builds a strict object schema", () => {
    const s = objectSchema("thing", { a: { type: "string" } }, ["a"]);
    expect(s.name).toBe("thing");
    expect(s.schema).toEqual({
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
      additionalProperties: false
    });
  });
});
