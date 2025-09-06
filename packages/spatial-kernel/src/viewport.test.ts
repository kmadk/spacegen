import { Viewport } from "./viewport.js";

console.log("=== TEST POINT 1.2: Basic Viewport ===");

// Test 1: Create default viewport
const viewport1 = new Viewport();
console.log("Default viewport:", viewport1.toString());
console.log(`  Position: ${viewport1.x},${viewport1.y}`);
console.log(`  Scale: ${viewport1.scale}`);

// Test 2: Create viewport with custom values
const viewport2 = new Viewport(1000, 500, 2);
console.log("\nCustom viewport:", viewport2.toString());
console.log(`  Position: ${viewport2.x},${viewport2.y}`);
console.log(`  Scale: ${viewport2.scale}`);

console.log("\n✅ Module 1 Complete!");
