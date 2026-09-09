import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['player', 'moderator', 'superadmin']);
export const elementKindEnum = pgEnum('element_kind', [
  'trait', 'weakness', 'skill', 'equipment', 'weapon', 
  'ammunition', 'consumable', 'license', 'permission', 
  'character_resource', 'attribute_upgrade', 'technique_entitlement', 
  'altered_status', 'plus_ultra_effect', 'crafting_material', 'ingredient'
]);
export const elementStatusEnum = pgEnum('element_status', ['draft', 'published', 'archived']);
export const offerStatusEnum = pgEnum('offer_status', ['draft', 'scheduled', 'available', 'paused', 'ended', 'archived']);

// Users Table (Auth + Roles)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  role: roleEnum('role').default('player').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Characters Table
export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  exp: integer('exp').default(0).notNull(),
  yen: integer('yen').default(0).notNull(),
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
  effects: jsonb('effects').notNull().default([]), // MechanicalEffects[]
  requirements: jsonb('requirements').notNull().default({ operator: 'all', requirements: [] }), // RequirementGroup
  metadata: jsonb('metadata').default({}),
  revision: integer('revision').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Shop Offers Table
export const shopOffers = pgTable('shop_offers', {
  id: text('id').primaryKey(),
  elementId: text('element_id').references(() => systemElements.id).notNull(),
  status: offerStatusEnum('status').default('draft').notNull(),
  prices: jsonb('prices').notNull().default([]), // Array<{ currency: 'exp' | 'yen'; amount: number }>
  globalStock: integer('global_stock'), // null means unlimited
  perCharacterLimit: integer('per_character_limit'), // null means unlimited
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Element Possessions Table (Character Inventory/Traits)
export const elementPossessions = pgTable('element_possessions', {
  id: text('id').primaryKey(),
  characterId: integer('character_id').references(() => characters.id).notNull(),
  elementId: text('element_id').references(() => systemElements.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  selectedChoices: jsonb('selected_choices').default({}), // Record<string, ElementChoiceValue>
  notes: text('notes'),
  acquiredAt: timestamp('acquired_at').defaultNow(),
});

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
  name: text('name').notNull(),
  type: text('type').notNull(), // 'text', 'textarea', 'number', 'select', 'multiselect', 'checkbox', 'switch'
  category: text('category').notNull(), // e.g., 'Datos Básicos', 'Apariencia'
  options: jsonb('options').default([]), // For select/multiselect/radio
  order: integer('order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

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
export const usersRelations = relations(users, ({ many }) => ({
  characters: many(characters),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  possessions: many(elementPossessions),
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
