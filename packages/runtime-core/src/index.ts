import type { Json } from "@fir/ir";

export function deriveSemanticLevel(scale: number): number {
  const lvl = Math.round(Math.log2(Math.max(scale, 0.01))) + 2;
  return Math.max(0, Math.min(5, lvl));
}

export type SemanticNode = {
  id?: string;
  type: string;
  children?: SemanticNode[];
  summary?: string;
  renderHints?: any;
  metadata?: any;
};
export type SemanticTree = {
  type: "app";
  level: number;
  children: SemanticNode[];
};

export function buildSemanticTree(
  ir: Json,
  opts: { scale?: number } = {}
): SemanticTree {
  const level = deriveSemanticLevel(opts.scale ?? 1);
  const children: SemanticNode[] = [];
  const nodes = (ir.ui?.nodes ?? []) as any[];
  const summaries = new Map<string, string>();
  const summaryNodes = (ir.uiSummaries?.nodes ?? []) as any[];
  for (const sn of summaryNodes) summaries.set(sn.id, sn.text || sn.id);
  for (const n of nodes) {
    const z = n.zoom?.semantic;
    if (z && Array.isArray(z.range)) {
      const [min, max] = z.range;
      if (level < min || level > max) {
        if (z.collapseTo && summaries.has(z.collapseTo)) {
          children.push({
            type: "summary",
            summary: summaries.get(z.collapseTo),
          });
        }
        continue;
      }
    }
    const node: SemanticNode = {
      id: n.id,
      type: n.kind,
      renderHints: n.renderHints,
      metadata: n.metadata,
    };

    // Handle nested children if present
    if (n.children && Array.isArray(n.children)) {
      const childNodes = nodes.filter((child) => n.children.includes(child.id));
      if (childNodes.length > 0) {
        node.children = childNodes.map((child) => ({
          id: child.id,
          type: child.kind,
          renderHints: child.renderHints,
          metadata: child.metadata,
        }));
      }
    }

    children.push(node);
  }
  return { type: "app", level, children };
}
