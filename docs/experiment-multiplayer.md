# Multiplayer Rationale Experiment

## Overview
Real-time collaborative graph editing experiment using Yjs CRDTs and WebSocket synchronization. Completely isolated from main negation-game system.

## Files

### Pages
- `src/app/experiment/layout.tsx` - Feature flag protection
- `src/app/experiment/rationale/multiplayer/[id]/page.tsx` - Main multiplayer page
- `src/app/experiment/rationale/multiplayer/page.tsx` - Entry page
- `src/app/experiment/rationale/page.tsx` - Root experiment page

### API Routes
- `src/app/api/experimental/rationales/route.ts` - List multiplayer docs
- `src/app/api/experimental/rationales/[id]/state/route.ts` - Get document state
- `src/app/api/experimental/rationales/[id]/updates/route.ts` - Save document updates

### Hooks
- `src/hooks/experiment/multiplayer/useYjsMultiplayer.ts` - Core Yjs integration and sync
- `src/hooks/experiment/multiplayer/useMultiplayerCursors.ts` - Cursor tracking

### Components
- `src/components/experiment/multiplayer/ConnectedUsers.tsx` - User awareness display
- `src/components/experiment/multiplayer/CursorOverlay.tsx` - Live cursor rendering
- `src/components/experiment/multiplayer/CursorReporter.tsx` - Cursor position updates
- `src/components/experiment/multiplayer/GraphContext.tsx` - React context
- `src/components/experiment/multiplayer/GraphUpdater.tsx` - Graph state sync

### Utilities
- `src/utils/experiment/multiplayer/graphSync.ts` - ReactFlow change handlers
- `src/data/experiment/multiplayer/sampleData.ts` - Node/edge types

### Database
- `src/db/tables/mpDocsTable.ts` - Document metadata
- `src/db/tables/mpDocUpdatesTable.ts` - Document updates
- `src/actions/experimental/fetchMpDocs.ts` - Document queries

### External
- `yjs-ws/server.js` - WebSocket server for Yjs synchronization

## Feature Flag
Controlled by `NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED=true/false`

## Things to deal with later

### TypeScript
- 26 instances of `any` type usage
- Weak typing on node/edge data structures
- Runtime type coercion with `as any`

### Performance
- JSON.stringify for change detection in hot paths
- Multiple Array.from() operations
- No memoization on expensive computations

### Error Handling
- Silent error swallowing in try/catch blocks
- No user-facing error recovery
- API failures default to empty states

### Architecture
- 15+ state hooks in single component
- Mixed UI and collaboration state
- Complex nested async operations in useEffect

## Status
Functional for experimentation. Deploying to prod with feature flag for testing