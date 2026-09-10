import "dotenv/config";
import express from "express";
import path from "node:path";
import { registerNarrationRoutes } from "./narration";
const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "microphone=(self), camera=()");
  next();
});
try {
  const { registerVoiceRoutes } = await import("./voice");
  registerVoiceRoutes(app);
} catch (error) {
  if (process.env.NODE_ENV === "production") throw error;
  app.get("/api/voice/status", (_req, res) =>
    res.json({ available: false, childReady: false }),
  );
}
registerNarrationRoutes(app);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
if (process.env.NODE_ENV === "production") {
  app.use(
    express.static(path.resolve(process.env.STATIC_DIR || "dist/client")),
  );
  app.get("/{*path}", (_req, res) =>
    res.sendFile(
      path.resolve(process.env.STATIC_DIR || "dist/client", "index.html"),
    ),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.listen(Number(process.env.PORT || 5173), "127.0.0.1", () =>
  console.log("Mermaidia: http://localhost:" + (process.env.PORT || 5173)),
);
