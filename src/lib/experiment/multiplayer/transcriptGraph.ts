import type { Edge, Node } from "@xyflow/react";
import * as Y from "yjs";

export type TranscriptRelationType = "option" | "support" | "negation";

export interface TranscriptGraphRelation {
  sourceIndex: number;
  targetIndex: number | null;
  type: TranscriptRelationType;
}

export interface TranscriptGraphSpec {
  title: string;
  points: string[];
  relations?: TranscriptGraphRelation[];
}

const MAX_TITLE_LENGTH = 120;
const MIN_POINT_LENGTH = 10;
const MAX_POINT_LENGTH = 240;
const MIN_POINT_COUNT = 3;
const MAX_POINT_COUNT = 18;
const MAX_LAYOUT_DEPTH = 6;
const MIN_NON_OPTION_EDGE_COUNT = 1;

const NEGATION_HINT =
  /\b(objection|oppose|against|concern|counter|rebuttal|disagree|critic|risk|problem|harm|but)\b/i;
const SUPPORT_HINT =
  /\b(support|agree|because|evidence|data|therefore|thus|benefit|helps|improves|response)\b/i;

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const stripSpeakerPrefix = (value: string) =>
  value.replace(/^\s*[A-Za-z0-9_ .'-]{1,40}:\s+/, "");

const toCandidatePoint = (value: string): string | null => {
  const normalized = normalizeWhitespace(stripSpeakerPrefix(value));
  if (!normalized) return null;
  const trimmed = truncate(normalized, MAX_POINT_LENGTH);
  if (trimmed.length < MIN_POINT_LENGTH) return null;
  return trimmed;
};

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
  }
  return result;
};

const splitTranscriptChunks = (text: string) => {
  const normalized = text.replace(/\r\n/g, "\n");
  const byLine = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (byLine.length > 0) return byLine;
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const inferTitle = (text: string, fallback = "Transcript Board") => {
  const chunks = splitTranscriptChunks(text);
  const questionLike = chunks.find((chunk) => chunk.includes("?"));
  const base = questionLike || chunks[0] || fallback;
  const cleaned = normalizeWhitespace(stripSpeakerPrefix(base));
  if (!cleaned) return fallback;
  return truncate(cleaned, MAX_TITLE_LENGTH);
};

const buildPointFallbacks = (title: string) => [
  `Core claim made in the transcript about ${title.toLowerCase()}`,
  "Strongest objection raised in the transcript",
  "Unresolved question that still needs evidence",
];

const extractFallbackPoints = (text: string) => {
  const chunks = splitTranscriptChunks(text);
  const scored = chunks
    .map((chunk, index) => ({ chunk, index }))
    .map(({ chunk, index }) => {
      const point = toCandidatePoint(chunk);
      if (!point) return null;
      const hasNumber = /\d/.test(point);
      const hasSupportCue = SUPPORT_HINT.test(point);
      const hasNegationCue = NEGATION_HINT.test(point);
      const hasDecisionCue =
        /\b(launch|delay|pilot|exempt|cost|equity|impact|threshold|safety|compliance|budget|risk)\b/i.test(
          point
        );
      let score = 0;
      if (hasSupportCue) score += 3;
      if (hasNegationCue) score += 3;
      if (hasDecisionCue) score += 2;
      if (hasNumber) score += 1;
      if (point.length >= 40 && point.length <= 180) score += 1;
      return { point, index, score };
    })
    .filter((entry): entry is { point: string; index: number; score: number } => !!entry)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    });

  const points = uniqueStrings(scored.map((entry) => entry.point));
  return points.slice(0, MAX_POINT_COUNT);
};

const minimumPointTarget = (fallbackPointCount: number) => {
  if (fallbackPointCount >= 12) return 8;
  if (fallbackPointCount >= 8) return 6;
  if (fallbackPointCount >= 5) return 5;
  return MIN_POINT_COUNT;
};

const minimumNonOptionTarget = (pointCount: number) => {
  if (pointCount >= 12) return 4;
  if (pointCount >= 8) return 3;
  if (pointCount >= 5) return 2;
  return MIN_NON_OPTION_EDGE_COUNT;
};

const dedupeRelations = (relations: TranscriptGraphRelation[]) => {
  const seen = new Set<string>();
  const result: TranscriptGraphRelation[] = [];
  for (const relation of relations) {
    const key = `${relation.type}:${relation.sourceIndex}->${relation.targetIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(relation);
  }
  return result;
};

const normalizeRelations = (
  input: TranscriptGraphRelation[] | undefined,
  pointCount: number
) => {
  if (!input || pointCount <= 0) return [] as TranscriptGraphRelation[];
  const normalized: TranscriptGraphRelation[] = [];
  for (const relation of input) {
    const source = Number(relation.sourceIndex);
    if (!Number.isInteger(source) || source < 0 || source >= pointCount) {
      continue;
    }

    const rawType = String(relation.type || "").toLowerCase();
    const type: TranscriptRelationType =
      rawType === "support"
        ? "support"
        : rawType === "negation"
          ? "negation"
          : "option";

    const hasTargetIndex =
      relation.targetIndex !== null && relation.targetIndex !== undefined;
    if (!hasTargetIndex || type === "option") {
      normalized.push({
        sourceIndex: source,
        targetIndex: null,
        type: "option",
      });
      continue;
    }

    const target = Number(relation.targetIndex);
    if (
      !Number.isInteger(target) ||
      target < 0 ||
      target >= pointCount ||
      target === source
    ) {
      continue;
    }

    normalized.push({
      sourceIndex: source,
      targetIndex: target,
      type,
    });
  }

  return dedupeRelations(normalized);
};

const parseRelationCandidates = (input: unknown): TranscriptGraphRelation[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;

      const sourceValue =
        item.sourceIndex ??
        item.source ??
        item.fromIndex ??
        item.source_id ??
        item.sourceId;
      const sourceIndex = Number(sourceValue);

      const targetValue =
        item.targetIndex ??
        item.target ??
        item.toIndex ??
        item.target_id ??
        item.targetId;
      let targetIndex: number | null = null;
      if (typeof targetValue === "string") {
        targetIndex =
          targetValue.toLowerCase() === "title"
            ? null
            : Number.isInteger(Number(targetValue))
              ? Number(targetValue)
              : null;
      } else if (targetValue === null || targetValue === undefined) {
        targetIndex = null;
      } else {
        const numeric = Number(targetValue);
        targetIndex = Number.isInteger(numeric) ? numeric : null;
      }

      const rawType = String(item.type || item.relation || "option")
        .toLowerCase()
        .trim();
      const type: TranscriptRelationType =
        rawType === "support"
          ? "support"
          : rawType === "negation"
            ? "negation"
            : "option";

      if (!Number.isInteger(sourceIndex)) return null;
      return {
        sourceIndex,
        targetIndex,
        type,
      } as TranscriptGraphRelation;
    })
    .filter((relation): relation is TranscriptGraphRelation => !!relation);
};

const buildFallbackRelations = (
  points: string[],
  transcriptText: string
): TranscriptGraphRelation[] => {
  if (points.length === 0) return [];
  const relations: TranscriptGraphRelation[] = [];
  const optionCount = Math.min(
    points.length,
    Math.max(2, Math.min(4, Math.ceil(points.length / 3)))
  );

  for (let index = 0; index < optionCount; index += 1) {
    relations.push({
      sourceIndex: index,
      targetIndex: null,
      type: "option",
    });
  }

  for (let index = optionCount; index < points.length; index += 1) {
    const pointText = points[index] || "";
    const hintSource = `${pointText}\n${transcriptText}`.toLowerCase();
    const type: TranscriptRelationType = NEGATION_HINT.test(hintSource)
      ? "negation"
      : SUPPORT_HINT.test(hintSource)
        ? "support"
        : index % 2 === 0
          ? "support"
          : "negation";
    relations.push({
      sourceIndex: index,
      targetIndex: index - 1,
      type,
    });
  }

  const withFallbacks = dedupeRelations(relations);
  const connectedSources = new Set(
    withFallbacks.map((relation) => relation.sourceIndex)
  );
  for (let index = 0; index < points.length; index += 1) {
    if (!connectedSources.has(index)) {
      withFallbacks.push({
        sourceIndex: index,
        targetIndex: null,
        type: "option",
      });
    }
  }

  return normalizeRelations(withFallbacks, points.length);
};

const buildRelationsWithCoverage = (
  points: string[],
  relationInput: TranscriptGraphRelation[] | undefined,
  transcriptText: string
) => {
  const fallbackRelations = buildFallbackRelations(points, transcriptText);
  const normalizedPreferred = normalizeRelations(relationInput, points.length);
  if (normalizedPreferred.length === 0) return fallbackRelations;

  const mergedBySource = new Map<number, TranscriptGraphRelation>();
  fallbackRelations.forEach((relation) => {
    mergedBySource.set(relation.sourceIndex, relation);
  });
  normalizedPreferred.forEach((relation) => {
    mergedBySource.set(relation.sourceIndex, relation);
  });

  let merged = Array.from(mergedBySource.values()).sort(
    (left, right) => left.sourceIndex - right.sourceIndex
  );
  let nonOptionCount = merged.filter((relation) => relation.type !== "option").length;
  const minimumRequiredNonOption = minimumNonOptionTarget(points.length);
  if (nonOptionCount < minimumRequiredNonOption && points.length > 2) {
    const fallbackNonOption = fallbackRelations.filter(
      (relation) => relation.type !== "option"
    );
    for (const relation of fallbackNonOption) {
      if (nonOptionCount >= minimumRequiredNonOption) break;
      const current = mergedBySource.get(relation.sourceIndex);
      if (!current || current.type !== "option") continue;
      mergedBySource.set(relation.sourceIndex, relation);
      nonOptionCount += 1;
    }
    merged = Array.from(mergedBySource.values()).sort(
      (left, right) => left.sourceIndex - right.sourceIndex
    );
  }

  return dedupeRelations(merged);
};

export const buildFallbackTranscriptGraphSpec = (
  transcriptText: string
): TranscriptGraphSpec => {
  const title = inferTitle(transcriptText);
  const extracted = extractFallbackPoints(transcriptText);
  const points =
    extracted.length >= MIN_POINT_COUNT
      ? extracted
      : uniqueStrings([...extracted, ...buildPointFallbacks(title)]).slice(
          0,
          MIN_POINT_COUNT
        );

  const relations = buildFallbackRelations(points, transcriptText);
  return { title, points, relations };
};

export const normalizeTranscriptGraphSpec = (
  input: unknown,
  fallback: TranscriptGraphSpec
): TranscriptGraphSpec => {
  const source = input && typeof input === "object" ? (input as any) : {};
  const candidateTitle =
    typeof source.title === "string" ? source.title : fallback.title;
  const title = truncate(
    normalizeWhitespace(candidateTitle || fallback.title || "Transcript Board"),
    MAX_TITLE_LENGTH
  );

  const rawPoints = Array.isArray(source.points) ? source.points : [];
  const parsedPoints = uniqueStrings(
    rawPoints
      .map((entry: unknown) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const candidate = (entry as { content?: unknown; text?: unknown })
            .content;
          if (typeof candidate === "string") return candidate;
          const textCandidate = (entry as { text?: unknown }).text;
          if (typeof textCandidate === "string") return textCandidate;
        }
        return "";
      })
      .map(toCandidatePoint)
      .filter((point: string | null): point is string => !!point)
  ).slice(0, MAX_POINT_COUNT);

  const desiredMinimumPoints = minimumPointTarget(fallback.points.length);
  const enrichedPoints = uniqueStrings([
    ...parsedPoints,
    ...fallback.points,
    ...buildPointFallbacks(title),
  ])
    .map(toCandidatePoint)
    .filter((point: string | null): point is string => !!point)
    .slice(0, MAX_POINT_COUNT);

  const points =
    parsedPoints.length >= desiredMinimumPoints
      ? parsedPoints
      : enrichedPoints.slice(0, Math.max(MIN_POINT_COUNT, desiredMinimumPoints));

  const relationCandidates = parseRelationCandidates(
    source.relations || source.edges
  );
  const preferredRelations =
    relationCandidates.length > 0 ? relationCandidates : fallback.relations;
  const ensuredRelations = buildRelationsWithCoverage(
    points,
    preferredRelations,
    `${title}\n${points.join("\n")}\n${fallback.points.join("\n")}`
  );

  return {
    title,
    points,
    relations: ensuredRelations,
  };
};

const buildDeterministicEdgeId = (
  edgeType: string,
  sourceId: string,
  targetId: string,
  sourceHandle: string,
  targetHandle: string
) => `edge:${edgeType}:${sourceId}:${sourceHandle}->${targetId}:${targetHandle}`;

const buildPrimaryRelationMap = (
  relations: TranscriptGraphRelation[]
): Map<number, TranscriptGraphRelation> => {
  const relationBySource = new Map<number, TranscriptGraphRelation>();
  for (const relation of relations) {
    if (relationBySource.has(relation.sourceIndex)) continue;
    relationBySource.set(relation.sourceIndex, relation);
  }
  return relationBySource;
};

const computePointDepths = (
  pointCount: number,
  relationBySource: Map<number, TranscriptGraphRelation>
) => {
  const memo = new Map<number, number>();
  const visiting = new Set<number>();

  const visit = (index: number): number => {
    if (memo.has(index)) return memo.get(index)!;
    if (visiting.has(index)) return 1;
    visiting.add(index);

    const relation = relationBySource.get(index);
    let depth = 1;
    if (relation && relation.targetIndex !== null) {
      depth = Math.min(MAX_LAYOUT_DEPTH, visit(relation.targetIndex) + 1);
    }

    visiting.delete(index);
    memo.set(index, depth);
    return depth;
  };

  const depths: number[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    depths[index] = visit(index);
  }
  return depths;
};

export const buildTranscriptBoardLayout = (
  spec: TranscriptGraphSpec,
  creator?: { userId?: string | null; username?: string | null }
): { nodes: Node[]; edges: Edge[] } => {
  const title = normalizeWhitespace(spec.title || "Transcript Board");
  const normalizedPoints = uniqueStrings(spec.points || [])
    .map(toCandidatePoint)
    .filter((point): point is string => !!point)
    .slice(0, MAX_POINT_COUNT);

  const safePoints =
    normalizedPoints.length >= MIN_POINT_COUNT
      ? normalizedPoints
      : uniqueStrings([
          ...normalizedPoints,
          ...buildPointFallbacks(title || "Transcript Board"),
        ]).slice(0, MIN_POINT_COUNT);

  const safeRelations = buildRelationsWithCoverage(
    safePoints,
    spec.relations,
    `${title}\n${safePoints.join("\n")}`
  );

  const createdAt = Date.now();
  const statementId = "title";
  const centerX = 520;
  const centerY = 100;
  const levelSpacingY = 210;
  const nodeSpacingX = 320;

  const relationBySource = buildPrimaryRelationMap(safeRelations);
  const depths = computePointDepths(safePoints.length, relationBySource);
  const pointsByDepth = new Map<number, number[]>();
  depths.forEach((depth, index) => {
    const current = pointsByDepth.get(depth) || [];
    current.push(index);
    pointsByDepth.set(depth, current);
  });

  const statementNode: Node = {
    id: statementId,
    type: "statement",
    position: { x: centerX - 140, y: centerY - 70 },
    data: {
      statement: title || "Transcript Board",
      title: title || "Transcript Board",
      createdAt,
      createdBy: creator?.userId || null,
      createdByName: creator?.username || null,
    },
    selected: false,
  };

  const pointNodes: Node[] = safePoints.map((point, index) => {
    const depth = Math.max(1, depths[index] || 1);
    const row = pointsByDepth.get(depth) || [index];
    const rowIndex = row.indexOf(index);
    const rowWidth = (row.length - 1) * nodeSpacingX;
    const x = centerX - rowWidth / 2 + rowIndex * nodeSpacingX;
    const y = centerY + depth * levelSpacingY;

    return {
      id: `tp-${index + 1}`,
      type: "point",
      position: { x: x - 120, y: y - 60 },
      data: {
        content: point,
        title: point,
        createdAt,
        createdBy: creator?.userId || null,
        createdByName: creator?.username || null,
      },
      selected: false,
    };
  });

  const pointIdByIndex = new Map<number, string>();
  pointNodes.forEach((node, index) => pointIdByIndex.set(index, node.id));

  const edges: Edge[] = safeRelations
    .map((relation) => {
      const sourceId = pointIdByIndex.get(relation.sourceIndex);
      const targetId =
        relation.targetIndex === null
          ? statementId
          : pointIdByIndex.get(relation.targetIndex);
      if (!sourceId || !targetId) return null;
      const sourceHandle = `${sourceId}-source-handle`;
      const targetHandle = `${targetId}-incoming-handle`;
      const type =
        relation.type === "support"
          ? "support"
          : relation.type === "negation"
            ? "negation"
            : "option";
      return {
        id: buildDeterministicEdgeId(
          type,
          sourceId,
          targetId,
          sourceHandle,
          targetHandle
        ),
        type,
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
        data: {
          createdBy: creator?.userId || null,
          createdByName: creator?.username || null,
        },
      } as Edge;
    })
    .filter((edge): edge is Edge => !!edge);

  return {
    nodes: [statementNode, ...pointNodes],
    edges,
  };
};

export const encodeTranscriptGraphUpdate = (
  spec: TranscriptGraphSpec,
  creator?: { userId?: string | null; username?: string | null }
) => {
  const { nodes, edges } = buildTranscriptBoardLayout(spec, creator);
  const doc = new Y.Doc();
  const yNodes = doc.getMap<Node>("nodes");
  const yEdges = doc.getMap<Edge>("edges");
  const yText = doc.getMap<Y.Text>("node_text");
  const yMeta = doc.getMap<unknown>("meta");

  nodes.forEach((node) => {
    yNodes.set(node.id, node);
    const nodeData = (node.data || {}) as Record<string, unknown>;
    const content =
      node.type === "statement"
        ? String(nodeData.statement || "")
        : String(nodeData.content || "");
    const text = new Y.Text();
    if (content) text.insert(0, content);
    yText.set(node.id, text);
  });

  edges.forEach((edge) => {
    yEdges.set(edge.id, edge);
  });

  yMeta.set("title", spec.title);
  yMeta.set("createdFromDocument", true);
  yMeta.set("generatedAt", new Date().toISOString());
  yMeta.set("transcriptPointCount", nodes.length - 1);
  yMeta.set("transcriptRelationCount", edges.length);

  return Buffer.from(Y.encodeStateAsUpdate(doc));
};
