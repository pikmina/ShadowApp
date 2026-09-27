import { relations, sql } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, boolean, pgEnum, unique, varchar, check, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['player', 'moderator', 'superadmin']);
export const elementKindEnum = pgEnum('element_kind', [
  'trait', 'weakness', 'skill', 'equipment', 'weapon', 
  'ammunition', 'consumable', 'license', 'permission', 'certification',
  'character_resource', 'attribute_upgrade', 'technique_entitlement', 
  'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient',
  'background', 'vehicle', 'real_estate', 'clandestine_asset'
]);
export const elementStatusEnum = pgEnum('element_status', ['draft', 'published', 'archived']);
export const offerStatusEnum = pgEnum('offer_status', ['draft', 'scheduled', 'available', 'paused', 'ended', 'archived']);
export const techniqueSourceTypeEnum = pgEnum('technique_source_type', ['quirk', 'physical', 'weapon']);
export const techniqueClassificationEnum = pgEnum('technique_classification', ['offensive', 'support', 'defensive', 'control']);
export const playerStatusEnum = pgEnum('player_status', ['active', 'absent', 'inactive']);

// Users Table (Auth + Roles)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: roleEnum('role').default('player').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Canon Characters Table
export const canonCharacters = pgTable('canon_characters', {
  id: text('id').primaryKey(), // stable string ID
  name: text('name').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  aliases: jsonb('aliases').$type<string[]>().default([]).notNull(),
  summary: text('summary'),
  imageUrl: text('image_url'),
  affiliation: text('affiliation'),
  profileData: jsonb('profile_data').$type<Record<string, unknown>>().default({}).notNull(),
  active: boolean('active').default(true).notNull(),
  reserved: boolean('reserved').default(false).notNull(),
  reservedUntil: timestamp('reserved_until'),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Players Table (Manual player profiles without or with auth)
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  status: playerStatusEnum('status').default('active').notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Characters Table
export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  playerId: integer('player_id').references(() => players.id, { onDelete: 'set null' }),
  canonCharacterId: text('canon_character_id').references(() => canonCharacters.id, { onDelete: 'restrict' }).unique(),
  name: text('name').notNull(),
  exp: integer('exp').default(0).notNull(),
  yen: integer('yen').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  profileData: jsonb('profile_data').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// System Elements Table (The Catalog)
export const systemElements = pgTable('system_elements', {
  id: text('id').primaryKey(), // using stable string IDs as requested
  kind: elementKindEnum('kind').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  status: elementStatusEnum('status').default('draft').notNull(),
  effects: jsonb('effects').notNull().default([]), // MechanicalEffects[] / legacy references
  mechanicalBehaviors: jsonb('mechanical_behaviors').default([]), // MechanicalBehavior[]
  requirements: jsonb('requirements').notNull().default({ operator: 'all', requirements: [] }), // RequirementGroup
  metadata: jsonb('metadata').default({}),
  revision: integer('revision').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Shop Offers Table
export const shopOffers = pgTable('shop_offers', {
  id: text('id').primaryKey(),
  elementId: text('element_id').references(() => systemElements.id, { onDelete: 'cascade' }).notNull(),
  status: offerStatusEnum('status').default('draft').notNull(),
  prices: jsonb('prices').notNull().default([]), // Array<{ currency: 'exp' | 'yen'; amount: number }>
  requirements: jsonb('requirements').notNull().default({ operator: 'all', requirements: [] }), // RequirementGroup
  globalStock: integer('global_stock'), // null means unlimited
  perCharacterLimit: integer('per_character_limit'), // null means unlimited
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Element Possessions Table (Character Inventory/Traits)
export const elementPossessions = pgTable('element_possessions', {

  id: text('id').primaryKey(),
  characterId: integer('character_id').references(() => characters.id).notNull(),
  elementId: text('element_id').references(() => systemElements.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  equipped: boolean('equipped').default(false).notNull(),
  selectedChoices: jsonb('selected_choices').default({}), // Record<string, ElementChoiceValue>
  notes: text('notes'),
  acquiredAt: timestamp('acquired_at').defaultNow(),
}, (t) => ({
  unq: uniqueIndex('element_possessions_character_id_element_id_unique').on(t.characterId, t.elementId)
}));

// System Rules Table (Configurable Constants/Limits)
export const systemRules = pgTable('system_rules', {
  key: text('key').primaryKey(),
  type: text('type').notNull(), // 'number', 'formula', 'json'
  value: jsonb('value').notNull(),
  description: text('description').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Character Sheet Layout/Fields Table (Form Builder)
export const characterSheetFields = pgTable('character_sheet_fields', {
  id: text('id').primaryKey(),
  coreKey: text('core_key'),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'text', 'textarea', 'number', 'select', 'multiselect', 'checkbox', 'switch'
  category: text('category').notNull(), // e.g., 'Datos Básicos', 'Apariencia'
  options: jsonb('options').default([]), // For select/multiselect/radio
  order: integer('order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  coreKeyUnq: uniqueIndex('character_sheet_fields_core_key_unique').on(t.coreKey),
}));

// Character Techniques Table (Character-Owned Techniques)
export const characterTechniques = pgTable('character_techniques', {
  id: text('id').primaryKey(),
  characterId: integer('character_id').references(() => characters.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description').default(''),
  level: integer('level').default(1).notNull(),
  sourceType: techniqueSourceTypeEnum('source_type').notNull(),
  classification: techniqueClassificationEnum('classification'),
  activationAttributeId: text('activation_attribute_id'),
  mechanicalBehaviors: jsonb('mechanical_behaviors').notNull().default([]),
  revision: integer('revision').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  characterIdx: index('character_techniques_character_id_idx').on(table.characterId),
  levelCheck: check('character_techniques_level_check', sql`${table.level} >= 1 AND ${table.level} <= 5`),
}));

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actionType: text('action_type').notNull(),
  targetId: text('target_id'),
  details: jsonb('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const canonCharactersRelations = relations(canonCharacters, ({ one }) => ({
  character: one(characters, { fields: [canonCharacters.id], references: [characters.canonCharacterId] })
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  characters: many(characters),
  player: one(players, { fields: [users.id], references: [players.userId] }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  user: one(users, { fields: [players.userId], references: [users.id] }),
  characters: many(characters),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  player: one(players, { fields: [characters.playerId], references: [players.id] }),
  possessions: many(elementPossessions),
  techniques: many(characterTechniques),
  canonCharacter: one(canonCharacters, { fields: [characters.canonCharacterId], references: [canonCharacters.id] }),
  employments: many(characterEmployments),
  enrollments: many(characterEnrollments)
}));

export const characterTechniquesRelations = relations(characterTechniques, ({ one }) => ({
  character: one(characters, { fields: [characterTechniques.characterId], references: [characters.id] }),
}));

export const systemElementsRelations = relations(systemElements, ({ many }) => ({
  offers: many(shopOffers),
  possessions: many(elementPossessions),
}));

export const shopOffersRelations = relations(shopOffers, ({ one }) => ({
  element: one(systemElements, { fields: [shopOffers.elementId], references: [systemElements.id] }),
}));

export const elementPossessionsRelations = relations(elementPossessions, ({ one }) => ({
  character: one(characters, { fields: [elementPossessions.characterId], references: [characters.id] }),
  element: one(systemElements, { fields: [elementPossessions.elementId], references: [systemElements.id] }),
}));


// ==========================================
// EMPLOYS (Empleos)
// ==========================================

export const institutions = pgTable('institutions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  active: boolean('active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const departments = pgTable('departments', {
  id: varchar('id', { length: 100 }).primaryKey(),
  institutionId: varchar('institution_id', { length: 100 }).references(() => institutions.id, { onDelete: 'restrict' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  active: boolean('active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const positions = pgTable('positions', {
  id: varchar('id', { length: 100 }).primaryKey(),
  departmentId: varchar('department_id', { length: 100 }).references(() => departments.id, { onDelete: 'restrict' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  capacity: integer('capacity'), // null = unlimited
  levelId: varchar('level_id', { length: 100 }),
  riskId: varchar('risk_id', { length: 100 }),
  bonusYen: integer('bonus_yen').default(0).notNull(),
  bonusExp: integer('bonus_exp').default(0).notNull(),
  minPosts: integer('min_posts'),
  requirements: jsonb('requirements').notNull().default({ operator: 'all', requirements: [] }),
  optionalBonuses: jsonb('optional_bonuses').notNull().default([]),
  active: boolean('active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const characterEmployments = pgTable('character_employments', {
  id: varchar('id', { length: 100 }).primaryKey(),
  characterId: integer('character_id').references(() => characters.id, { onDelete: 'cascade' }),
  canonCharacterId: text('canon_character_id').references(() => canonCharacters.id, { onDelete: 'restrict' }),
  positionId: varchar('position_id', { length: 100 }).references(() => positions.id, { onDelete: 'restrict' }).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, inactive, suspended
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  requirementsVerified: boolean('requirements_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  ownerCheck: check('character_employments_exactly_one_owner', sql`num_nonnulls(${table.characterId}, ${table.canonCharacterId}) = 1`),
  activeCharacterPosition: uniqueIndex('character_employments_active_character_position').on(table.characterId, table.positionId).where(sql`${table.status} = 'active' AND ${table.characterId} IS NOT NULL`),
  activeCanonPosition: uniqueIndex('character_employments_active_canon_position').on(table.canonCharacterId, table.positionId).where(sql`${table.status} = 'active' AND ${table.canonCharacterId} IS NOT NULL`),
}));

export const employmentPayments = pgTable('employment_payments', {
  id: varchar('id', { length: 100 }).primaryKey(),
  batchId: varchar('batch_id', { length: 100 }).notNull(),
  employmentId: varchar('employment_id', { length: 100 }).notNull(),
  characterId: integer('character_id').notNull(),
  positionId: varchar('position_id', { length: 100 }).notNull(),
  characterName: varchar('character_name', { length: 255 }).notNull(),
  positionName: varchar('position_name', { length: 255 }).notNull(),
  periodLabel: varchar('period_label', { length: 100 }).notNull(),
  postsObserved: integer('posts_observed').notNull(),
  minimumPostsApproved: boolean('minimum_posts_approved').notNull(),
  breakdown: jsonb('breakdown').notNull(),
  totalYen: integer('total_yen').notNull(),
  totalExp: integer('total_exp').notNull(),
  notes: text('notes'),
  moderatorUid: text('moderator_uid').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  onePaymentPerPeriod: uniqueIndex('employment_payments_employment_period_unique').on(table.employmentId, table.periodLabel),
}));

// ==========================================
// CLASSES (Clases)
// ==========================================

export const academicYears = pgTable('academic_years', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const classGroups = pgTable('class_groups', {
  id: varchar('id', { length: 100 }).primaryKey(),
  academicYearId: varchar('academic_year_id', { length: 100 }).references(() => academicYears.id, { onDelete: 'restrict' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  courseType: varchar('course_type', { length: 100 }),
  capacity: integer('capacity').notNull(),
  active: boolean('active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const characterEnrollments = pgTable('character_enrollments', {
  id: varchar('id', { length: 100 }).primaryKey(),
  characterId: integer('character_id').references(() => characters.id, { onDelete: 'cascade' }),
  canonCharacterId: text('canon_character_id').references(() => canonCharacters.id, { onDelete: 'restrict' }),
  classGroupId: varchar('class_group_id', { length: 100 }).references(() => classGroups.id, { onDelete: 'restrict' }).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, inactive
  enrolledAt: timestamp('enrolled_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  ownerCheck: check('character_enrollments_exactly_one_owner', sql`num_nonnulls(${table.characterId}, ${table.canonCharacterId}) = 1`),
  activeCharacterEnrollment: uniqueIndex('character_enrollments_active_character').on(table.characterId).where(sql`${table.status} = 'active' AND ${table.characterId} IS NOT NULL`),
  activeCanonEnrollment: uniqueIndex('character_enrollments_active_canon').on(table.canonCharacterId).where(sql`${table.status} = 'active' AND ${table.canonCharacterId} IS NOT NULL`),
}));


// ==========================================
// NEW RELATIONS
// ==========================================

export const institutionsRelations = relations(institutions, ({ many }) => ({
  departments: many(departments),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  institution: one(institutions, { fields: [departments.institutionId], references: [institutions.id] }),
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  department: one(departments, { fields: [positions.departmentId], references: [departments.id] }),
  employments: many(characterEmployments),
}));

export const characterEmploymentsRelations = relations(characterEmployments, ({ one }) => ({
  character: one(characters, { fields: [characterEmployments.characterId], references: [characters.id] }),
  canonCharacter: one(canonCharacters, { fields: [characterEmployments.canonCharacterId], references: [canonCharacters.id] }),
  position: one(positions, { fields: [characterEmployments.positionId], references: [positions.id] }),
}));

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  classGroups: many(classGroups),
}));

export const classGroupsRelations = relations(classGroups, ({ one, many }) => ({
  academicYear: one(academicYears, { fields: [classGroups.academicYearId], references: [academicYears.id] }),
  enrollments: many(characterEnrollments),
}));

export const characterEnrollmentsRelations = relations(characterEnrollments, ({ one }) => ({
  character: one(characters, { fields: [characterEnrollments.characterId], references: [characters.id] }),
  canonCharacter: one(canonCharacters, { fields: [characterEnrollments.canonCharacterId], references: [canonCharacters.id] }),
  classGroup: one(classGroups, { fields: [characterEnrollments.classGroupId], references: [classGroups.id] }),
}));
