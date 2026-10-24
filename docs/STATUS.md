# BenefitGuard — Status & Open Discussion

_Last updated: 2026-10-22_

## What the app is
BenefitGuard checks whether a benefits message (text, email, letter or website) is consistent with official government information. It currently covers Medi-Cal.

- Stack: Next.js 16.4.2, React 19, Tailwind 4, Zod 4.
- Run with `npm run dev`, then open http://localhost:3000.
- `AGENTS.md` warns that this Next.js version has breaking changes. Read `node_modules/next/dist/docs/` before writing Next.js code.

## Current state
The git repo has no commits yet; all work is uncommitted.

### Existed before
- **Engine:** `src/lib/engine/` has the normalizer, claim extractor, URL analyzer, knowledge matcher, `verify.ts` and `ai-provider.ts`. The AI provider is deterministic only; the LLM option is a stub.
- **API:** `POST /api/verify` and `GET /api/samples`.
- **Data:** `data/official-sources.json`, `data/known-domains.json` and `data/sample-messages.json` (6 fictional samples).
- **UI pieces:** `src/lib/i18n.ts` (English and Spanish strings), `Header`, `LanguageProvider`.

### Built
- **Pages:** Home (`src/app/page.tsx`), `/check`, `/learn` and `/resources`.
- **Check page:** a form, a sample-message dropdown, and a results view (`src/components/VerificationResults.tsx`).
- **Screenshot input on `/check`:** upload, drag-and-drop or paste. Text is read in the browser with `tesseract.js`, so images are never uploaded.
- **Layout:** the root layout wraps pages in `LanguageProvider`, `Header` and `Footer`.
- **Fix:** `src/app/api/verify/route.ts` used `error.errors`, which doesn't exist in Zod 4. It now uses `.issues`.
- **Grounding code (not yet wired to anything):**
  - `data/source-allowlist.json` lists 3 exact pages.
  - `src/lib/grounding/` matches URLs against the allowlist and fetches safely: HTTPS only, every redirect re-checked against the list, plus timeout and size limits.
  - `scripts/refresh-snapshots.ts` (`npm run snapshots:refresh`) fetches the listed pages.
  - Every fetch failed (see the DHCS blocker below), so `data/snapshots/` is empty.

### What has been checked
- Typecheck and lint are clean. The only lint output is 2 unused-variable warnings in the engine files, which predate this work.
- Tested in the browser:
  - the home page;
  - `/check`, from submitting a sample message to the results view;
  - reading text from a pasted screenshot;
  - `/learn`.
- `/resources` was checked only from its returned HTML.
- Not tested: Spanish results, the file picker, and drag-and-drop.
- The `/resources` "no match" message is hardcoded in English.

## Implementation plan status
| Phase | Status |
|---|---|
| 1. Setup & UI | Mostly done. Results is a view inside `/check`, not its own page. Mobile layout not audited. |
| 2. Knowledge base | Mostly done. Sources record verification dates, but nothing flags stale ones. |
| 3. Verification engine | Done (predates this work; not reviewed). |
| 4. API & results | Done. |
| 5. Tests | Not started. The 6 sample messages exist, but there is no Vitest, React Testing Library or Playwright. |
| 6. Accessibility & security | Partial. Rate limiting is only a comment; no audits yet. |
| 7. Docs & deploy | Not started. The README is boilerplate and there is no `.env.example`. |

Phases 5–7 are postponed until after the ML layer.

## Current discussion: adding an ML layer to detect scams

### Design principles (agreed)
- The rule engine and reviewed policy rules make the final decision. An LLM or classifier only advises.
- An LLM may raise severity but never lower a rule-based finding.
- Every finding must cite a source `id` that exists in the knowledge base.
- With no evidence, the result is "insufficient information", never "safe".
- User messages and fetched pages are untrusted input, never instructions.
- If the LLM fails, the app falls back to rules only.

### Options considered
- **LLM grounded on the knowledge base (preferred):** it extracts claims and explains the result; it does not decide the verdict.
- **Trained classifier:** useful only as an extra signal; limited by the lack of suitable training data.
- **Self-hosted model (Ollama with Hugging Face weights):** keeps message text private. It can't run on Vercel or other serverless hosts, so it needs its own server. Small models are weaker in Spanish and at following a strict output format.
- **Pasted RAG proposal:** I agreed with its architecture and safety rules, but not with:
  - OpenAI File Search, because it sends message text to a third party;
  - vector search, which is unnecessary for about 6 sources;
  - adding Python, FastAPI and PostgreSQL at this stage.

### Datasets
These were found through web search and mirror sites, not checked on Kaggle itself. Verify licenses and labels there first.

| Dataset | Size | Labels / limits |
|---|---|---|
| SMS Spam Collection | ~5.5k SMS | spam vs. ham only |
| Smishing-4C | not stated | 4 fraud types |
| Phishing Email Dataset (Kaggle) | ~82k emails | mostly older corpora |
| PhiUSIIL | ~235k URLs | phishing vs. legitimate URLs |
| SpaPhish (Mendeley) | 1,395 emails | Spanish |

None of them covers U.S. benefits scams, and public Spanish SMS data is scarce. The plan is to build our own synthetic benefits dataset and use the public sets only as extra training material.

## Open problem: DHCS pages can't be fetched
- `dhcs.ca.gov` shows an "I am not a robot" captcha to scripted requests.
- `medicaid.gov`, `hhs.gov` and `ssa.gov` return 403. `benefitscal.com` also returned 403.
- `coveredca.com`, `ca.gov`, `cms.gov` and `healthcare.gov` can be fetched with a plain request.
- **Decision:** do not bypass captchas or bot protection. That rules out headless browsers, spoofed headers and services that sell bypassing.
- **Rejected:** manual snapshot import.
- **Still open:**
  - a page-reader API (Jina Reader, Firecrawl, Tavily); untested whether any of them can read DHCS;
  - asking DHCS for access.
- DHCS is set aside for later.
- The CMS page cited in `official-sources.json` could not be fetched. Check that the URL is still correct.

## Proposed next steps
1. Build a synthetic benefits-scam dataset (scam, legitimate and ambiguous messages, in English and Spanish) and an evaluation harness that compares rules only against rules plus an ML layer.
2. Add an LLM provider interface (Ollama or a hosted model) with output validated by Zod. Ground it on the sites that can be fetched, and keep the DHCS rules as curated entries with a "needs review" flag.
3. Then complete Phases 5–7.

## Open questions
- Can message text be sent to a third-party LLM, or must the model be self-hosted?
- Which provider, and what budget?
- Which sites should be added to the allowlist?
