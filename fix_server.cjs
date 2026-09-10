const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Import requireRole
content = content.replace(
  /import \{ requireAuth, AuthRequest \} from "\.\/src\/middleware\/auth\.ts";/,
  'import { requireAuth, requireRole, AuthRequest } from "./src/middleware/auth.ts";'
);

// We need to apply requireRole to the endpoints.
content = content.replace(
  /app\.get\("\/api\/rules", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.get("/api/rules", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.post\("\/api\/rules", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.post("/api/rules", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.delete\("\/api\/rules\/:key", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.delete("/api/rules/:key", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.get\("\/api\/elements", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.get("/api/elements", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.post\("\/api\/elements", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.post("/api/elements", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.delete\("\/api\/elements\/:id", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.delete("/api/elements/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.get\("\/api\/sheet-fields", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.get("/api/sheet-fields", requireAuth, requireRole(["superadmin", "moderator", "player"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.post\("\/api\/sheet-fields", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.post("/api/sheet-fields", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.delete\("\/api\/sheet-fields\/:id", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.delete("/api/sheet-fields/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.post\("\/api\/settings", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.post("/api/settings", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.get\("\/api\/shop\/offers", requireAuth, async \(req, res\) => \{/g,
  'app.get("/api/shop/offers", requireAuth, requireRole(["superadmin", "moderator", "player"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.post\("\/api\/shop\/offers", requireAuth, async \(req, res\) => \{/g,
  'app.post("/api/shop/offers", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.delete\("\/api\/shop\/offers\/:id", requireAuth, async \(req, res\) => \{/g,
  'app.delete("/api/shop/offers/:id", requireAuth, requireRole(["superadmin"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.post\("\/api\/shop\/purchase", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.post("/api/shop/purchase", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.get\("\/api\/admin\/characters", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.get("/api/admin/characters", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {'
);
content = content.replace(
  /app\.delete\("\/api\/admin\/characters\/:id", requireAuth, async \(req: AuthRequest, res\) => \{/g,
  'app.delete("/api/admin/characters/:id", requireAuth, requireRole(["superadmin", "moderator"]), async (req: AuthRequest, res) => {'
);

fs.writeFileSync('server.ts', content);
