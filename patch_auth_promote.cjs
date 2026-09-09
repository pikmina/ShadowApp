const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We intercept /api/auth/sync and promote saxagenia@gmail.com to superadmin if they aren't already.
code = code.replace(
  'const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "");',
  `let dbUser = await getOrCreateUser(req.user.uid, req.user.email || "");
      
      // Auto-promote specific email to superadmin
      if (req.user.email === 'saxagenia@gmail.com' && dbUser.role !== 'superadmin') {
        const { db } = await import("./src/db/index.ts");
        const { users } = await import("./src/db/schema.ts");
        const { eq } = await import("drizzle-orm");
        
        [dbUser] = await db.update(users)
          .set({ role: 'superadmin' })
          .where(eq(users.uid, req.user.uid))
          .returning();
      }`
);

fs.writeFileSync('server.ts', code);
