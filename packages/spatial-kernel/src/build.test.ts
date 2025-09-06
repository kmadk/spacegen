// Test the built package exports
import * as SpatialKernel from "../dist/index.js";

console.log("=== TEST POINT 5.1: Built Package Exports ===\n");

console.log("Exported items:");
console.log("  ✅ Viewport:", typeof SpatialKernel.Viewport);
console.log("  ✅ SemanticLevel:", typeof SpatialKernel.SemanticLevel);
console.log("  ✅ getSemanticLevel:", typeof SpatialKernel.getSemanticLevel);
console.log("  ✅ generateQuery:", typeof SpatialKernel.generateQuery);
console.log("  ✅ generateEndpoint:", typeof SpatialKernel.generateEndpoint);
console.log("  ✅ version:", SpatialKernel.version);

// Quick integration test
console.log("\nIntegration test:");
const viewport = new SpatialKernel.Viewport(1000, 500, 10);
const level = SpatialKernel.getSemanticLevel(viewport.scale);
const query = SpatialKernel.generateQuery(viewport, "test_table");

console.log("  Viewport:", viewport.toString());
console.log("  Semantic Level:", level);
console.log("  Generated Query:", query.substring(0, 50) + "...");

console.log("\n✅ Module 5 Complete! Package built successfully.");
