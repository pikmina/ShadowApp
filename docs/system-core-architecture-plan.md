# System Core Architecture Plan

## Roles & Permissions
- **Superadmin**: Full access to all modules, including system rules, catalog, settings, shop offers, and character administration.
- **Moderator**: Can manage characters, assign rewards (EXP/Yen), and grant items/inventory. Cannot modify system rules, catalog entities, sheet templates, or global settings.
- **Player (Not Fully Implemented)**: Shadowmore currently only operates with administrators and moderators. Firebase identities that do not exist as authorized superadmin/moderator in the database are rejected. There is no automatic player user creation.

## Data Flow & Truth Sources
- **User Roles**: Stored in PostgreSQL (\`users\` table). Firebase UID is merely the identity provider. Role checks (\`requireRole\`) consult the database to authorize requests.
- **Character Data**: Omitted \`profileData\` during UPDATE preserves existing data. 
- **Settings**: Loaded from \`systemRules\`. If load fails, the editor shows an error state rather than defaulting to empty values and risking a destructive overwrite.
- **System Rules (Mechanics)**: Are the source of truth for Cost of Effect (CE) calculation.
- **CE Calculation**: Abstracted to a pure domain function (\`src/domain/mechanics.ts\`). Legacy behavior for combat effects is preserved, while dynamic mechanic rules are resolved live.

## Economic Operations
- Uses explicit transactional database operations for Mod actions (assign EXP/Yen, update possessions).
- Conditional updates prevent concurrent double-spending in shop purchases.
- Global stock acts as a hard limit; \`0\` means out of stock, \`null\` means unlimited.
- Quantities and prices must be positive integers.

## Stability & Compatibility
- **Legacy Models**: The legacy models (\`ShopItem\`, \`ItemModifiers\`) are frozen.
- **Techniques Enum**: Aligned to \`technique_entitlement\` to match the database enum constraint.
- **Concurrency Control**: Character edits expect an \`updatedAt\` revision and return 409 Conflict if modified by another user.
