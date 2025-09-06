import { Hono } from 'hono';

// src/index.ts
function createApp() {
  const app = new Hono();
  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/action/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ action: id, rows: [], bounded: true });
  });
  return app;
}

export { createApp };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map