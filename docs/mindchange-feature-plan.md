# Epistemic Leverage (Mindchange) – Implementation Plan

## Goals
- Replace edge relevance stars with bidirectional mindchange values (0–100) that encode how much evidence at one node changes belief in the connected node.
- Support per-user values and aggregated averages shown on edges in real time across collaborators.
- Maintain multiplayer performance and consistency via Yjs without breaking existing flows.

## Scope
- Edge types: `support`, `negation`, `option`, `statement`.
- Excluded: `objection` (unchanged for now).
- UI: EdgeOverlay changes, fixed edge styles (width/opacity not driven by relevance), mindchange editing UX.
- Backend: Drizzle schema for per-user mindchange, server action for set/get, optional API route for non-React clients, Yjs meta sync for real‑time averages.
- Backwards compatibility: keep `data.relevance` read-only/unused.
- Feature flag: `ENABLE_MINDCHANGE` to gate UI and writes.

## Architecture Overview
- Source of truth for per-user mindchange lives in Postgres (`mp_mindchange`).
- On write (setMindchange), persist (upsert) and compute new per-edge aggregated averages (forward/backward). Return to caller.
- Write aggregated snapshot into Yjs `meta` map under key `mindchange:<edgeId>` so all connected clients update live.
- Clients render edge `data.mindchange` purely from Yjs meta snapshot; `userValue` is filled from a lazy fetch or hydrated via a lightweight user cache in UI when editing.

## Data Model (Drizzle)
File: `src/db/tables/mpMindchangeTable.ts`
- Table name: `mp_mindchange`
- Columns:
  - `id`: `serial` primary key
  - `edgeId`: `text` not null
  - `userId`: `text` not null
  - `docId`: `text` not null (matches `mp_docs.id` – the Yjs room/document id)
  - `forwardValue`: `integer` not null check 0–100
  - `backwardValue`: `integer` not null check 0–100
  - `createdAt`: `timestamptz` default now not null
  - `updatedAt`: `timestamptz` default now not null
- Constraints/Indexes:
  - Unique index on (`docId`, `edgeId`, `userId`) for idempotent upserts
  - Index on (`docId`, `edgeId`) to speed aggregation
- Note: Do not create migration here; after schema landed, you run drizzle‑kit generate/migrate.

## Types
File: `src/types/multiplayer.ts`
- Extend Edge data typings (non-breaking) by adding optional:
  - `data.mindchange?: {
      forward: { average: number; count: number };
      backward: { average: number; count: number };
      userValue?: { forward: number; backward: number };
    }`
- Retain `data.relevance` to avoid breaking older payloads; ignore it in rendering when the feature is enabled.

## Server Actions
File: `src/actions/experimental/mindchange.ts`
- `export async function setMindchange(docId: string, edgeId: string, forwardValue?: number, backwardValue?: number): Promise<{ ok: true; averages: { forward: number; backward: number; forwardCount: number; backwardCount: number } }>`
  - Auth: require authenticated user; derive `userId` from session/Privy.
  - Validate 0–100 integers; coerce/clip.
  - Upsert (`docId`,`edgeId`,`userId`) with new values for only the provided direction(s); update `updatedAt`.
  - Compute new averages via `AVG()` and `COUNT()` grouped by `docId`,`edgeId`.
  - Write `{ fwdAvg, bwdAvg, fwdCount, bwdCount }` to Yjs meta key `mindchange:<edgeId>` (see Yjs Sync below).
  - Return averages.
- `export async function getMindchangeBreakdown(docId: string, edgeId: string): Promise<{ forward: Array<{ userId: string; username: string; value: number }>; backward: Array<{ userId: string; username: string; value: number }> }>`
  - Query all rows for the pair; join usernames.
- Prefer calling the action from client components via Next.js Actions; gate by `ENABLE_MINDCHANGE`.

## Optional API Route
Skipped for now. Server Actions are sufficient.

## Yjs Synchronization
Files:
- `src/hooks/experiment/multiplayer/yjs/edgeSync.ts`: ensure `edge.data.mindchange` can be updated in memory; no persistence to Yjs edges.
- `src/hooks/experiment/multiplayer/yjs/textSync.ts`: unchanged.
- `src/hooks/experiment/multiplayer/useYjsSynchronization.ts` and `.../yjs/nodeSync.ts`:
  - Observe `yMetaMap` for changes on keys prefixed `mindchange:`.
  - On update, patch the local React state `edges` to set `edge.data.mindchange.forward/backward.average/count` accordingly. Do not store `userValue` here.
- Emission:
  - `setMindchange` writes `{ forwardAvg, backwardAvg, forwardCount, backwardCount }` to `yMetaMap.set('mindchange:<edgeId>', { ... })` within a Yjs transaction, origin `RUNTIME`/server. All peers then update.

## Graph Context
File: `src/components/experiment/multiplayer/GraphContext.tsx`
- Add:
  - `setMindchange?: (edgeId: string, forward: number, backward: number) => Promise<void>`
  - `getMindchangeBreakdown?: (edgeId: string) => Promise<{ forward: { userId: string; username: string; value: number }[]; backward: { userId: string; username: string; value: number }[] }>`
- Wire these in `page.tsx` from server actions, guarded by `ENABLE_MINDCHANGE`.

## Edge Overlay UI
File: `src/components/experiment/multiplayer/common/EdgeOverlay.tsx`
- Remove star controls and `onUpdateRelevance` usage (behind feature flag).
- Add center "Mindchange" button between edge-type toggle and Mitigate.
- Two summary circles (always show on hover/selection):
  - Right circle: Forward (source → target) average and count.
  - Left circle: Backward (target → source) average and count.
  - Tooltip shows breakdown with usernames and integer values.
- Single-direction editing with slider:
  - Clicking a summary circle opens a slider for that circle’s direction only (0–100, integers).
  - Alternatively, clicking Mindchange defaults to editing Forward (source → target).
  - Save → calls `setMindchange` with only the edited direction; the other direction remains unchanged.
  - Cancel → closes slider without changes.
- Directionality for diagonal/horizontal edges:
  - Keep topology-based meaning (right = source→target, left = target→source) regardless of geometry.
  - Add small arrow glyphs on each circle to reinforce direction.

## Edge Visuals
Files: `EdgeConfiguration.ts`, `BaseEdge.tsx`, `useEdgeState.ts`
- EdgeConfiguration: change `strokeWidth` to fixed `2` for all types except `objection`. Keep colors/curvature as-is.
- BaseEdge:
  - Remove relevance-driven stroke width and opacity usage.
  - Use fixed opacity: `selected || hovered ? 1 : 0.7`.
- useEdgeState:
  - Remove `relevance` derived opacity; compute from hover/selection only.
  - Keep `relevance` field parsing to preserve compatibility, but unused when feature enabled.

## State/Updates Endpoints
Files: `src/app/api/experimental/rationales/[id]/state.ts`, `/updates` (existing)
- Include mindchange aggregated data by relying on Yjs meta entries at serialization time (do not denormalize Yjs edges). If endpoints already serialize edges from Yjs directly, ensure clients still bootstrap using Yjs meta after connection.

## Feature Flag
- Add build/runtime env flag:
  - Server: `process.env.ENABLE_MINDCHANGE === 'true'`
  - Client: `process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE === 'true'`
- Gate UI surfaces and writes accordingly.

## Validation & Security
- Values clipped to 0–100; accept only integers (or round floats).
- Auth required for writes; associate with `userId` from session/Privy.
- Unique constraint prevents duplicate rows per user-edge-doc.
- Do not expose raw user identifiers in breakdown unless allowed; consider anonymized view if privacy required.

## Performance
- Aggregations per write use indexed (`docId`,`edgeId`) group agg; these are small per edge.
- Yjs meta publishes small JSON blobs keyed by edgeId; clients update in O(1) per change.
- UI avoids re-render storms: only patch the changed edge in ReactFlow state.

## Tests (Jest)
- Actions:
  - `setMindchange` upserts row and returns correct averages after multiple users.
  - `getMindchangeBreakdown` returns per-user lists.
- Yjs sync:
  - Writing to `yMetaMap` for an edge updates the corresponding `edges[i].data.mindchange.average` in local state.
  - Multiple updates coalesce correctly.
- EdgeOverlay:
  - Renders averages and toggles single-direction slider; Save calls action with clipped integer; Cancel restores.
  - Tooltip shows breakdown list with usernames.
- Edge visuals:
  - Stroke width is fixed; opacity follows hover/selection and ignores relevance.
- Feature flag:
  - When disabled, old stars render and writes are blocked; when enabled, stars hidden and mindchange UI active.

## Rollout & Migration
- Backward-compatible: leave `data.relevance` untouched; rendering ignores when `ENABLE_MINDCHANGE`.
- Default `mindchange` absent on existing edges until first Yjs meta write; UI should display `—` or `0%` averages gracefully.
- After schema PR lands, you run:
  - `drizzle-kit generate`
  - `drizzle-kit migrate`
- Gradual rollout: enable flag for internal spaces first; monitor DB writes and Yjs meta churn.

## Decisions (Confirmed)
1. Direction editing: Single input; implicit direction is the circle clicked or default Forward (source→target) when using the main button.
2. Breakdown shows usernames.
3. Values are integers 0–100.
4. Averages are simple arithmetic means.
5. No API route initially; Server Actions are sufficient.
6. Feature flags: `ENABLE_MINDCHANGE` / `NEXT_PUBLIC_ENABLE_MINDCHANGE`.
7. Breakdown ordering: not specified; default to value‑descending.
8. Inputs are sliders with integer steps.

## Phased Delivery
1. Schema + types + feature flag scaffolding (no UI yet)
2. Server actions + Yjs meta publishing + sync listeners
3. Edge visuals (fixed width/opacity) behind flag
4. EdgeOverlay editing + breakdown tooltips
5. Tests + polish + rollout config

---
If you confirm the answers to Open Questions, I’ll proceed with the implementation in small, reviewable PR-sized patches.
