const fs = require('fs');

const docContent = `# System Core Architecture Plan

## Roles & Permissions
- **Superadmin**: Full access to all modules, including system rules, catalog, settings, shop offers, and character administration.
- **Moderator**: Can manage characters, assign rewards (EXP/Yen), and grant items/inventory. Cannot modify system rules, catalog entities, sheet templates, or global settings.
- **Player**: No administrative access. Only accesses public sheets or their own characters (TBD).

## Data Flow & Truth Sources
- **User Roles**: Stored in PostgreSQL (\`users\` table). Firebase UID is merely the identity provider. Role checks (e.g., \`requireRole\`) consult the database to authorize requests.
- **Character Data**: \`profileData\` is updated via conditional merging. Missing fields do not erase existing data. \`0\` and \`false\` are treated as valid values.
- **Settings**: Loaded from \`systemRules\`. If load fails, the editor shows an error state rather than defaulting to empty values and risking a destructive overwrite.
- **System Rules (Mechanics)**: Are the source of truth for Cost of Effect (CE) calculation.
- **CE Calculation**: Abstracted to a pure domain function (\`src/domain/mechanics.ts\`). Editor views resolve CE live based on stable IDs (\`mechanicId\` and \`ruleId\`).

## Economic Operations
- Uses database transactions with conditional updates to prevent concurrent double-spending.
- Global stock acts as a hard limit; \`0\` means out of stock, \`null\` means unlimited.
- Quantities and prices must be positive integers.

## Stability & Compatibility
- **Legacy Models**: The legacy models (\`ShopItem\`, \`ItemModifiers\`) are frozen.
- **Techniques Enum**: Aligned to \`technique_entitlement\` to match the database enum constraint, preventing insert failures.
`;

fs.writeFileSync('docs/system-core-architecture-plan.md', docContent);
