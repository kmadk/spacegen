/**
 * Semantic zoom levels - different meanings at different scales
 */
export enum SemanticLevel {
  Quantum = "quantum", // 0.001x - 0.01x  (individual bits/bytes)
  Atomic = "atomic", // 0.01x - 0.1x    (individual records)
  Molecular = "molecular", // 0.1x - 0.5x     (relationships)
  Standard = "standard", // 0.5x - 2x       (normal view)
  System = "system", // 2x - 10x        (aggregates)
  Universal = "universal", // 10x+            (summaries)
}

/**
 * Get semantic level based on zoom scale
 */
export function getSemanticLevel(scale: number): SemanticLevel {
  if (scale < 0.01) return SemanticLevel.Quantum;
  if (scale < 0.1) return SemanticLevel.Atomic;
  if (scale < 0.5) return SemanticLevel.Molecular;
  if (scale < 2) return SemanticLevel.Standard;
  if (scale < 10) return SemanticLevel.System;
  return SemanticLevel.Universal;
}

/**
 * Get human-readable description of semantic level
 */
export function getSemanticDescription(level: SemanticLevel): string {
  switch (level) {
    case SemanticLevel.Quantum:
      return "Bit-level detail - raw data";
    case SemanticLevel.Atomic:
      return "Record-level - individual items";
    case SemanticLevel.Molecular:
      return "Relationship-level - connections";
    case SemanticLevel.Standard:
      return "Standard view - normal detail";
    case SemanticLevel.System:
      return "System-level - aggregated data";
    case SemanticLevel.Universal:
      return "Universal view - high-level summary";
  }
}

/**
 * Get suggested data granularity for a semantic level
 */
export function getDataGranularity(level: SemanticLevel): {
  rowLimit: number;
  aggregation: string;
} {
  switch (level) {
    case SemanticLevel.Quantum:
      return { rowLimit: 1000, aggregation: "none" };
    case SemanticLevel.Atomic:
      return { rowLimit: 100, aggregation: "none" };
    case SemanticLevel.Molecular:
      return { rowLimit: 50, aggregation: "minimal" };
    case SemanticLevel.Standard:
      return { rowLimit: 25, aggregation: "standard" };
    case SemanticLevel.System:
      return { rowLimit: 10, aggregation: "grouped" };
    case SemanticLevel.Universal:
      return { rowLimit: 5, aggregation: "summary" };
  }
}
