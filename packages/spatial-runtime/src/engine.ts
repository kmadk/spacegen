/**
 * SpatialEngine - Main orchestrator for hybrid spatial rendering
 * Combines deck.gl WebGL rendering with HTML overlay system
 */

import { Deck } from '@deck.gl/core';
import { HTMLOverlaySystem } from './html-overlay.js';
import { getSemanticLevel, applySemanticCollapse, DEFAULT_SEMANTIC_LEVELS } from './semantic-zoom.js';
import type { 
  ViewState, 
  SpatialElement, 
  SpatialEngineConfig, 
  RenderingMetrics
} from './types.js';

export class SpatialEngine {
  private deck: Deck;
  private htmlOverlay: HTMLOverlaySystem;
  private elements: SpatialElement[] = [];
  private currentViewState: ViewState = { x: 0, y: 0, zoom: 1 };
  private config: Required<SpatialEngineConfig>;
  private frameStartTime: number = 0;
  private renderingMetrics: RenderingMetrics = {
    frameTime: 0,
    renderedElements: 0,
    culledElements: 0,
    totalElements: 0,
    semanticLevel: 'standard'
  };

  constructor(container: HTMLElement, config: SpatialEngineConfig = {}) {
    this.config = {
      frameTimeBudget: config.frameTimeBudget ?? 16.67, // 60fps
      semanticLevels: config.semanticLevels ?? DEFAULT_SEMANTIC_LEVELS,
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true,
      debug: config.debug ?? false
    };

    // Initialize HTML overlay system
    this.htmlOverlay = new HTMLOverlaySystem(container);

    // Initialize deck.gl
    this.deck = new Deck({
      container,
      initialViewState: {
        longitude: this.currentViewState.x,
        latitude: this.currentViewState.y,
        zoom: Math.log2(this.currentViewState.zoom),
        pitch: 0,
        bearing: 0
      },
      controller: true,
      onViewStateChange: ({ viewState }: { viewState: any }) => {
        this.handleViewStateChange({
          x: viewState.longitude,
          y: viewState.latitude,
          zoom: Math.pow(2, viewState.zoom),
          width: viewState.width,
          height: viewState.height
        });
      },
      onBeforeRender: () => {
        if (this.config.enablePerformanceMonitoring) {
          this.frameStartTime = performance.now();
        }
      },
      onAfterRender: () => {
        if (this.config.enablePerformanceMonitoring) {
          this.updateRenderingMetrics();
        }
      }
    });
  }

  /**
   * Handle viewport changes and update both deck.gl and HTML overlay
   */
  private handleViewStateChange(viewState: ViewState): void {
    this.currentViewState = viewState;

    // Update HTML overlay transforms
    this.htmlOverlay.updateTransform(viewState);

    // Determine current semantic level
    const currentLevel = getSemanticLevel(viewState.zoom, this.config.semanticLevels);
    this.renderingMetrics.semanticLevel = currentLevel;

    // Apply semantic collapse if needed
    const processedElements = applySemanticCollapse(this.elements, currentLevel);
    
    // Update deck.gl layers with collapsed data
    this.updateDeckLayers(processedElements);

    if (this.config.debug) {
      console.log(`Viewport changed: zoom=${viewState.zoom.toFixed(2)}, level=${currentLevel}, elements=${processedElements.length}`);
    }
  }

  /**
   * Add spatial elements to the engine
   */
  addElements(elements: SpatialElement[]): void {
    this.elements.push(...elements);
    
    // Add HTML elements to overlay if they exist
    elements.forEach(element => {
      if (element.htmlElement) {
        this.htmlOverlay.addElement(
          element.id,
          element.htmlElement,
          element.position,
          1 // Default z-index
        );
      }
    });

    // Trigger re-render with current semantic level
    const currentLevel = getSemanticLevel(this.currentViewState.zoom, this.config.semanticLevels);
    const processedElements = applySemanticCollapse(this.elements, currentLevel);
    this.updateDeckLayers(processedElements);
  }

  /**
   * Remove elements by ID
   */
  removeElements(elementIds: string[]): void {
    this.elements = this.elements.filter(el => !elementIds.includes(el.id));
    
    // Remove from HTML overlay
    elementIds.forEach(id => {
      this.htmlOverlay.removeElement(id);
    });

    // Update deck.gl layers
    const currentLevel = getSemanticLevel(this.currentViewState.zoom, this.config.semanticLevels);
    const processedElements = applySemanticCollapse(this.elements, currentLevel);
    this.updateDeckLayers(processedElements);
  }

  /**
   * Update deck.gl layers with processed elements
   */
  private updateDeckLayers(elements: SpatialElement[]): void {
    // This is a simplified example - in practice you'd create specific deck.gl layers
    // based on your element types (ScatterplotLayer, TextLayer, etc.)
    
    const layers: any[] = []; // Placeholder for actual deck.gl layers
    
    this.deck.setProps({
      layers
    });

    // Update metrics
    this.renderingMetrics.renderedElements = elements.length;
    this.renderingMetrics.totalElements = this.elements.length;
    this.renderingMetrics.culledElements = this.elements.length - elements.length;
  }

  /**
   * Update rendering performance metrics
   */
  private updateRenderingMetrics(): void {
    if (this.frameStartTime > 0) {
      this.renderingMetrics.frameTime = performance.now() - this.frameStartTime;
      
      if (this.config.debug && this.renderingMetrics.frameTime > this.config.frameTimeBudget) {
        console.warn(`Frame budget exceeded: ${this.renderingMetrics.frameTime.toFixed(2)}ms > ${this.config.frameTimeBudget}ms`);
      }
    }
  }

  /**
   * Get current rendering metrics
   */
  getMetrics(): RenderingMetrics & { htmlOverlay: ReturnType<HTMLOverlaySystem['getMetrics']> } {
    return {
      ...this.renderingMetrics,
      htmlOverlay: this.htmlOverlay.getMetrics()
    };
  }

  /**
   * Set viewport to specific world coordinates
   */
  setViewState(viewState: Partial<ViewState>): void {
    const newViewState = { ...this.currentViewState, ...viewState };
    
    this.deck.setProps({
      initialViewState: {
        longitude: newViewState.x,
        latitude: newViewState.y,
        zoom: Math.log2(newViewState.zoom),
        pitch: 0,
        bearing: 0
      }
    });
  }

  /**
   * Get elements within viewport bounds
   */
  getElementsInView(): SpatialElement[] {
    const { x, y, zoom, width = 1920, height = 1080 } = this.currentViewState;
    
    // Calculate world bounds of current viewport
    const worldWidth = width / zoom;
    const worldHeight = height / zoom;
    const bounds = {
      minX: x - worldWidth / 2,
      maxX: x + worldWidth / 2,
      minY: y - worldHeight / 2,
      maxY: y + worldHeight / 2
    };

    return this.elements.filter(element => {
      const pos = element.position;
      return (
        pos.x >= bounds.minX && pos.x <= bounds.maxX &&
        pos.y >= bounds.minY && pos.y <= bounds.maxY
      );
    });
  }

  /**
   * Animate to a specific viewport
   */
  animateToViewState(viewState: Partial<ViewState>, duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      // This would typically use deck.gl's built-in transition capabilities
      // For now, we'll just set the view state immediately
      this.setViewState(viewState);
      setTimeout(resolve, duration);
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.deck.finalize();
    this.htmlOverlay.clear();
  }
}