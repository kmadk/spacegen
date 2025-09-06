import { Viewport } from "./viewport.js";
import { generateQuery, generateEndpoint } from "./query.js";
import { getSemanticLevel } from "./semantic.js";

console.log("=== TEST POINT 4.1: Query Generation ===");

// Create viewports at different scales
const testCases = [
  { x: 1000, y: 500, scale: 0.005, name: "Quantum level" },
  { x: 1000, y: 500, scale: 0.05, name: "Atomic level" },
  { x: 1000, y: 500, scale: 0.3, name: "Molecular level" },
  { x: 1000, y: 500, scale: 1.0, name: "Standard level" },
  { x: 1000, y: 500, scale: 5.0, name: "System level" },
  { x: 1000, y: 500, scale: 20.0, name: "Universal level" },
];

console.log("SQL Queries at different zoom levels:\n");
for (const test of testCases) {
  const viewport = new Viewport(test.x, test.y, test.scale);
  const level = getSemanticLevel(test.scale);
  const query = generateQuery(viewport, "users");

  console.log(`${test.name} (${test.scale}x - ${level}):`);
  console.log("  " + query.replace(/\s+/g, " ").substring(0, 100) + "...");
  console.log("");
}

console.log("API Endpoints at different zoom levels:\n");
for (const test of testCases) {
  const viewport = new Viewport(test.x, test.y, test.scale);
  const endpoint = generateEndpoint(viewport);

  console.log(`Scale ${test.scale}x:`);
  console.log("  " + endpoint.split("?")[0] + "?...");
}

// Test changing position affects query bounds
console.log("\nEffect of position on query bounds:");
const v1 = new Viewport(0, 0, 1);
const v2 = new Viewport(5000, 5000, 1);

const q1 = generateQuery(v1, "data");
const q2 = generateQuery(v2, "data");

console.log("Position (0,0):");
console.log("  Bounds:", q1.match(/BETWEEN (-?\d+) AND (-?\d+)/g)?.[0]);
console.log("Position (5000,5000):");
console.log("  Bounds:", q2.match(/BETWEEN (-?\d+) AND (-?\d+)/g)?.[0]);

console.log("\n✅ Module 4 Complete!");
