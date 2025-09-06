'use strict';

var hono = require('hono');

// src/index.ts
function createApp() {
  const app = new hono.Hono();
  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/action/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ action: id, rows: [], bounded: true });
  });
  return app;
}

exports.createApp = createApp;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.cjs.map