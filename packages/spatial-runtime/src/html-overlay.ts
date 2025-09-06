/**
 * HTML Overlay System - Manages HTML elements positioned in spatial coordinates
 * This allows forms and interactive elements to work alongside deck.gl canvas
 */

import type { ViewState, WorldPosition, ScreenPosition } from './types.js';

export interface HTMLOverlayElement {
  /** Unique identifier */
  id: string;
  /** HTML element */
  element: HTMLElement;
  /** Position in world coordinates */
  worldPosition: WorldPosition;
  /** Current screen position (updated during viewport changes) */
  screenPosition: ScreenPosition;
  /** Whether the element is currently visible */
  visible: boolean;
  /** Z-index for layering */
  zIndex: number;
}

export class HTMLOverlaySystem {
  private elements = new Map<string, HTMLOverlayElement>();
  private container: HTMLElement;
  private viewState: ViewState = { x: 0, y: 0, zoom: 1 };

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupOverlayContainer();
  }

  /**
   * Set up the HTML overlay container
   */
  private setupOverlayContainer(): void {
    // Create overlay container if it doesn't exist
    let overlayContainer = this.container.querySelector('.html-overlay') as HTMLElement;
    
    if (!overlayContainer) {
      overlayContainer = document.createElement('div');
      overlayContainer.className = 'html-overlay';
      overlayContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;
      this.container.appendChild(overlayContainer);
    }

    this.container = overlayContainer;
  }

  /**
   * Add an HTML element at world coordinates
   */
  addElement(
    id: string,
    element: HTMLElement,
    worldPosition: WorldPosition,
    zIndex: number = 1
  ): void {
    // Enable pointer events for this element
    element.style.pointerEvents = 'auto';
    
    // Calculate initial screen position
    const screenPosition = this.worldToScreen(worldPosition);
    
    // Style the element for spatial positioning
    element.style.position = 'absolute';
    element.style.transform = `translate(${screenPosition.x}px, ${screenPosition.y}px) scale(${this.viewState.zoom})`;
    element.style.transformOrigin = '0 0';
    element.style.zIndex = zIndex.toString();
    element.style.willChange = 'transform';
    
    // Add to DOM
    this.container.appendChild(element);
    
    // Store in our tracking map
    this.elements.set(id, {
      id,
      element,
      worldPosition,
      screenPosition,
      visible: true,
      zIndex
    });
  }

  /**
   * Remove an HTML element
   */
  removeElement(id: string): void {
    const overlayElement = this.elements.get(id);
    if (overlayElement) {
      this.container.removeChild(overlayElement.element);
      this.elements.delete(id);
    }
  }

  /**
   * Update element position in world coordinates
   */
  updateElementPosition(id: string, worldPosition: WorldPosition): void {
    const overlayElement = this.elements.get(id);
    if (overlayElement) {
      overlayElement.worldPosition = worldPosition;
      const screenPosition = this.worldToScreen(worldPosition);
      overlayElement.screenPosition = screenPosition;
      this.updateElementTransform(overlayElement);
    }
  }

  /**
   * Update transforms for all elements when viewport changes
   */
  updateTransform(viewState: ViewState): void {
    this.viewState = viewState;
    
    for (const overlayElement of this.elements.values()) {
      // Calculate new screen position
      const screenPosition = this.worldToScreen(overlayElement.worldPosition);
      overlayElement.screenPosition = screenPosition;
      
      // Update visibility based on viewport bounds
      const isVisible = this.isElementVisible(overlayElement);
      overlayElement.visible = isVisible;
      
      if (isVisible) {
        this.updateElementTransform(overlayElement);
      } else {
        // Hide off-screen elements for performance
        overlayElement.element.style.display = 'none';
      }
    }
  }

  /**
   * Update the transform of a single element
   */
  private updateElementTransform(overlayElement: HTMLOverlayElement): void {
    const { screenPosition } = overlayElement;
    const { zoom } = this.viewState;
    
    overlayElement.element.style.display = 'block';
    overlayElement.element.style.transform = 
      `translate(${screenPosition.x}px, ${screenPosition.y}px) scale(${zoom})`;
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  private worldToScreen(worldPosition: WorldPosition): ScreenPosition {
    const { x: viewX, y: viewY, zoom } = this.viewState;
    
    return {
      x: (worldPosition.x - viewX) * zoom + (this.container.clientWidth / 2),
      y: (worldPosition.y - viewY) * zoom + (this.container.clientHeight / 2)
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPosition: ScreenPosition): WorldPosition {
    const { x: viewX, y: viewY, zoom } = this.viewState;
    
    return {
      x: (screenPosition.x - this.container.clientWidth / 2) / zoom + viewX,
      y: (screenPosition.y - this.container.clientHeight / 2) / zoom + viewY
    };
  }

  /**
   * Check if an element is visible in the current viewport
   */
  private isElementVisible(overlayElement: HTMLOverlayElement): boolean {
    const { screenPosition } = overlayElement;
    const margin = 100; // Pixels margin for smooth entry/exit
    
    return (
      screenPosition.x >= -margin &&
      screenPosition.x <= this.container.clientWidth + margin &&
      screenPosition.y >= -margin &&
      screenPosition.y <= this.container.clientHeight + margin
    );
  }

  /**
   * Get all elements within a world bounds area
   */
  getElementsInBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }): HTMLOverlayElement[] {
    return Array.from(this.elements.values()).filter(element => {
      const pos = element.worldPosition;
      return (
        pos.x >= bounds.minX &&
        pos.x <= bounds.maxX &&
        pos.y >= bounds.minY &&
        pos.y <= bounds.maxY
      );
    });
  }

  /**
   * Clear all elements
   */
  clear(): void {
    for (const overlayElement of this.elements.values()) {
      this.container.removeChild(overlayElement.element);
    }
    this.elements.clear();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalElements: number;
    visibleElements: number;
    hiddenElements: number;
  } {
    const totalElements = this.elements.size;
    const visibleElements = Array.from(this.elements.values()).filter(e => e.visible).length;
    
    return {
      totalElements,
      visibleElements,
      hiddenElements: totalElements - visibleElements
    };
  }
}