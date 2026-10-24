# The site audit and its rule engine

SEO Tool has one technical audit per client. **Run audit** (quick or full)
crawls the site, runs SEO Tool's own checks, then the rule engine and the
GEO audit, and stores everything in one `audits` row (`kind = "crawler"`).

## What runs

| Step | Code | Gives |
|---|---|---|
| Site crawl and checks | `src/lib/audit.ts` (`runAudit`) | ~72 finding types the agent knows how to fix; quick wins; tasks `audit:*` |
| Rule engine | `src/audit` via `src/lib/audit-engine.ts` and `src/lib/seomator-audit.ts` | 373 rules in 20 weighted categories, score caps, CWV, per-rule history; findings `seomator:<rule id>`; tasks `[P0]`–`[P3]` |
| GEO audit | `src/lib/geo-audit` | GEO composite score and `geo:*` findings |

The engine's rules are SEOmator's (`@seomator/seo-audit`, MIT), ported into
`src/audit` and run in-process. There is no package dependency. See
`src/audit/NOTICE.md` for the licence and what changed in the port.
`src/audit/__tests__/parity.test.ts` checks every rule on every fixture page
against the reference package's output (`seomator-golden.json`).

## Modes

| Mode | Engine | Pages |
|---|---|---|
| `quick` (default) | HTML only, no browser; CWV rules read "not measured" and weigh nothing | up to 8 |
| `full` | Renders each page in the shared browser pool: CWV (LCP, CLS, INP through a synthetic interaction, TTFB, FCP), mobile parity, landing screenshot | up to 20 |

## Score

With the engine, the audit score is its weighted category score: pass 100,
warn 50, fail 0, unmeasured not counted. Caps apply: noindex or blocked by
robots.txt at most 20, empty page 30, thin content 49, no title 69. Without
the engine (it failed to read the site), the audit keeps SEO Tool's own score.

## Dedupe

An engine finding that repeats one of SEO Tool's checks on the same page (or
site-wide on the origin) is dropped, so a problem is listed once and under the
type the agent can fix. The map is `ENGINE_EQUIVALENTS` in
`src/lib/audit-engine.ts`; `audit-engine.test.ts` keeps both sides honest.

## Storage

- `audits.mode`, `audits.score`, `audits.category_scores`, `audits.raw_report`
  (the engine's full result), `audits.progress_json` (live category progress),
  `audits.geo_score`, `audits.geo_envelope_json`
- `audit_issues` with `category`, `fix_steps`, `confidence`
- `audit_rule_history`: one row per rule per audit, behind `/audits/diff`
  (fail → pass fixed, pass → fail regression, warn → fail worsened, new fail)

Exports: `/audits/[id]/export?format=markdown|llm`.

## Safety

Every request the engine makes, including a rendered page's subresources,
goes through the SSRF guard (`src/audit/crawler/net.ts`); private addresses
are refused. Engine runs are serialized because rules share cross-page state
for the length of a run. The agent never acts on `seomator:*` findings: it only
fixes the types it knows (`FIXABLE` in the planner).

Audits stored with `kind = "seomator"` come from the separate SEOmator audit
that existed before; they still display and diff.
