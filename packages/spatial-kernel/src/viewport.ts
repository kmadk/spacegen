/**
 * Viewport represents a view into infinite spatial canvas
 */
export class Viewport {
  // Position in infinite space
  public x: number = 0;
  public y: number = 0;

  // Scale (zoom level) - 1.0 = normal, <1 = zoomed out, >1 = zoomed in
  public scale: number = 1;

  // Viewport dimensions (pixels)
  public width: number = 1920;
  public height: number = 1080;

  constructor(x: number = 0, y: number = 0, scale: number = 1) {
    this.x = x;
    this.y = y;
    this.scale = scale;
  }

  /**
   * Pan the viewport by delta x and y
   */
  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /**
   * Zoom the viewport by a factor
   * factor > 1 = zoom in, factor < 1 = zoom out
   */
  zoom(factor: number): void {
    this.scale *= factor;
    // Clamp scale to reasonable bounds
    this.scale = Math.max(0.001, Math.min(1000, this.scale));
  }

  /**
   * Zoom to a specific scale
   */
  zoomTo(newScale: number): void {
    this.scale = Math.max(0.001, Math.min(1000, newScale));
  }

  /**
   * Reset viewport to origin
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
  }

  /**
   * Get string representation for debugging
   */
  toString(): string {
    return `Viewport(x:${this.x}, y:${this.y}, scale:${this.scale}x)`;
  }
}
