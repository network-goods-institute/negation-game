# Multiplayer Rationale Experiment

**Last updated**: 2025-12-20

## Overview
Real-time collaborative rationale editor with prediction markets, powered by Yjs CRDT documents, WebSocket transport, and React Flow for graph visualisation. The experiment includes advanced argumentation tools, market overlays, and comprehensive notification systems.

**Scale**: 309 TypeScript files (~42,637 lines) across app routes, API routes, actions, components, hooks, utils, queries/mutations, and tests, plus the Yjs WebSocket bridge (214 lines, JS).

## Files

### App Router Pages (7 files, 995 lines)
- `src/app/experiment/layout.tsx` - Feature flag guard with enforced light theme.
- `src/app/experiment/rationale/multiplayer/page.tsx` – Board listing, filtering, and entry orchestration.
- `src/app/experiment/rationale/multiplayer/[id]/page.tsx` – Main multiplayer board runtime: graph orchestration, market integration, Yjs sync.
- `src/app/experiment/rationale/multiplayer/[id]/layout.tsx` - Metadata wrapper for board routes.
- `src/app/experiment/rationale/profile/page.tsx` - Redirects to the legacy profile route.
- `src/app/experiment/multiplayer/__tests__/BoardAccessPage.test.tsx` – Board access testing.
- `src/app/experiment/rationale/multiplayer/__tests__/index.page.test.tsx` – Smoke coverage for routing and listing.

### API Routes (12 files, 1,199 lines)
- `src/app/api/experimental/rationales/route.ts` – Collection GET/POST for board management.
- `src/app/api/experimental/rationales/[id]/route.ts` – Single-board read/update/delete operations.
- `src/app/api/experimental/rationales/[id]/state/route.ts` – Persisted Yjs state blob management.
- `src/app/api/experimental/rationales/[id]/updates/route.ts` – Incremental Yjs update ingestion.
- `src/app/api/experimental/rationales/[id]/open/route.ts` – Access control and permissions.
- `src/app/api/experimental/rationales/__tests__/id.route.delete.test.ts` – DELETE contract tests.
- `src/app/api/experimental/rationales/__tests__/id.route.get.test.ts` – GET contract tests.
- `src/app/api/experimental/rationales/__tests__/id.route.patch.test.ts` – PATCH behavior tests.
- `src/app/api/experimental/rationales/__tests__/index.route.get.test.ts` – Listing assertions.
- `src/app/api/experimental/rationales/__tests__/state.route.auth.test.ts` – State endpoint auth tests.
- `src/app/api/experimental/rationales/__tests__/updates.route.auth.test.ts` – Updates endpoint auth tests.
- `src/app/api/experimental/rationales/__tests__/updates.route.post.test.ts` – Updates POST contract tests.

### Actions (4 files, 1,661 lines)
- `src/actions/experimental/rationales.ts` - Server actions for board CRUD, permissions, and locking.
- `src/actions/experimental/rationaleAccess.ts` - Board access control and permission management.
- `src/actions/experimental/fetchMpDocs.ts` - Fetch helper for multiplayer documents.
- `src/actions/experimental/__tests__/rationales.actions.test.ts` - Action contract tests.

### Queries (2 files, 311 lines)
- `src/queries/experiment/multiplayer/useMultiplayerNotifications.ts` - Notification query and aggregation helpers.
- `src/queries/experiment/multiplayer/__tests__/useMultiplayerNotifications.transform.test.ts` - Query aggregation tests.

### Mutations (1 file, 31 lines)
- `src/mutations/experiment/multiplayer/useMarkMultiplayerNotificationsRead.ts` - Notification read-state mutations.

### Components (139 files, 20,499 lines)

#### Core Surfaces (32 files)
- `GraphCanvas.tsx` – React Flow surface with connect-mode interactions and cursor telemetry.
- `GraphContext.tsx` – Action context wiring graph mutators into nodes and edges.
- `GraphUpdater.tsx` – Keeps local React Flow state synced with Yjs mutations.
- `MultiplayerBoardContent.tsx` – Main board container with market integration.
- `MultiplayerHeader.tsx` – Connection health, locking badges, save indicators, market controls.
- `ConnectedUsers.tsx` – Presence roster with color badges and user status.
- `CursorOverlay.tsx`, `CursorReporter.tsx` – Remote cursor rendering and position publishing.
- `ToolsBar.tsx` – Tooling switcher, undo/redo controls, market mode toggles.
- `TypeSelectorDropdown.tsx` – New-node type chooser with market-aware options.
- `ShareBoardDialog.tsx` – Board sharing and permission management.
- `BoardLoading.tsx`, `BoardNotFound.tsx` – Loading and error states.
- `MarketModeControls.tsx` - Market feature toggles and controls.
- `MiniHoverStats.tsx` - Hover statistics for market data.
- `NodePriceOverlay.tsx` - Market overlays for node price context.
- `SnapLines.tsx` - Visual guides for node/edge alignment.
- `UndoHintOverlay.tsx` - Contextual undo/redo hints.
- `PerformanceContext.tsx` - Performance monitoring and optimization context.

#### Node Components (5 files)
- `PointNode.tsx` - Point nodes with favor scoring, market overlays, context menus.
- `StatementNode.tsx` - Statement/question nodes with rich editing capabilities.
- `CommentNode.tsx` - Comment nodes for discussion threads.
- `objection/ObjectionNode.tsx` - Objection nodes with relevance controls and anchoring.
- `objection/EdgeAnchorNode.tsx` - Virtual nodes for objection edge positioning.

#### Edge Components (5 files)
- `NegationEdge.tsx`, `SupportEdge.tsx`, `ObjectionEdge.tsx` - Core argumentation edges.
- `CommentEdge.tsx`, `OptionEdge.tsx` - Additional relationship types.

#### Common/Shared System (58 files)

**Edge System (22 files):**
- `BaseEdge.tsx` – Shared SVG edge shell with markers and hit testing.
- `EdgeConfiguration.ts` – Edge styling constants and behavior tables.
- `EdgeInteractionOverlay.tsx`, `EdgeOverlay.tsx` – Edge interaction and overlay management.
- `EdgeMaskDefs.tsx`, `EdgeStrapGeometry.tsx` – Advanced edge geometry and masking.
- `EdgeMidpointControl.tsx` – Midpoint drag handles for edge manipulation.
- `EdgeTypeToggle.tsx`, `MainEdgeRenderer.tsx` – Edge type management and rendering.
- `EdgeVoting.tsx`, `edgeVotes.ts` – Edge-based voting and interaction system.

**Node System (14 files):**
- `NodeShell.tsx` – Structural shell for nodes with shared interaction handles.
- `NodeActionPill.tsx`, `SideActionPill.tsx` – Floating action interfaces for nodes.
- `NodeWithMarket.tsx`, `NodeVoting.tsx` – Market-integrated node behaviors.
- `useEditableNode.ts` – Full editing lifecycle management for node content.
- `useNodeChrome.ts`, `usePillVisibility.ts` – Node UI state management.
- `useAbsoluteNodePosition.ts`, `useNeighborEmphasis.ts` – Node positioning and emphasis.

**Interaction & Performance (15 files):**
- `useHoverTracking.ts`, `usePanDetection.ts` – User interaction detection.
- `useContextMenuHandler.ts`, `ContextMenu.tsx` – Context menu system.
- `useCursorState.ts`, `useSelectionPayload.ts` – Selection and cursor management.
- `useAutoFocusNode.ts`, `useForceHidePills.ts` – UI state optimizations.

#### Market Subsystem (16 files)
- `market/MarketPanel/` – Complete trading interface with charts and controls.
- `market/MarketPriceOverlays.tsx` – Price visualization overlays.
- `market/MarketSidePanel.tsx` – Market data sidebar.
- `market/QuickBuyActions.tsx` – Fast trading actions.
- `market/InlineBuyControls.tsx`, `InlinePriceHistory.tsx` - Inline market controls.
- `market/MarketErrorBoundary.tsx` - Market system error handling.
- `EdgePriceOverlay.tsx` - Market price overlays for edges.

#### Notification System (6 files)
- `notifications/NotificationsPanel.tsx`, `NotificationsSidebar.tsx` - Notification interfaces.
- `notifications/NotificationsPanelTrigger.tsx` - Notification triggers.
- `notifications/types.ts` - Notification type definitions.
- `notifications/__tests__/NotificationsPanel.test.tsx`, `NotificationsSidebar.test.tsx` - Notification UI tests.

#### Component Tests (41 files)
- Header, board, and market component test suites.
- Hook integration tests for UI components.
- Edge and node interaction test coverage.

### Hooks (69 files, 10,505 lines)

#### Yjs Integration (5 files)
- `useYjsMultiplayer.ts` – Top-level multiplayer lifecycle: providers, undo manager, save scheduling.
- `useYjsDocumentHydration.ts` – Bootstraps Yjs document content into React Flow nodes/edges.
- `useYjsProviderConnection.ts` – WebSocket provider lifecycle, reconnect logic, awareness wiring.
- `useYjsSynchronization.ts` – Sync watchdogs, save throttling, and awareness broadcast.
- `useYjsUndoRedo.ts` – Undo/redo stack wiring with scoped observers.

#### Graph Operations (12 files)
- `useGraphOperations.ts` – Core graph mutation operations.
- `useGraphContextMenu.ts` – Context menu handling for graph elements.
- `useGraphKeyboardHandlers.ts` – Global keyboard shortcuts for graph interactions.
- `useGraphNodeHandlers.ts` – Node interaction handlers (drag, select, edit).
- `useGraphWheelHandler.ts` – Mouse wheel and zoom handling.
- `useConnectionMode.ts` – Edge creation and connection mode management.
- `useConnectionHandlers.ts` – Connection initiation and completion logic.
- `useConnectionSnapping.ts` – Visual snapping guides for connections.
- `useEdgeSelection.ts` – Edge selection state management.
- `useEdgeTypeManager.ts` – Dynamic edge type switching and management.
- `handlers/dragHandlers.ts`, `handlers/dragStopHandlers.ts` – Specialized drag handling.

#### UI State Management (20+ files)
- `useMultiplayerCursors.ts` – Remote cursor subscription and rendering.
- `useMultiplayerEditing.ts` – Editing locks, focus tracking, clipboard flow.
- `useMultiplayerTitle.ts` – Board title synchronization.
- `useWriteAccess.ts` – Client arbitration for write locks across sessions.
- `useWritableSync.ts` – Replay local graph after regaining write access.
- `useModeState.ts` – Global editor mode state (edit, connect, select).
- `useTabIdentifier.ts` – Browser tab identification for session management.
- `useAnonymousId.ts` – Anonymous user session management.
- `useAuthSetup.ts` – Authentication integration for multiplayer sessions.
- `useBoardResolution.ts` – Board loading and resolution logic.
- `useUserColor.ts` – Deterministic user color selection.
- `useInitialGraph.ts` – Seeds graph state from Yjs snapshots.

#### Interaction & Performance (15+ files)
- `useHoverTracking.ts` – Hover intent tracking and timers.
- `usePanDetection.ts` – Canvas panning detection and cursor muting.
- `useKeyboardPanning.ts` – Keyboard-based canvas navigation.
- `useNodeDragHandlers.ts`, `useNodeDragSnapping.ts` – Node drag operations with snapping.
- `useNodeHelpers.ts` – Node utility functions and helpers.
- `connectionGrace.ts` – Connection grace period management.
- `lockUtils.ts` – Locking utilities for session management.

#### Yjs Infrastructure (8 files)
- `yjs/auth.ts` – Token fetch helper for Yjs endpoints.
- `yjs/edgeSync.ts` – Edge map observers and migration handling.
- `yjs/nodeSync.ts` – Node observers with migration safeguards.
- `yjs/saveHandlers.ts` – Debounced save pipelines and error handling.
- `yjs/sync.ts` – Shared sync constants and utilities.
- `yjs/text.ts`, `yjs/textSync.ts` – Text content synchronization.
- `yjs/origins.ts` – Yjs operation origin tracking.

#### Hook Tests (25+ files)
- Yjs synchronization and migration tests.
- Graph operation behavior tests.
- UI interaction and state management tests.
- Authentication and session management tests.

### Utils (35 files, 3,387 lines)

#### Graph Operations System (10 files)
- `graphOperations.ts` – Main barrel export for graph operations.
- `graphOperations/nodeCreation.ts` – Node creation flows, defaults, and validation.
- `graphOperations/nodeContent.ts` – Content updates, metadata toggles, and rich text handling.
- `graphOperations/nodeDeletion/` – Node deletion with cascading rules and cleanup.
- `graphOperations/nodeDuplication.ts` – Node cloning with relationship preservation.
- `graphOperations/edgeOperations.ts` – Edge creation, update, deletion, and relationship management.
- `graphOperations/shared.ts` – Shared helpers for edge/node mutations and utilities.

#### Core Graph Utilities (8 files)
- `graphSync.ts` – React Flow/Yjs change bridging with deterministic ID management.
- `connectUtils.ts` – Edge type selection and connection validation helpers.
- `edgePathUtils.ts` – Advanced edge path calculations and geometry.
- `bezierSplit.ts` – Bézier curve splitting for smooth edge rendering.
- `negation.ts` – Negation node and relationship helpers.
- `nodeUtils.ts` – General node manipulation utilities.
- `viewport.ts` – Viewport calculations and offscreen element management.
- `creatorStamp.ts` – User attribution and creation timestamp tracking.

#### Notification & Communication (2 files)
- `notificationRouting.ts` – Notification delivery and routing logic.
- `notificationVotes.ts` – Vote aggregation and notification triggers.

#### Utility Tests (15+ files)
- Graph operation behavior tests (creation, deletion, updates).
- Edge and node manipulation test suites.
- Synchronization and ID generation tests.
- Notification routing and aggregation tests.

### Component Registry (1 file, 33 lines)
- `src/components/experiment/multiplayer/componentRegistry.ts` - Registers node/edge types with React Flow.

### Data (1 file, 115 lines)
- `src/data/experiment/multiplayer/sampleData.ts` - Sample nodes, edges, and demo users for seeding and tests.

### Database Tables (8 files)
- `mpDocsTable.ts` – Multiplayer document metadata and settings.
- `mpDocAccessTable.ts` – User access control and permission records.
- `mpDocPermissionsTable.ts` – Granular permission management.
- `mpDocShareLinksTable.ts` – Shareable link generation and management.
- `mpDocUpdatesTable.ts` – Stored Yjs update log for synchronization.
- `mpNotificationsTable.ts` – Notification storage and delivery tracking.
- `notificationPreferencesTable.ts` – User notification preferences.
- `notificationsTable.ts` – General notification system storage.

### Top-Level Multiplayer Tests (40 files, 4,049 lines)
- `src/__tests__/api.yjs.token.test.ts` - Token issuance for Yjs endpoints.
- `src/__tests__/hooks/useYjsUndoRedo.test.ts` - Undo/redo hook coverage.
- `src/__tests__/multiplayer.edgeSync.upsertOnly.test.ts` - Edge sync upsert guardrails.
- `src/__tests__/multiplayer/nodeDuplication.test.ts` - Node duplication invariants.
- `src/__tests__/yjs.migration.observe.test.ts` - Node/edge migration observers.
- `src/__tests__/yjs.state.gzip.test.ts` - Yjs state compression behavior.
- `src/__tests__/yjs.state.headers.test.ts` - Yjs state header assertions.
- `src/__tests__/yjs.token.expiry.test.ts` - Token expiry behavior.
- `src/__tests__/experiment/multiplayer/deleteNode.test.ts` - Node deletion scenarios.
- `src/__tests__/experiment/multiplayer/edgeTypeSwitching.test.ts` - Edge type switching behavior.
- `src/__tests__/experiment/multiplayer/support.addBelow.test.ts` - Support creation flows.
- `src/__tests__/experiment/multiplayer/sync.e2e.test.ts` - End-to-end sync scenarios.
- `src/__tests__/experiment/multiplayer/undo.integration.test.ts` - Undo stack integration.
- Additional UI and interaction coverage lives under `src/__tests__/experiment/multiplayer`.

### External (1 file, 214 lines)
- `yjs-ws/server.js` - Standalone Yjs WebSocket bridge for the experiment cluster.

## Write Access Model
- Exactly one session per user holds `canWrite`; others remain read-only replicas until arbitration grants ownership.
- `useWriteAccess` inspects Yjs awareness to elect the lowest client id per user, mirroring the logic used by the server.
- `useWritableSync` replays the authoritative doc locally before reenabling mutators when a replica regains write privileges.
- `useYjsProviderConnection` and `useYjsSynchronization` coordinate provider attachment, awareness broadcast, throttled saves, and failure handling.
- UI affordances (toolbar, node editing, connect mode) subscribe to `canWrite` so read-only sessions never enqueue mutations and receive explicit warnings when attempting to edit.
 - Anonymous sessions receive an `anon-…` user id via cookies and are eligible for write access only in non‑production environments; in production, authentication is required. Arbitration treats user ids (including `anon-…`) the same wherever anonymous participation is enabled.

## Summary Statistics
- **App Router Pages**: 7 files / 995 lines
- **API Routes**: 12 files / 1,199 lines
- **Components**: 139 files / 20,499 lines
- **Hooks**: 69 files / 10,505 lines
- **Utils**: 35 files / 3,387 lines
- **Queries**: 2 files / 311 lines
- **Mutations**: 1 file / 31 lines
- **Actions**: 4 files / 1,661 lines
- **Database Tables**: 8 files
- **Data**: 1 file / 115 lines
- **Top-Level Tests**: 40 files / 4,049 lines
- **External Bridge**: Yjs WebSocket server (submodule, 214 lines)

## Key Features

### Market Integration
- **Prediction Markets**: Nodes and edges can have associated prediction markets
- **Automated Market Maker**: LMSR (Logarithmic Market Scoring Rule) implementation
- **Trading Interface**: Buy/sell controls with price history and charts
- **Market Overlays**: Real-time price visualization on graph elements
- **Portfolio Management**: Holdings tracking and profit/loss calculations

### Advanced Notifications
- **Real-time Notifications**: Activity feeds for board changes
- **Notification Panels**: Sidebar and panel interfaces for activity tracking
- **Granular Preferences**: User-controllable notification settings
- **Activity Types**: Supports, objections, negations, comments, upvotes

### Enhanced UI Interactions
- **Edge Voting**: Interactive voting on relationship strength
- **Context Menus**: Rich context menus for graph elements
- **Snap Lines**: Visual alignment guides for precise positioning
- **Performance Monitoring**: Connection health and rendering optimization
- **Grace Periods**: Intelligent disconnect handling

## Feature Flags
- **`NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED`**: Enables multiplayer boards with real-time collaboration
- **`NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED`**: Activates prediction market features (requires Carroll submodule)
- **`NEXT_PUBLIC_FEATURE_NOTIFICATIONS_ENABLED`**: Controls main notification system (default: true)
- **`NEXT_PUBLIC_FEATURE_MP_NOTIFICATIONS_ENABLED`**: Controls multiplayer board notifications (default: true)
- **`NEXT_PUBLIC_FEATURE_PINNED_AND_PRIORITY`**: Enables moderation features for pinned/priority content

When disabled, respective features are hidden and their APIs return appropriate fallbacks.
