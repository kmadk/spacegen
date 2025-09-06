// src/viewport.ts
var Viewport = class {
  // Position in infinite space
  x = 0;
  y = 0;
  // Scale (zoom level) - 1.0 = normal, <1 = zoomed out, >1 = zoomed in
  scale = 1;
  // Viewport dimensions (pixels)
  width = 1920;
  height = 1080;
  constructor(x = 0, y = 0, scale = 1) {
    this.x = x;
    this.y = y;
    this.scale = scale;
  }
  /**
   * Pan the viewport by delta x and y
   */
  pan(dx, dy) {
    this.x += dx;
    this.y += dy;
  }
  /**
   * Zoom the viewport by a factor
   * factor > 1 = zoom in, factor < 1 = zoom out
   */
  zoom(factor) {
    this.scale *= factor;
    this.scale = Math.max(1e-3, Math.min(1e3, this.scale));
  }
  /**
   * Zoom to a specific scale
   */
  zoomTo(newScale) {
    this.scale = Math.max(1e-3, Math.min(1e3, newScale));
  }
  /**
   * Reset viewport to origin
   */
  reset() {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
  }
  /**
   * Get string representation for debugging
   */
  toString() {
    return `Viewport(x:${this.x}, y:${this.y}, scale:${this.scale}x)`;
  }
};

// src/semantic.ts
var SemanticLevel = /* @__PURE__ */ ((SemanticLevel2) => {
  SemanticLevel2["Quantum"] = "quantum";
  SemanticLevel2["Atomic"] = "atomic";
  SemanticLevel2["Molecular"] = "molecular";
  SemanticLevel2["Standard"] = "standard";
  SemanticLevel2["System"] = "system";
  SemanticLevel2["Universal"] = "universal";
  return SemanticLevel2;
})(SemanticLevel || {});
function getSemanticLevel(scale) {
  if (scale < 0.01) return "quantum" /* Quantum */;
  if (scale < 0.1) return "atomic" /* Atomic */;
  if (scale < 0.5) return "molecular" /* Molecular */;
  if (scale < 2) return "standard" /* Standard */;
  if (scale < 10) return "system" /* System */;
  return "universal" /* Universal */;
}
function getSemanticDescription(level) {
  switch (level) {
    case "quantum" /* Quantum */:
      return "Bit-level detail - raw data";
    case "atomic" /* Atomic */:
      return "Record-level - individual items";
    case "molecular" /* Molecular */:
      return "Relationship-level - connections";
    case "standard" /* Standard */:
      return "Standard view - normal detail";
    case "system" /* System */:
      return "System-level - aggregated data";
    case "universal" /* Universal */:
      return "Universal view - high-level summary";
  }
}
function getDataGranularity(level) {
  switch (level) {
    case "quantum" /* Quantum */:
      return { rowLimit: 1e3, aggregation: "none" };
    case "atomic" /* Atomic */:
      return { rowLimit: 100, aggregation: "none" };
    case "molecular" /* Molecular */:
      return { rowLimit: 50, aggregation: "minimal" };
    case "standard" /* Standard */:
      return { rowLimit: 25, aggregation: "standard" };
    case "system" /* System */:
      return { rowLimit: 10, aggregation: "grouped" };
    case "universal" /* Universal */:
      return { rowLimit: 5, aggregation: "summary" };
  }
}

// src/query.ts
function generateQuery(viewport, tableName = "data") {
  const level = getSemanticLevel(viewport.scale);
  const granularity = getDataGranularity(level);
  const bounds = getViewportBounds(viewport);
  switch (level) {
    case "quantum" /* Quantum */:
      return `SELECT id, raw_data, hex(bytes) 
              FROM ${tableName} 
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              LIMIT ${granularity.rowLimit}`;
    case "atomic" /* Atomic */:
      return `SELECT * 
              FROM ${tableName}
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              LIMIT ${granularity.rowLimit}`;
    case "molecular" /* Molecular */:
      return `SELECT t1.*, COUNT(t2.id) as connections
              FROM ${tableName} t1
              LEFT JOIN ${tableName}_relations t2 ON t1.id = t2.source_id
              WHERE t1.x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND t1.y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              GROUP BY t1.id
              LIMIT ${granularity.rowLimit}`;
    case "standard" /* Standard */:
      return `SELECT id, name, category, value, created_at
              FROM ${tableName}
              WHERE x BETWEEN ${bounds.minX} AND ${bounds.maxX}
                AND y BETWEEN ${bounds.minY} AND ${bounds.maxY}
              ORDER BY created_at DESC
              LIMIT ${granularity.rowLimit}`;
    case "system" /* System */:
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
    case "universal" /* Universal */:
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
function getViewportBounds(viewport) {
  const visibleWidth = viewport.width / viewport.scale;
  const visibleHeight = viewport.height / viewport.scale;
  return {
    minX: Math.floor(viewport.x - visibleWidth / 2),
    maxX: Math.floor(viewport.x + visibleWidth / 2),
    minY: Math.floor(viewport.y - visibleHeight / 2),
    maxY: Math.floor(viewport.y + visibleHeight / 2)
  };
}
function generateEndpoint(viewport) {
  const level = getSemanticLevel(viewport.scale);
  const bounds = getViewportBounds(viewport);
  const params = new URLSearchParams({
    x: viewport.x.toString(),
    y: viewport.y.toString(),
    scale: viewport.scale.toString(),
    level,
    minX: bounds.minX.toString(),
    maxX: bounds.maxX.toString(),
    minY: bounds.minY.toString(),
    maxY: bounds.maxY.toString()
  });
  switch (level) {
    case "quantum" /* Quantum */:
    case "atomic" /* Atomic */:
      return `/api/data/raw?${params}`;
    case "molecular" /* Molecular */:
      return `/api/data/relationships?${params}`;
    case "standard" /* Standard */:
      return `/api/data/entities?${params}`;
    case "system" /* System */:
      return `/api/data/aggregates?${params}`;
    case "universal" /* Universal */:
      return `/api/data/summary?${params}`;
  }
}

// src/index.ts
var version = "0.1.0";

export { SemanticLevel, Viewport, generateEndpoint, generateQuery, getDataGranularity, getSemanticDescription, getSemanticLevel, version };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map