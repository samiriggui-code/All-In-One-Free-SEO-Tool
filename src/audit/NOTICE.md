# Audit engine: third-party notice

The rule catalogue, crawler, scoring model and score caps in `src/audit` are
ported from [@seomator/seo-audit](https://www.npmjs.com/package/@seomator/seo-audit)
7.0.0. The port is checked against that release by
`src/audit/__tests__/parity.test.ts`.

What changed in the port:

- every network request goes through SEO Tool's SSRF guard (`src/audit/crawler/net.ts`);
- browser rendering runs on SEO Tool's shared browser pool (`src/lib/browser-pool.ts`);
- types are SEO Tool's own (`src/audit/types`), and there is no runtime dependency on the package.

The original license follows.

---

MIT License

Copyright (c) 2024-present SEOmator

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
