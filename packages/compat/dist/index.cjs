'use strict';

// src/index.ts
var ALLOWED_KINDS = /* @__PURE__ */ new Set([
  "ui.frame",
  "ui.table",
  "ui.chart",
  "ui.summary",
  "policy.role",
  "action.query",
  "action.mutate",
  "action.call_http"
]);
function lintCompat(ir) {
  const messages = [];
  const uiNodes = ir.ui?.nodes ?? [];
  let portable = 0;
  for (let i = 0; i < uiNodes.length; i++) {
    const n = uiNodes[i];
    if (ALLOWED_KINDS.has(n.kind)) portable++;
    else messages.push({ level: "WARN", path: `/ui/nodes/${i}`, message: `kind '${n.kind}' not in portable subset` });
  }
  const total = uiNodes.length || 1;
  const dci = Math.round(portable / total * 100);
  if (ir.meta?.strictMode) {
    for (const m of messages) m.level = "ERROR";
  }
  return { messages, dci };
}

exports.lintCompat = lintCompat;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.cjs.map