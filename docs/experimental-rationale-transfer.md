# Experimental Rationale Transfer Plan

This document specifies a lossless mapping between existing rationales and the experimental tldraw-based canvas.

## Source → Target
- Viewpoint graph (ReactFlow JSON) → experimental tldraw doc JSON (`experimental_graph_docs.doc`)
- Points from DB (via `pointId`) → point shapes with `ref.pointId`
- Edges (statement/negation/objection) → connector shapes with `ref.{fromPointId,toPointId}` and `kind`

## Shapes
- exp-point (tldraw geo rectangle)
  - x/y/w/h from node.position
  - props: `text` (from point content), `kind: 'point'|'statement'`, `ref: { pointId }`
  - font: Roboto Slab, large size
- exp-connector (tldraw arrow or custom)
  - z-order under nodes
  - statement edges: thin
  - negation edges: tapered ribbon (shorter = wider)
  - props: `kind: 'statement'|'negation'|'objection'`, `ref: { fromPointId, toPointId }`, `midHotspot: { x, y }`

## Doc meta
```json
{
  "version": 1,
  "meta": { "source": { "viewpointId": "...", "migratedAt": "ISO", "space": "..." } }
}
```

## Algorithm (import)
1. Fetch viewpoint (nodes/edges) and unique `pointIds`
2. Fetch point contents → map `pointId → content`
3. Create `exp-point` shapes for statement + points
4. Create connectors by edge type; compute midpoint hotspot
5. Persist `doc` without modifying original rationale

## Algorithm (export back)
1. Rebuild `graph.nodes` from `exp-point` using `ref.pointId` + positions
2. Rebuild `graph.edges` from `exp-connector.kind` and refs
3. Ignore purely visual meta (taper, hotspot)

## Notes
- Missing content → empty string with `pointId` preserved
- Objections: render variant and connector kind
- Endorsements/restakes/doubts: overlay via `pointId` refs, out of doc schema


