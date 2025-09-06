import { Viewport } from "./viewport.js";

console.log("=== TEST POINT 2.1: Pan & Zoom Methods ===");

// Create a viewport
const viewport = new Viewport();
console.log("Initial state:", viewport.toString());

// Test pan
console.log("\nTesting pan(100, 50):");
viewport.pan(100, 50);
console.log("After pan:", viewport.toString());
console.log(
  `  Position should be 100,50: ${
    viewport.x === 100 && viewport.y === 50 ? "✅" : "❌"
  }`
);

// Test zoom
console.log("\nTesting zoom(2):");
viewport.zoom(2);
console.log("After zoom:", viewport.toString());
console.log(`  Scale should be 2: ${viewport.scale === 2 ? "✅" : "❌"}`);

// Test zoom out
console.log("\nTesting zoom(0.5):");
viewport.zoom(0.5);
console.log("After zoom out:", viewport.toString());
console.log(`  Scale should be 1: ${viewport.scale === 1 ? "✅" : "❌"}`);

// Test zoomTo
console.log("\nTesting zoomTo(10):");
viewport.zoomTo(10);
console.log("After zoomTo:", viewport.toString());
console.log(`  Scale should be 10: ${viewport.scale === 10 ? "✅" : "❌"}`);

// Test reset
console.log("\nTesting reset():");
viewport.reset();
console.log("After reset:", viewport.toString());
console.log(
  `  Should be at origin: ${
    viewport.x === 0 && viewport.y === 0 && viewport.scale === 1 ? "✅" : "❌"
  }`
);

// Test bounds clamping
console.log("\nTesting zoom bounds:");
viewport.zoomTo(10000);
console.log("After zoomTo(10000):", viewport.toString());
console.log(
  `  Scale clamped to 1000: ${viewport.scale === 1000 ? "✅" : "❌"}`
);

viewport.zoomTo(0.0001);
console.log("After zoomTo(0.0001):", viewport.toString());
console.log(
  `  Scale clamped to 0.001: ${viewport.scale === 0.001 ? "✅" : "❌"}`
);

console.log("\n✅ Module 2 Complete!");
