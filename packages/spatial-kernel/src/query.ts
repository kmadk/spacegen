import { Viewport } from "./viewport.js";
import {
  SemanticLevel,
  getSemanticLevel,
  getDataGranularity,
} from "./semantic.js";

/**
 * Generate SQL query based on viewport position and scale
 */
export function generateQuery(
  viewport: Viewport,
  tableName: string = "data"
): string {
  const level = getSemanticLevel(viewport.scale);
  const granularity = getDataGranularity(level);

  // Calculate spatial bounds for query
  const bounds = getViewportBounds(viewport);

  switch (level) {
    case SemanticLevel.Quantum:
      // Raw binary/hex data
      return `SELECT id, raw_data, hex(bytes) 
              FROM ${tableName} 
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              LIMIT ${granularity.rowLimit}`;

    case SemanticLevel.Atomic:
      // Individual records
      return `SELECT * 
              FROM ${tableName}
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              LIMIT ${granularity.rowLimit}`;

    case SemanticLevel.Molecular:
      // Records with relationships
      return `SELECT t1.*, COUNT(t2.id) as connections
              FROM ${tableName} t1
              LEFT JOIN ${tableName}_relations t2 ON t1.id = t2.source_id
              WHERE t1.x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND t1.y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              GROUP BY t1.id
              LIMIT ${granularity.rowLimit}`;

    case SemanticLevel.Standard:
      // Standard paginated view
      return `SELECT id, name, category, value, created_at
              FROM ${tableName}
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              ORDER BY created_at DESC
              LIMIT ${granularity.rowLimit}`;

    case SemanticLevel.System:
      // Aggregated by category
      return `SELECT category, 
                     COUNT(*) as count,
                     AVG(value) as avg_value,
                     SUM(value) as total_value
              FROM ${tableName}
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              GROUP BY category
              ORDER BY count DESC
              LIMIT ${granularity.rowLimit}`;

    case SemanticLevel.Universal:
      // High-level summary
      return `SELECT COUNT(*) as total_entities,
                     COUNT(DISTINCT category) as categories,
                     MIN(value) as min_value,
                     MAX(value) as max_value,
                     AVG(value) as avg_value
              FROM ${tableName}
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}`;
  }
}

/**
 * Calculate viewport bounds in data space
 */
function getViewportBounds(viewport: Viewport): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  // Calculate visible area based on viewport position and scale
  const visibleWidth = viewport.width / viewport.scale;
  const visibleHeight = viewport.height / viewport.scale;

  return {
    minX: Math.floor(viewport.x - visibleWidth / 2),
    maxX: Math.floor(viewport.x + visibleWidth / 2),
    minY: Math.floor(viewport.y - visibleHeight / 2),
    maxY: Math.floor(viewport.y + visibleHeight / 2),
  };
}

/**
 * Generate API endpoint based on viewport
 */
export function generateEndpoint(viewport: Viewport): string {
  const level = getSemanticLevel(viewport.scale);
  const bounds = getViewportBounds(viewport);

  const params = new URLSearchParams({
    x: viewport.x.toString(),
    y: viewport.y.toString(),
    scale: viewport.scale.toString(),
    level: level,
    minX: bounds.minX.toString(),
    maxX: bounds.maxX.toString(),
    minY: bounds.minY.toString(),
    maxY: bounds.maxY.toString(),
  });

  switch (level) {
    case SemanticLevel.Quantum:
    case SemanticLevel.Atomic:
      return `/api/data/raw?${params}`;
    case SemanticLevel.Molecular:
      return `/api/data/relationships?${params}`;
    case SemanticLevel.Standard:
      return `/api/data/entities?${params}`;
    case SemanticLevel.System:
      return `/api/data/aggregates?${params}`;
    case SemanticLevel.Universal:
      return `/api/data/summary?${params}`;
  }
}
