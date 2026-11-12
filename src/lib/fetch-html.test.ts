import { describe, expect, it } from "vitest";
import { bodyWithout, decodeBasicEntities, subHeadings, textOf } from "./fetch-html";

describe("page text helpers", () => {
  const html = `<html><head><title>T</title></head><body>
    <nav>Menu</nav><h2>Why &amp; how</h2><p>Hello&nbsp;world</p>
    <h3>ok</h3><script>x()</script><footer>Foot</footer></body></html>`;

  it("drops the listed elements from the body only", () => {
    const body = bodyWithout(html, ["script", "nav", "footer"]);
    expect(body).not.toMatch(/Menu|Foot|x\(\)|<title>/);
    expect(textOf(body)).toBe("Why & how Hello world ok");
  });

  it("keeps H2/H3 of 3 to 120 characters", () => {
    expect(subHeadings(html)).toEqual(["Why & how"]);
  });

  it("decodes the basic entities", () => {
    expect(decodeBasicEntities("&lt;a&gt; &quot;b&quot; &#39;c&#39;")).toBe(`<a> "b" 'c'`);
  });
});
