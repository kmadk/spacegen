// src/index.ts
function renderToDom(tree, mountEl, camera = { scale: 1, x: 0, y: 0 }) {
  mountEl.innerHTML = "";
  const canvas = document.createElement("div");
  canvas.style.transformOrigin = "0 0";
  canvas.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
  canvas.style.willChange = "transform";
  canvas.style.position = "absolute";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  if (tree && tree.children) {
    renderNodes(tree.children, canvas, camera.scale);
  }
  mountEl.appendChild(canvas);
}
function renderNodes(nodes, container, scale) {
  nodes.forEach((node, index) => {
    const element = createNodeElement(node, scale, index);
    container.appendChild(element);
    if (node.children && node.children.length > 0) {
      renderNodes(node.children, element, scale);
    }
  });
}
function createNodeElement(node, scale, index) {
  const el = document.createElement("div");
  el.style.padding = "20px";
  el.style.border = "2px solid #ddd";
  el.style.borderRadius = "8px";
  el.style.background = "white";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  el.style.position = "absolute";
  el.style.left = `${100 + index % 3 * 300}px`;
  el.style.top = `${100 + Math.floor(index / 3) * 250}px`;
  el.style.width = "250px";
  const header = document.createElement("div");
  header.style.marginBottom = "10px";
  header.style.fontSize = "14px";
  header.style.color = "#666";
  header.innerHTML = `<strong>${node.type}</strong> ${node.id ? `(${node.id})` : ""}`;
  el.appendChild(header);
  switch (node.type) {
    case "ui.frame":
      el.style.background = "#f5f5f5";
      el.style.minHeight = "200px";
      break;
    case "ui.table":
      renderTable(el, node, scale);
      break;
    case "ui.chart":
      renderChart(el, node, scale);
      break;
    case "summary":
      renderSummary(el, node);
      break;
    default:
      el.innerHTML += `<div style="color: #999;">Unknown node type: ${node.type}</div>`;
  }
  return el;
}
function renderTable(container, node, scale) {
  const sampleRows = node.renderHints?.sampleRows || 10;
  const visibleRows = scale < 0.5 ? 3 : Math.min(sampleRows, 10);
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = scale < 0.5 ? "10px" : "14px";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>ID</th><th>Name</th><th>Status</th></tr>";
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  for (let i = 0; i < visibleRows; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding: 8px; border: 1px solid #ddd;">${i + 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">User ${i + 1}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">Active</td>
    `;
    tbody.appendChild(tr);
  }
  if (sampleRows > visibleRows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3" style="padding: 8px; text-align: center; color: #999;">... ${sampleRows - visibleRows} more rows</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}
function renderChart(container, node, scale) {
  const chartContainer = document.createElement("div");
  chartContainer.style.width = "100%";
  chartContainer.style.height = scale < 0.5 ? "100px" : "200px";
  chartContainer.style.background = "#f0f0f0";
  chartContainer.style.borderRadius = "4px";
  chartContainer.style.display = "flex";
  chartContainer.style.alignItems = "flex-end";
  chartContainer.style.padding = "10px";
  chartContainer.style.gap = "4px";
  const bars = scale < 0.5 ? 5 : 10;
  for (let i = 0; i < bars; i++) {
    const bar = document.createElement("div");
    bar.style.flex = "1";
    bar.style.height = `${Math.random() * 80 + 20}%`;
    bar.style.background = "#4CAF50";
    bar.style.borderRadius = "2px";
    chartContainer.appendChild(bar);
  }
  container.appendChild(chartContainer);
}
function renderSummary(container, node) {
  const summary = document.createElement("div");
  summary.style.padding = "10px";
  summary.style.background = "#fffbf0";
  summary.style.border = "1px solid #f0e0c0";
  summary.style.borderRadius = "4px";
  summary.style.fontStyle = "italic";
  summary.style.color = "#666";
  summary.textContent = node.summary || "Summary view";
  container.appendChild(summary);
}

export { renderToDom };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map