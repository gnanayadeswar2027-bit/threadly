> Superseded scope, 2026-10-15: user requested X only. Hacker News discovery, Reddit capture and other platform options have been removed from the active app. Apify `apidojo/twitter-scraper-lite` is connected locally using a server-only token. Live “customer onboarding” search returned 10 X posts and the browser flow persisted 10 deduplicated X sources in Radar. Original links and observed metrics are retained; buying intent stays unassessed. No deployment performed. The older plan below is historical context.

---
title: Real conversation discovery
date: 2026-10-15
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

## Goal Capsule

**Objective:** A founder can enter the customer problem their company solves, inspect current public discussions that actually mention it, and save a sourced conversation for a later human-written response.

**Means:** Extend the existing Hacker News Search API integration from title search to comment search with local evidence checks, while retaining story search as a secondary mode (KTD1).

**Authority:** User instructions in this conversation govern scope. The app must never imply that a keyword match proves buying intent. The founder remains responsible for reading and approving any response.

**Stop condition:** Do not substitute fabricated results, scrape gated platforms, or publish a response automatically. Do not deploy to Vercel as part of implementation; the pull request is the delivery artifact.

## Product Contract

### Summary

Make Discover a focused, testable loop: company context and customer problem → live public comments → exact source inspection → save to Radar → optional draft.

### Problem Frame

The current app has a polished interface and a live Hacker News title search, but a title often says little about the underlying buyer problem. A founder needs to see the actual words a person wrote before deciding whether a conversation is worth joining. Company name alone is not reliable evidence of what customers need.

### Requirements

- **R1.** Discover accepts company/product name, target customer, and a customer problem. The problem drives search; the other fields are saved as workspace context.
- **R2.** Live search returns public Hacker News comments containing the problem terms close together in order, with author, date, context title, excerpt, and original URL. Obvious hiring-board threads and scattered-keyword matches are excluded.
- **R3.** The UI presents a list and detail view. It labels source data and retrieval time, and marks buying intent unknown. Empty or failed search never becomes sample data.
- **R4.** A founder can save a selected comment to Radar. The server verifies its ID and content with the official Hacker News item API before storing it for the current workspace. The action is idempotent.
- **R5.** Story-title search remains available for broader topic exploration. X and Reddit are not represented as connected live sources without approved access.

### Key Flow

Founder opens Discover, enters a concrete problem, searches customer comments, reads a matched excerpt and the original Hacker News item, saves one discussion to Radar, then may draft a response for approval.

### Acceptance Examples

- Enter “customer onboarding”: results, if any, show a nearby phrase in a real comment, with an original item link and an “Unknown” buying-intent label.
- A hiring-board comment or a comment with the two words far apart does not appear as a match.
- Saving a comment twice leaves one Radar opportunity. A deleted or invalid Hacker News item is rejected.
- A provider outage shows an error; a legitimate zero-match search shows an empty state.

### Scope Boundaries

This does not infer a company’s product solely from its name, score leads, identify verified buyers, fetch Reddit content, connect X without credentials, or post on the founder’s behalf.

## Planning Contract

### Key Technical Decisions

- **KTD1. Public comment search.** Use the documented Hacker News Search API comment tag and comment-text search attribute. This source works without user-supplied credentials and provides original item IDs.
- **KTD2. Evidence before persistence.** Display server-returned plain text without interpreting it as intent; on save, refetch the item from the official Hacker News API. This separates search-index discovery from authoritative persistence.
- **KTD3. Precision limit.** Require ordered terms within a short span and omit obvious hiring threads. This is a conservative lexical filter, not semantic qualification; the UI must state that limitation.

### Assumptions

- Hacker News is the first useful live source for a working model, not the final source mix.
- A phrase entered by the founder is more trustworthy than a query inferred from company name.
- No external service credential is available for live X or commercial Reddit access.

### Sequencing

Complete the source contract and save verification before polishing the Discover interaction. Verify the entire flow with a live public API response and local app checks.

## Implementation Units

### U1. Search matching comments

**Goal:** Return genuine comment matches with original links and evidence snippets.

**Requirements:** R2, R3, R5.

**Files:** `lib/hn-discovery.ts`, `app/api/discovery/hn/route.ts`, `tests/hn-discovery.test.ts`.

**Approach:** Extend the existing search contract with a comment mode; normalize HTML to plain text; filter job threads and loose word matches; cap returned records.

**Test scenarios:** Exact phrase; HTML excerpt; scattered words rejected; hiring thread rejected; malformed provider response and outage distinguished from zero hits.

**Verification:** `npm test`, `npm run typecheck`, and one live public search.

### U2. Save verified comments

**Goal:** Persist a selected comment as a workspace-scoped Radar opportunity.

**Requirements:** R4.

**Files:** `lib/data.ts`, `tests/data.test.ts`.

**Approach:** Reuse the existing Hacker News save action and verify comment type/text through the official item API before insert.

**Test scenarios:** Comment saves with original item URL and body; repeated save is idempotent; invalid/deleted item is rejected; another workspace cannot see it.

**Verification:** `npm test`.

### U3. Make the journey visible

**Goal:** Let a founder enter context, search, inspect evidence, and save from one focused screen.

**Requirements:** R1, R3, R5.

**Files:** `components/HnDiscovery.tsx`, `components/Workspace.tsx`, `app/globals.css`, `README.md`.

**Approach:** Keep the existing Threadly app shell, use a focused form and list/detail layout, and distinguish comment matches from verified sales intent.

**Test scenarios:** Context persists; search shows live matches and source URLs; selecting a row changes the detail; save updates Radar; narrow viewport remains usable.

**Verification:** `npm run typecheck`, `npm run build`, and local browser checks at desktop and mobile widths.

## Verification Contract

Run `npm test`, then `npm run typecheck` and `npm run build` sequentially because Next build regenerates `.next/types`. Test a real public comment search, inspect one original link, save one result in the local app, and check desktop and mobile layout. Provider failures must remain visible failures.

## Definition of Done

The founder can complete the key flow against real public data. The UI and README state what is and is not verified. Tests and production build pass. No abandoned experimental code or unrelated staged changes enter the delivery commit.
