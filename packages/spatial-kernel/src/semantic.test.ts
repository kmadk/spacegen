import {
  SemanticLevel,
  getSemanticLevel,
  getSemanticDescription,
  getDataGranularity,
} from "./semantic.js";

console.log("=== TEST POINT 3.1: Semantic Levels ===");

// Test scale to semantic level mapping
const testScales = [
  { scale: 0.005, expected: SemanticLevel.Quantum },
  { scale: 0.05, expected: SemanticLevel.Atomic },
  { scale: 0.3, expected: SemanticLevel.Molecular },
  { scale: 1.0, expected: SemanticLevel.Standard },
  { scale: 5.0, expected: SemanticLevel.System },
  { scale: 20.0, expected: SemanticLevel.Universal },
];

console.log("Testing scale to semantic level:");
for (const test of testScales) {
  const level = getSemanticLevel(test.scale);
  const pass = level === test.expected;
  console.log(
    `  Scale ${test.scale.toFixed(3)} = ${level} ${pass ? "✅" : "❌"}`
  );
}

// Test descriptions
console.log("\nSemantic level descriptions:");
for (const level of Object.values(SemanticLevel)) {
  const desc = getSemanticDescription(level as SemanticLevel);
  console.log(`  ${level}: ${desc}`);
}

// Test data granularity
console.log("\nData granularity by level:");
for (const level of Object.values(SemanticLevel)) {
  const gran = getDataGranularity(level as SemanticLevel);
  console.log(
    `  ${level}: ${gran.rowLimit} rows, ${gran.aggregation} aggregation`
  );
}

// Practical example
console.log("\nPractical example - zooming through data:");
const scales = [0.001, 0.1, 1, 10, 100];
for (const scale of scales) {
  const level = getSemanticLevel(scale);
  const gran = getDataGranularity(level);
  console.log(`  Zoom ${scale}x → ${level} → Show ${gran.rowLimit} rows`);
}

console.log("\n✅ Module 3 Complete!");
