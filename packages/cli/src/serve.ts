import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

interface ServeOptions {
  port?: number;
  host?: string;
}

export async function serve(
  irPath: string,
  options: ServeOptions = {}
): Promise<void> {
  const { port = 8080, host = "localhost" } = options;

  // Validate IR file exists
  if (!fs.existsSync(irPath)) {
    throw new Error(`IR file not found: ${irPath}`);
  }

  // Load IR data
  const irData = JSON.parse(fs.readFileSync(irPath, "utf8"));

  // Spatial HTML with infinite canvas
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FIR Spatial Preview - ${path.basename(irPath)}</title>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      overflow: hidden;
      user-select: none;
    }
    #app {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      cursor: grab;
    }
    #app:active {
      cursor: grabbing;
    }
    #viewport {
      transform-origin: 0 0;
      transition: transform 0.1s ease-out;
    }
    .controls {
      position: fixed;
      top: 1rem;
      right: 1rem;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 1rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      z-index: 1000;
      min-width: 200px;
    }
    .controls h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: #444;
      font-weight: 600;
    }
    .info {
      font-family: 'SF Mono', monospace;
      font-size: 0.75rem;
      color: #666;
      line-height: 1.5;
    }
    .semantic-level {
      font-weight: bold;
      color: #2563eb;
      text-transform: uppercase;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .coordinates {
      opacity: 0.7;
    }
    .error {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #ff4444;
      color: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div class="controls">
    <h3>🌌 Spatial Computing</h3>
    <div class="info">
      <div>Position: <span id="position" class="coordinates">0, 0</span></div>
      <div>Zoom: <span id="zoom-level">100%</span></div>
      <div>Nodes: ${countNodes(irData)}</div>
      <div class="semantic-level" id="semantic-level">Standard</div>
      <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb;">
        <div style="font-weight: 600; color: #444; margin-bottom: 0.25rem;">Generated Query:</div>
        <div id="query-preview" style="font-family: monospace; font-size: 0.6rem; color: #059669; background: #f0fdf4; padding: 0.25rem; border-radius: 4px; max-height: 60px; overflow-y: auto;">
          SELECT * FROM entities LIMIT 100
        </div>
      </div>
      <div style="margin-top: 0.5rem; opacity: 0.6; font-size: 0.65rem;">
        <div>🖱️ Scroll to zoom</div>
        <div>🖐️ Drag to pan</div>
        <div>🏠 Esc to home</div>
      </div>
    </div>
  </div>
  <div id="app">
    <div id="viewport"></div>
  </div>
  
  <script type="module">
    // Import the modules
    import { buildSemanticTree } from '/runtime-core.js';
    import { renderToDom } from '/adapter-web-dom.js';
    import { 
      Viewport, 
      getSemanticLevel, 
      generateQuery 
    } from '/spatial-kernel.js';
    
    // Create viewport instance
    const viewport = new Viewport(0, 0, 1);
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    
    // Drag state
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragOffset = { x: 0, y: 0 };
    
    // Elements
    const app = document.getElementById('app');
    const viewportEl = document.getElementById('viewport');
    const zoomLevel = document.getElementById('zoom-level');
    const positionEl = document.getElementById('position');
    const semanticEl = document.getElementById('semantic-level');
    const queryEl = document.getElementById('query-preview');
    
    // Load IR data
    async function loadIR() {
      try {
        const response = await fetch('/ir.json');
        return await response.json();
      } catch (error) {
        console.error('Failed to load IR:', error);
        document.body.innerHTML = '<div class="error">Failed to load IR data</div>';
        throw error;
      }
    }
    
    // Render function
    function render(ir) {
      try {
        const tree = buildSemanticTree(ir, { scale: viewport.scale });
        renderToDom(tree, viewportEl, { 
          scale: viewport.scale, 
          x: viewport.x, 
          y: viewport.y 
        });
        
        // Update UI using spatial kernel
        zoomLevel.textContent = Math.round(viewport.scale * 100) + '%';
        positionEl.textContent = Math.round(viewport.x) + ', ' + Math.round(viewport.y);
        
        // Get semantic level from spatial kernel
        const level = getSemanticLevel(viewport.scale);
        // Capitalize first letter for display
        const levelDisplay = level.charAt(0).toUpperCase() + level.slice(1);
        semanticEl.textContent = levelDisplay;
        
        // Update semantic level color (levels are lowercase from enum)
        semanticEl.style.color = {
          'quantum': '#dc2626',
          'atomic': '#ea580c',
          'molecular': '#ca8a04',
          'standard': '#2563eb',
          'system': '#7c3aed',
          'universal': '#c026d3'
        }[level] || '#2563eb';
        
        // Generate query using spatial kernel
        const query = generateQuery(viewport, 'entities');
        // Format for display
        queryEl.textContent = query.replace(/\s+/g, ' ').substring(0, 200);
      } catch (error) {
        console.error('Render error:', error);
        viewportEl.innerHTML = '<div style="padding: 2rem; text-align: center;">Render error: ' + error.message + '</div>';
      }
    }
    
    // Zoom handling (smooth and cinematic)
    app.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      
      // Use viewport zoom method
      viewport.zoom(delta);
      
      // Zoom towards mouse position
      const rect = app.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate new viewport position to zoom towards mouse
      const scaleRatio = viewport.scale / (viewport.scale / delta);
      viewport.x = mouseX - (mouseX - viewport.x) * scaleRatio;
      viewport.y = mouseY - (mouseY - viewport.y) * scaleRatio;
      
      loadIR().then(render);
    }, { passive: false });
    
    // Pan handling
    app.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      dragOffset = { x: viewport.x, y: viewport.y };
    });
    
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Reset to drag offset and apply pan delta
      viewport.x = dragOffset.x;
      viewport.y = dragOffset.y;
      viewport.pan(dx, dy);
      
      loadIR().then(render);
    });
    
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'Escape':
          // Return home using viewport reset
          viewport.reset();
          loadIR().then(render);
          break;
        case 'ArrowUp':
          viewport.pan(0, -50);
          loadIR().then(render);
          break;
        case 'ArrowDown':
          viewport.pan(0, 50);
          loadIR().then(render);
          break;
        case 'ArrowLeft':
          viewport.pan(-50, 0);
          loadIR().then(render);
          break;
        case 'ArrowRight':
          viewport.pan(50, 0);
          loadIR().then(render);
          break;
        case '+':
        case '=':
          viewport.zoom(1.2);
          loadIR().then(render);
          break;
        case '-':
          viewport.zoom(0.8);
          loadIR().then(render);
          break;
      }
    });
    
    // Initial render
    loadIR().then(render).catch(console.error);
  </script>
</body>
</html>
  `.trim();

  // Create HTTP server
  const server = http.createServer((req, res) => {
    // Enable CORS for development
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route handling
    switch (req.url) {
      case "/":
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(indexHtml);
        break;

      case "/ir.json":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(irData, null, 2));
        break;

      case "/runtime-core.js":
        try {
          const runtimeCorePath = require.resolve(
            "@fir/runtime-core/dist/index.js"
          );
          const content = fs.readFileSync(runtimeCorePath, "utf8");
          res.writeHead(200, {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          });
          res.end(content);
        } catch (error) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Failed to load runtime-core");
        }
        break;

      case "/adapter-web-dom.js":
        try {
          const adapterPath = require.resolve(
            "@fir/adapter-web-dom/dist/index.js"
          );
          const content = fs.readFileSync(adapterPath, "utf8");
          res.writeHead(200, {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          });
          res.end(content);
        } catch (error) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Failed to load adapter-web-dom");
        }
        break;

      case "/spatial-kernel.js":
        try {
          // Serve the ES module version, not CommonJS
          const kernelPath = path.join(
            path.dirname(require.resolve("@fir/spatial-kernel")),
            "index.js"
          );
          const content = fs.readFileSync(kernelPath, "utf8");
          res.writeHead(200, {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          });
          res.end(content);
        } catch (error) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Failed to load spatial-kernel: " + error.message);
        }
        break;

      case "/health":
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })
        );
        break;

      default:
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    }
  });

  // Start server
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      console.log(`\n🚀 FIR Preview Server`);
      console.log(`   Local:    http://${host}:${port}`);
      console.log(`   IR Data:  http://${host}:${port}/ir.json`);
      console.log(`   Health:   http://${host}:${port}/health`);
      console.log(`\n📄 Serving: ${irPath}`);
      console.log(`\nPress Ctrl+C to stop\n`);
      resolve();
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n\nShutting down server...");
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  });
}

// Helper function to count nodes in IR
function countNodes(ir: any): number {
  let count = 0;

  function traverse(obj: any) {
    if (!obj || typeof obj !== "object") return;

    if (obj.ui || obj.uiSummaries) {
      // Count UI nodes
      const nodes = obj.ui || obj.uiSummaries || {};
      count += Object.keys(nodes).length;
    }

    // Traverse nested objects
    for (const key in obj) {
      if (typeof obj[key] === "object") {
        traverse(obj[key]);
      }
    }
  }

  traverse(ir);
  return count;
}
