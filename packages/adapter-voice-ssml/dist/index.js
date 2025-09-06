// src/index.ts
function renderToVoice(tree) {
  const parts = [];
  parts.push(`App view. Level ${tree.level}.`);
  for (const c of tree.children) {
    if (c.type === "summary") parts.push(`Summary: ${c.summary}`);
    else parts.push(`Node: ${c.type}${c.id ? " (" + c.id + ")" : ""}`);
  }
  return parts.join(" ");
}

export { renderToVoice };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map