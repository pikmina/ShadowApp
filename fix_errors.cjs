const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace('app.post("/api/shop/purchase", requireAuth, async (req, res) => {', 'app.post("/api/shop/purchase", requireAuth, async (req: AuthRequest, res) => {');
serverCode = serverCode.replace('app.get("/api/admin/characters", requireAuth, async (req, res) => {', 'app.get("/api/admin/characters", requireAuth, async (req: AuthRequest, res) => {');
fs.writeFileSync('server.ts', serverCode);

let shopCode = fs.readFileSync('src/db/shop.ts', 'utf8');
shopCode = shopCode.replace('const price = offer.prices.find((p: any) => p.currency === selectedCurrency);', 'const price = (offer.prices as any[]).find((p: any) => p.currency === selectedCurrency);');
fs.writeFileSync('src/db/shop.ts', shopCode);

let psCode = fs.readFileSync('src/views/PlayerSheet.tsx', 'utf8');
psCode = psCode.replace('import { Shield, Target, Plus, Search, Filter, ShieldHalf, Activity, Sparkles, Zap, Package, Eye } from "lucide-react";', 'import { Shield, Target, Plus, Search, Filter, ShieldHalf, Activity, Sparkles, Zap, Package, Eye, FileText, AlertTriangle } from "lucide-react";');
fs.writeFileSync('src/views/PlayerSheet.tsx', psCode);
