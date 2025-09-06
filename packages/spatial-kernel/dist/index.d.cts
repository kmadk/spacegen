/**
 * Viewport represents a view into infinite spatial canvas
 */
declare class Viewport {
    x: number;
    y: number;
    scale: number;
    width: number;
    height: number;
    constructor(x?: number, y?: number, scale?: number);
    /**
     * Pan the viewport by delta x and y
     */
    pan(dx: number, dy: number): void;
    /**
     * Zoom the viewport by a factor
     * factor > 1 = zoom in, factor < 1 = zoom out
     */
    zoom(factor: number): void;
    /**
     * Zoom to a specific scale
     */
    zoomTo(newScale: number): void;
    /**
     * Reset viewport to origin
     */
    reset(): void;
    /**
     * Get string representation for debugging
     */
    toString(): string;
}

/**
 * Semantic zoom levels - different meanings at different scales
 */
declare enum SemanticLevel {
    Quantum = "quantum",// 0.001x - 0.01x  (individual bits/bytes)
    Atomic = "atomic",// 0.01x - 0.1x    (individual records)
    Molecular = "molecular",// 0.1x - 0.5x     (relationships)
    Standard = "standard",// 0.5x - 2x       (normal view)
    System = "system",// 2x - 10x        (aggregates)
    Universal = "universal"
}
/**
 * Get semantic level based on zoom scale
 */
declare function getSemanticLevel(scale: number): SemanticLevel;
/**
 * Get human-readable description of semantic level
 */
declare function getSemanticDescription(level: SemanticLevel): string;
/**
 * Get suggested data granularity for a semantic level
 */
declare function getDataGranularity(level: SemanticLevel): {
    rowLimit: number;
    aggregation: string;
};

/**
 * Generate SQL query based on viewport position and scale
 */
declare function generateQuery(viewport: Viewport, tableName?: string): string;
/**
 * Generate API endpoint based on viewport
 */
declare function generateEndpoint(viewport: Viewport): string;

declare const version = "0.1.0";

export { SemanticLevel, Viewport, generateEndpoint, generateQuery, getDataGranularity, getSemanticDescription, getSemanticLevel, version };
