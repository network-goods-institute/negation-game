# Multiplayer Rationale Experiment

## Overview
Real-time collaborative rationale editor powered by Yjs CRDT documents, WebSocket transport, and React Flow for graph visualisation. The experiment lives alongside the core product but is completely isolated in routing, actions, and persistence.

**Scale**: 135 TypeScript files (~15,000 lines) including core UI, hooks, utilities, dedicated tests, and the Yjs WebSocket bridge.

## Files

### App Router Pages (6 files, 1,730 lines)
- `src/app/experiment/layout.tsx` (18) – Feature flag guard and shared layout chrome.
- `src/app/experiment/rationale/page.tsx` (238) – Experiment landing page and navigation entry points.
- `src/app/experiment/rationale/multiplayer/page.tsx` (578) – Board listing, filtering, and entry orchestration.
- `src/app/experiment/rationale/multiplayer/new/page.tsx` (46) – Board creation form.
- `src/app/experiment/rationale/multiplayer/[id]/page.tsx` (811) – Multiplayer board runtime: graph orchestration, tool state, Yjs integration.
- `src/app/experiment/rationale/multiplayer/__tests__/index.page.test.tsx` (39) – Smoke coverage for routing and listing.

### API Routes (9 files, 666 lines)
- `src/app/api/experimental/rationales/route.ts` (38) – Collection GET/POST.
- `src/app/api/experimental/rationales/[id]/route.ts` (142) – Single-board read/update/delete.
- `src/app/api/experimental/rationales/[id]/state/route.ts` (168) – Persisted Yjs state blob endpoints.
- `src/app/api/experimental/rationales/[id]/updates/route.ts` (58) – Incremental Yjs update ingestion.
- `src/app/api/experimental/rationales/[id]/open/route.ts` (72) – Access arbitration.
- `src/app/api/experimental/rationales/__tests__/id.route.get.test.ts` (35) – GET contract tests.
- `src/app/api/experimental/rationales/__tests__/id.route.patch.test.ts` (60) – PATCH behaviour tests.
- `src/app/api/experimental/rationales/__tests__/id.route.delete.test.ts` (60) – DELETE safeguards.
- `src/app/api/experimental/rationales/__tests__/index.route.get.test.ts` (33) – Listing assertions.

### Actions (3 files, 444 lines)
- `src/actions/experimental/rationales.ts` (248) – Server actions wrapping board CRUD, permissions, and locking.
- `src/actions/experimental/fetchMpDocs.ts` (18) – Fetch helper for multiplayer docs.
- `src/actions/experimental/__tests__/rationales.actions.test.ts` (178) – Action contract tests.

### Components (53 files, 5,415 lines)
#### Core surfaces
- `src/components/experiment/multiplayer/GraphCanvas.tsx` (273) – React Flow surface, connect-mode interactions, cursor telemetry.
- `src/components/experiment/multiplayer/GraphContext.tsx` (99) – Action context wiring graph mutators into nodes.
- `src/components/experiment/multiplayer/GraphUpdater.tsx` (20) – Keeps local React Flow state synced with Yjs mutations.
- `src/components/experiment/multiplayer/ToolsBar.tsx` (128) – Tooling switcher, undo/redo controls, read-only affordances.
- `src/components/experiment/multiplayer/MultiplayerHeader.tsx` (181) – Connection health, locking badges, save state indicators.
- `src/components/experiment/multiplayer/ConnectedUsers.tsx` (104) – Presence roster with color badges.
- `src/components/experiment/multiplayer/CursorOverlay.tsx` (56) – Remote pointer rendering.
- `src/components/experiment/multiplayer/CursorReporter.tsx` (47) – Publishes local cursor positions and selections.
- `src/components/experiment/multiplayer/TypeSelectorDropdown.tsx` (101) – New-node type chooser for quick creation.
- `src/components/experiment/multiplayer/ToolbarButton.tsx` (55) – Shared button styling for toolbar controls.
- `src/components/experiment/multiplayer/EditorsBadgeRow.tsx` (21) – Inline editor avatar row.
- `src/components/experiment/multiplayer/OffscreenNeighborPreviews.tsx` (326) – Offscreen node preview rail with scroll positioning.

#### Node components
- `src/components/experiment/multiplayer/PointNode.tsx` (379) – Point nodes with favor scoring, context menus, connect affordances.
- `src/components/experiment/multiplayer/StatementNode.tsx` (187) – Statement/question nodes with editing chrome.
- `src/components/experiment/multiplayer/TitleNode.tsx` (168) – Board title node, hero styling, inline editing.
- `src/components/experiment/multiplayer/GroupNode.tsx` (201) – Layout container with measured sizing and drag affordances.
- `src/components/experiment/multiplayer/objection/ObjectionNode.tsx` (262) – Objection nodes with relevance controls.
- `src/components/experiment/multiplayer/objection/EdgeAnchorNode.tsx` (31) – Virtual nodes anchoring objection edges to parent edges.

#### Edge components
- `src/components/experiment/multiplayer/NegationEdge.tsx` (8) – Negation edge renderer wrapper.
- `src/components/experiment/multiplayer/SupportEdge.tsx` (11) – Support edge styling.
- `src/components/experiment/multiplayer/ObjectionEdge.tsx` (11) – Objection edge styling.
- `src/components/experiment/multiplayer/StatementEdge.tsx` (7) – Statement edge styling.
- `src/components/experiment/multiplayer/OptionEdge.tsx` (7) – Option edge styling.

#### Shared UI utilities & hooks
- `src/components/experiment/multiplayer/common/BaseEdge.tsx` (295) – Shared SVG edge shell, markers, and hit testing.
- `src/components/experiment/multiplayer/common/EdgeConfiguration.ts` (204) – Edge styling constants and behaviour tables.
- `src/components/experiment/multiplayer/common/EdgeInteractionOverlay.tsx` (67) – Edge hover/click hit areas.
- `src/components/experiment/multiplayer/common/EdgeMaskDefs.tsx` (126) – SVG mask definitions for edge highlighting.
- `src/components/experiment/multiplayer/common/EdgeMidpointControl.tsx` (43) – Midpoint drag handles.
- `src/components/experiment/multiplayer/common/EdgeOverlay.tsx` (85) – Edge overlay chrome combining markers, relevance, locks.
- `src/components/experiment/multiplayer/common/EdgeStrapGeometry.tsx` (138) – Advanced geometry helpers for strap curves.
- `src/components/experiment/multiplayer/common/edgeStyle.ts` (19) – Shared CSS class mapping for edges.
- `src/components/experiment/multiplayer/common/ContextMenu.tsx` (74) – Lightweight context menu wrapper.
- `src/components/experiment/multiplayer/common/NodeActionPill.tsx` (60) – Floating node action pill presentation.
- `src/components/experiment/multiplayer/common/SideActionPill.tsx` (66) – Side action pill variant for supports.
- `src/components/experiment/multiplayer/common/NodeShell.tsx` (104) – Structural shell for nodes with shared handles.
- `src/components/experiment/multiplayer/common/useAbsoluteNodePosition.ts` (86) – Computes absolute node bounds for overlays.
- `src/components/experiment/multiplayer/common/useAutoFocusNode.ts` (61) – Autofocus newly created nodes.
- `src/components/experiment/multiplayer/common/useConnectableNode.ts` (54) – Handles connect-mode clicks and flow conversion.
- `src/components/experiment/multiplayer/common/useEdgeAnchorPosition.ts` (28) – Tracks anchor node positions for objections.
- `src/components/experiment/multiplayer/common/useEdgeNodeMasking.ts` (36) – Manages edge/node mask intersections.
- `src/components/experiment/multiplayer/common/useEdgePerformanceOptimization.ts` (78) – Memoises expensive edge calculations.
- `src/components/experiment/multiplayer/common/useEdgeState.ts` (121) – Aggregates edge hover/selection state.
- `src/components/experiment/multiplayer/common/useEditableNode.ts` (384) – Full editing lifecycle management for node content.
- `src/components/experiment/multiplayer/common/useFavorOpacity.ts` (23) – Derives favour shading for point nodes.
- `src/components/experiment/multiplayer/common/useHoverTracking.ts` (67) – Hover intent tracking and timers.
- `src/components/experiment/multiplayer/common/useNeighborEmphasis.ts` (56) – Applies scale transforms to neighbours during focus.
- `src/components/experiment/multiplayer/common/useNodeChrome.ts` (97) – Bundles editing, connecting, and hover chrome for nodes.
- `src/components/experiment/multiplayer/common/usePillVisibility.ts` (56) – Timed visibility controller for action pills.
- `src/components/experiment/multiplayer/common/usePanDetection.ts` (94) - Detects left/middle button drags on the graph canvas to mute cursor broadcasts while panning.

#### Component tests
- `src/components/experiment/multiplayer/__tests__/MultiplayerHeader.status.test.tsx` (62) – Header state matrix coverage.
- `src/components/experiment/multiplayer/common/__tests__/useAbsoluteNodePosition.test.tsx` (51) – Hook geometry tests.
- `src/components/experiment/multiplayer/common/__tests__/useHoverTracking.test.tsx` (45) – Hover timing tests.

### Hooks (24 files, 2,474 lines)
#### Graph and session hooks
- `src/hooks/experiment/multiplayer/useInitialGraph.ts` (48) – Seeds graph state from Yjs snapshots.
- `src/hooks/experiment/multiplayer/useKeyboardShortcuts.ts` (81) – Global hotkey handlers.
- `src/hooks/experiment/multiplayer/useMultiplayerCursors.ts` (95) – Remote cursor subscription.
- `src/hooks/experiment/multiplayer/useMultiplayerEditing.ts` (186) – Editing locks, focus tracking, clipboard flow.
- `src/hooks/experiment/multiplayer/useNodeDragHandlers.ts` (37) – Drag handling wired to locks and Yjs updates.
- `src/hooks/experiment/multiplayer/useUserColor.ts` (15) – Deterministic user colour selection.
- `src/hooks/experiment/multiplayer/useWritableSync.ts` (90) – Replay local graph after regaining write access.
- `src/hooks/experiment/multiplayer/useWriteAccess.ts` (60) – Client arbitration for write locks across sessions.

#### Yjs orchestration hooks
- `src/hooks/experiment/multiplayer/useYjsMultiplayer.ts` (284) – Top-level multiplayer lifecycle: providers, undo manager, save scheduling.
- `src/hooks/experiment/multiplayer/useYjsDocumentHydration.ts` (199) – Bootstraps Yjs doc content into React Flow nodes/edges.
- `src/hooks/experiment/multiplayer/useYjsProviderConnection.ts` (273) – WebSocket provider lifecycle, reconnect logic, awareness wiring.
- `src/hooks/experiment/multiplayer/useYjsSynchronization.ts` (185) – Sync watchdogs, save throttling, and awareness broadcast.
- `src/hooks/experiment/multiplayer/useYjsUndoRedo.ts` (134) – Undo/redo stack wiring with scoped observers.

#### Yjs helpers
- `src/hooks/experiment/multiplayer/yjs/auth.ts` (27) – Token fetch helper for Yjs endpoints.
- `src/hooks/experiment/multiplayer/yjs/edgeSync.ts` (62) – Edge map observers and migration handling.
- `src/hooks/experiment/multiplayer/yjs/nodeSync.ts` (99) – Node observers with migration safeguards.
- `src/hooks/experiment/multiplayer/yjs/saveHandlers.ts` (222) – Debounced save pipelines and error handling.
- `src/hooks/experiment/multiplayer/yjs/sync.ts` (41) – Shared sync constants.
- `src/hooks/experiment/multiplayer/yjs/text.ts` (80) – Text map conversion utilities.
- `src/hooks/experiment/multiplayer/yjs/textSync.ts` (61) – Text node sync observers.
- `src/hooks/experiment/multiplayer/yjs/undo.ts` (30) – Yjs UndoManager scope wiring.

#### Hook tests
- `src/hooks/experiment/multiplayer/yjs/__tests__/mergeNodesWithText.test.ts` (72) – Text/graph merge tests.
- `src/hooks/experiment/multiplayer/yjs/__tests__/seeding.behavior.test.tsx` (52) – Hydration behaviour coverage.
- `src/hooks/experiment/multiplayer/yjs/__tests__/updateNodesFromText.test.ts` (33) – Text update propagation tests.

### Utils (20 files, 2,412 lines)
#### Graph sync utilities
- `src/utils/experiment/multiplayer/graphSync.ts` (337) – React Flow/Yjs change bridging, deterministic IDs.
- `src/utils/experiment/multiplayer/connectUtils.ts` (43) – Edge type selection and deterministic ID helpers.
- `src/utils/experiment/multiplayer/negation.ts` (27) – Negation node helpers.
- `src/utils/experiment/multiplayer/viewport.ts` (24) – Viewport helpers for Offscreen previews.
- `src/utils/experiment/multiplayer/graphOperations.ts` (5) – Barrel for graph operations package.

#### Graph operations
- `src/utils/experiment/multiplayer/graphOperations/nodeCreation.ts` (293) – Node creation flows and defaults.
- `src/utils/experiment/multiplayer/graphOperations/nodeContent.ts` (203) – Content updates, metadata toggles.
- `src/utils/experiment/multiplayer/graphOperations/nodeDeletion/createDeleteNode.ts` (240) – Node deletion with cascading rules.
- `src/utils/experiment/multiplayer/graphOperations/nodeDeletion/createDeleteInversePair.ts` (221) – Inverse pair teardown handler.
- `src/utils/experiment/multiplayer/graphOperations/nodeDeletion/index.ts` (2) – Node deletion exports.
- `src/utils/experiment/multiplayer/graphOperations/shared.ts` (81) – Shared helpers for edge/node mutations.
- `src/utils/experiment/multiplayer/graphOperations/edgeOperations.ts` (155) – Edge creation, update, and deletion logic.
- `src/utils/experiment/multiplayer/graphOperations/inversePair.ts` (430) – Inverse pair orchestration and layout.

#### Utility tests
- `src/utils/experiment/multiplayer/__tests__/connectUtils.test.ts` (31) – Edge helper tests.
- `src/utils/experiment/multiplayer/__tests__/graphOperations.deleteEdgeCascade.test.ts` (67) – Deletion cascade coverage.
- `src/utils/experiment/multiplayer/__tests__/graphOperations.deleteGroupYjs.test.ts` (54) – Yjs-backed group deletion tests.
- `src/utils/experiment/multiplayer/__tests__/graphOperations.objection.test.ts` (65) – Objection flows.
- `src/utils/experiment/multiplayer/__tests__/graphOperations.updateNodeContent.test.ts` (51) – Content update paths.
- `src/utils/experiment/multiplayer/__tests__/graphOperations.updateNodeType.test.ts` (35) – Node type conversions.
- `src/utils/experiment/multiplayer/__tests__/graphSync.onNodesChange.test.ts` (48) – Graph sync change filtering.

### Component Registry (1 file, 37 lines)
- `src/components/experiment/multiplayer/componentRegistry.ts` – Registers node/edge types with React Flow.

### Data (1 file, 118 lines)
- `src/data/experiment/multiplayer/sampleData.ts` – Sample nodes, edges, and demo users for seeding and tests.

### Database (3 files, 70 lines)
- `src/db/tables/mpDocsTable.ts` (13) – Multiplayer doc metadata schema.
- `src/db/tables/mpDocAccessTable.ts` (19) – Access control records.
- `src/db/tables/mpDocUpdatesTable.ts` (38) – Stored Yjs update log.

### Top-Level Multiplayer Tests (15 files, 1,588 lines)
- `src/__tests__/api.yjs.token.test.ts` (56) – Token issuance for Yjs endpoints.
- `src/__tests__/multiplayer.deleteInversePair.test.ts` (123) – Inverse pair deletion regression coverage.
- `src/__tests__/multiplayer.edgeSync.upsertOnly.test.ts` (75) – Edge sync upsert guardrails.
- `src/__tests__/yjs.migration.observe.test.ts` (111) – Node/edge migration observers.
- `src/__tests__/experiment/multiplayer/deleteEdgeEndpoints.test.ts` (107) – REST endpoint deletion flows.
- `src/__tests__/experiment/multiplayer/deleteNode.test.ts` (349) – Node deletion scenarios.
- `src/__tests__/experiment/multiplayer/edgeStyle.test.ts` (34) – Edge styling helpers.
- `src/__tests__/experiment/multiplayer/gating.test.ts` (7) – Feature flag gating.
- `src/__tests__/experiment/multiplayer/negation.inverse-pair.test.ts` (288) – Negation inverse pair handshake.
- `src/__tests__/experiment/multiplayer/negation.test.ts` (33) – Negation basics.
- `src/__tests__/experiment/multiplayer/ObjectionNode.pointlike.test.tsx` (32) – Objection node pointlike behaviour.
- `src/__tests__/experiment/multiplayer/pointlikeUtil.test.ts` (12) – Point utility coverage.
- `src/__tests__/experiment/multiplayer/support.addBelow.test.ts` (189) – Support creation flows.
- `src/__tests__/experiment/multiplayer/sync.e2e.test.ts` (147) – End-to-end sync scenarios.
- `src/__tests__/experiment/multiplayer/viewport.test.ts` (25) – Viewport helper tests.

### External (1 file, 97 lines)
- `yjs-ws/server.js` – Standalone Yjs WebSocket bridge for the experiment cluster.

## Write Access Model
- Exactly one session per user holds `canWrite`; others remain read-only replicas until arbitration grants ownership.
- `useWriteAccess` inspects Yjs awareness to elect the lowest client id per user, mirroring the logic used by the server.
- `useWritableSync` replays the authoritative doc locally before reenabling mutators when a replica regains write privileges.
- `useYjsProviderConnection` and `useYjsSynchronization` coordinate provider attachment, awareness broadcast, throttled saves, and failure handling.
- UI affordances (toolbar, node editing, connect mode) subscribe to `canWrite` so read-only sessions never enqueue mutations and receive explicit warnings when attempting to edit.
 - Anonymous sessions receive an `anon-…` user id via cookies and are eligible for write access only in non‑production environments; in production, authentication is required. Arbitration treats user ids (including `anon-…`) the same wherever anonymous participation is enabled.

## Summary Statistics
- **App Router Pages**: 6 files / 1,730 lines
- **API Routes**: 9 files / 666 lines
- **Components**: 53 files / 5,415 lines
- **Hooks**: 24 files / 2,474 lines
- **Utils**: 20 files / 2,412 lines
- **Actions**: 3 files / 444 lines
- **Database**: 3 files / 70 lines
- **Data**: 1 file / 118 lines
- **Top-Level Multiplayer Tests**: 15 files / 1,588 lines
- **External Bridge**: 1 file / 97 lines

## Feature Flag
Controlled via `NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED`. When disabled, the layout guard prevents entry and hides navigation to multiplayer boards.
