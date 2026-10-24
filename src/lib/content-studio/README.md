# Content studio

Ported from [BlogPilot AI](https://github.com/IamRamgarhia/BlogPilot-Open-Source-AI-SEO-Content-Studio)
v1.2.0 (commit `5f65170`), by the same author as this app, under the MIT
licence kept in `LICENSE-BlogPilot`.

What came over unchanged in logic: `seo/` (outline, writer, content score,
brand voice, social, newsletter, PAA, topic authority, refresher, …),
`exports/` (WordPress, Ghost, Webflow, Hugo) and the 45 `methodologies/`.

What was swapped for this app's own:

| BlogPilot | Here |
|---|---|
| `lib/ai/*` provider registry and failover | `ai.ts` → `callAIResult` (Settings → AI keys, spend cap, usage log) |
| `lib/net/ssrf-guard`, `lib/crawler/*` | `fetch.ts` → `guardedFetch`, `renderAndCapture` |
| Methodologies read from disk with gray-matter | `methodologies.generated.ts` (`pnpm gen:methodologies`) |
| Its own `clients`, `posts`, `keyword_research` tables | `clients.content_style_profile`, `content_posts`, `content_keyword_research` (`store.ts`) |

Not ported, because this app already does it: the technical audit and
crawler, rank tracking, GSC / GA4 imports, cannibalization.
