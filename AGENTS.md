# AGENTS.md

The agent is responsible for leaving the repository in a clean state.
Temporary artifacts created during investigation or implementation must not remain in the repository unless they have a deliberate project purpose.

# Development Process — REQUIRED

Every task MUST follow this development process before it can be considered complete.

These rules are **mandatory**, not suggestions.

The primary objective is to prevent:

* existing persisted data from being overwritten
* defaults being applied during LOAD or UPDATE
* hydration from replacing valid data
* calculations from running at the wrong lifecycle stage
* changes being made without understanding the complete data flow
* unrelated regressions caused by unnecessary refactoring

---

# NON-NEGOTIABLE EXECUTION RULES

## 1. Do Not Edit Before Investigating

Do NOT modify code immediately after finding the first apparently relevant function.

Before editing, you MUST:

1. Identify the requested behavior.
2. Identify all potentially affected files/components/services.
3. Identify the source of truth for every affected value.
4. Trace the complete data flow.
5. Determine whether the affected data already exists in persisted records.
6. Identify possible overwrite points.
7. Classify the change by risk.

If any of this information is unclear, **search the codebase before editing**.

Do not resolve uncertainty by guessing, adding a fallback, or introducing a new default.

---

## 2. Always Identify the Source of Truth

For every affected value, identify its authoritative source.

Examples:

```text
Firestore document
    → persisted character data

Context
    → application state derived from persisted data

Component state
    → temporary UI state

Calculation
    → derived value, not necessarily persisted source data

Default
    → value used only when creating missing data
```

Never treat a derived value, component initialization value, fallback, or default as authoritative when valid persisted data already exists.

---

## 3. Never Overwrite Existing Data Automatically

Existing persisted or user-entered data MUST NOT be overwritten by:

* defaults
* placeholders
* fallback values
* automatic initialization
* component mounting
* `useEffect`
* state synchronization
* reload
* hydration
* recalculation

unless the requested feature explicitly requires that behavior.

A value being technically recalculable does NOT mean it should be recalculated automatically.

---

# CREATE / LOAD / UPDATE / IMPORT / RESET

These operations MUST be treated as separate behaviors.

```text
CREATE
  → apply defaults only to missing fields

LOAD
  → restore persisted data exactly

UPDATE
  → modify explicitly changed data

IMPORT
  → normalize external data while preserving supplied values

RESET
  → intentionally restore defaults
```

Never apply CREATE behavior automatically during LOAD or UPDATE.

A function that is used by multiple workflows MUST NOT assume that all callers are creating new data.

---

# DEVELOPMENT PHASES

## Phase 1 — Understand Before Editing

Before changing code, identify:

* What feature or behavior is being modified.
* Which files are involved.
* Which components are involved.
* Which hooks are involved.
* Which contexts/services are involved.
* Whether the change affects:

  * UI
  * component state
  * context state
  * calculations
  * validation
  * persistence
  * configuration
  * database data
* Whether affected data already exists in persisted records.
* Whether the affected values are user-entered, calculated, defaulted, or imported.

Before editing, explicitly establish:

```text
Affected files:
Affected components:
Affected fields:
Source of truth:
Persistence involved:
Risk level:
Potential overwrite points:
```

Do not begin implementation until this is understood.

---

# Phase 2 — Trace the Complete Data Flow

For every affected field, state variable, calculation, or persisted value, trace its complete lifecycle.

Use this model:

```text
Input
  ↓
Component State
  ↓
Validation / Transformation
  ↓
Save / Submit
  ↓
Context / Service
  ↓
Database
  ↓
Load / Hydration
  ↓
Component State
  ↓
UI
```

Search the codebase for:

* where the value is created
* where it is initialized
* where it is calculated
* where it is transformed
* where it is validated
* where it is saved
* where it is loaded
* where it is hydrated
* where it is displayed
* where it is edited
* where it can be overwritten
* where it is reset
* every function that calls the affected calculation

Do not assume the first occurrence found is the source of the bug.

---

# Phase 3 — Protect Existing Data

Before assigning any default, fallback, or calculated value, determine whether a valid value already exists.

For every assignment, ask:

```text
Does this value already exist?

If yes:
    preserve it unless the user explicitly changed it.

If no:
    determine whether CREATE behavior allows a default.

If the value is calculated:
    determine whether it should be derived or persisted.

If unclear:
    investigate before assigning anything.
```

Never introduce a fallback simply because a value might be missing.

---

# Phase 4 — Calculated Values

When modifying a calculated value, inspect BOTH:

1. The calculation itself.
2. Every place where that calculation is executed.

Verify:

* inputs
* output
* initialization
* lifecycle timing
* reload behavior
* hydration behavior
* editing behavior
* save behavior
* persistence
* whether the calculated result overwrites stored data
* whether the calculation runs more than once
* whether another process can overwrite its result

A mathematically correct calculation executed at the wrong lifecycle stage is still a bug.

---

# Phase 5 — React Lifecycle Protection

When working with React, pay special attention to:

* `useState`
* `useEffect`
* `useMemo`
* `useCallback`
* context providers
* initialization functions
* hydration logic
* asynchronous database loading

Before modifying any `useEffect` that reads or writes persisted or calculated data, identify:

* what triggers it
* what state it reads
* what state it writes
* whether it runs before hydration
* whether it runs after hydration
* whether it runs again after user edits
* whether it can overwrite persisted data
* whether it can trigger another state update

A `useEffect` that is technically valid can still be incorrect if it executes at the wrong lifecycle stage.

Do not use component mounting or a `useEffect` as an automatic initialization mechanism until it has been verified that doing so cannot overwrite persisted data.

### Hook Execution Rules

* Execute hooks always in the exact same order and quantity across renders.
* Do NOT declare hooks after conditional returns, nor inside conditions or loops.
* Review transitions between loading, error, missing data, and available data states.
* Verify initial loading without cache and opening with cached data when modifying components with asynchronous loading.
* Verify that the arrival or revalidation of data does not reinitialize forms with pending user changes.

---

# Phase 6 — Missing Values vs Falsy Values

Never use truthiness to determine whether persisted data is missing unless falsy values are explicitly invalid.

Do not blindly use:

```js
value || defaultValue
```

because valid values such as these may be lost:

```text
0
false
""
```

Distinguish between:

```text
missing
undefined
null
empty string
0
false
```

Use nullish checks only when `null` and `undefined` are actually the intended definition of "missing".

For example:

```js
value ?? defaultValue
```

may be appropriate where `0` and `false` are valid values.

---

# Phase 7 — Minimal Safe Change

Implement the smallest change that solves the requested problem.

Do NOT:

* refactor unrelated code
* rename unrelated variables
* redesign existing architecture
* replace working implementations unnecessarily
* modify unrelated components
* change gameplay rules without explicit instruction
* change database schemas without explicit need
* introduce migrations without identifying affected existing data

If a broader refactor is necessary, explicitly identify:

```text
Why the refactor is necessary:
Files affected:
Existing behavior affected:
Data affected:
Risk:
```

Do not expand the scope merely because an alternative architecture appears cleaner.

# Phase 7.1 — Temporary Files & Repository Cleanup

Keep the repository clean.

When development tools, scripts, tests, builds, generators, debugging processes, or code modifications create temporary or disposable files, the agent MUST remove them before completing the task if they are not required by the project.

Examples of files that may need cleanup:

* temporary test files
* debugging files
* generated screenshots
* generated JSON or CSV files used only for investigation
* temporary exports
* temporary patches
* copied files created for experimentation
* generated logs
* temporary build artifacts
* one-off scripts
* migration/debugging scripts that were explicitly created only for the current task
* duplicated files created during experimentation
* intermediate generated files

Before deleting a file, verify that it is NOT:

* imported by the application
* referenced by another file
* required by the build
* required by tests
* required by deployment
* part of the project's configuration
* part of the source code
* intentionally generated and committed
* required as documentation
* required by a development workflow
* required by CI/CD
* required by a plugin, framework, or external integration

Never delete a file solely because it appears unused.

Search for references before deleting files when there is any uncertainty.

## Generated File Rule

If a file is generated only for the current task and has no permanent purpose:

```text
CREATE
  ↓
USE
  ↓
VERIFY
  ↓
DELETE
```

Do not leave disposable files in the repository after completing the task.

## Before Completion

Perform a repository cleanup check:

```text
[ ] No temporary debugging files remain
[ ] No disposable test files remain
[ ] No generated investigation files remain
[ ] No unnecessary copies remain
[ ] No temporary logs remain
[ ] No one-off scripts remain unless intentionally required
[ ] No unnecessary build artifacts were added
[ ] No files required by the project were accidentally deleted
[ ] Git changes contain only intentional files
```

When possible, inspect the final changed-file list before completing the task.

The final repository should contain only files that have an intentional and documented purpose.

---

# Phase 8 — Persistence Verification

For ANY change involving persisted data, verify the complete lifecycle.

At minimum:

```text
1. Create or modify data.
2. Save.
3. Verify the save payload.
4. Verify the database value.
5. Reload the page/application.
6. Load the existing record.
7. Verify hydration.
8. Edit another field.
9. Save again.
10. Reload again.
11. Verify previously persisted values remain unchanged.
```

Compare values before and after reload.

Verify:

```text
Before save:
  original value
  intended new value

Save:
  final payload

After save:
  persisted database value

After reload:
  hydrated value
  component state value
  displayed value

After editing another field:
  previously persisted value

After second reload:
  previously persisted value
```

Existing values must remain unchanged unless intentionally modified.

---

# Phase 9 — Regression Verification

Classify every change.

## LOW RISK

Examples:

* CSS
* visual styling
* static text
* isolated presentation changes

Required verification:

* affected UI
* obvious related regression checks

---

## MEDIUM RISK

Examples:

* component state
* forms
* validation
* UI behavior
* local calculations

Required verification:

* global search of affected properties/functions
* relevant state flow
* related UI behavior
* build/lint

---

## HIGH RISK

Examples:

* Context
* Firestore/database
* authentication
* initialization
* hydration/reload
* shared types
* calculations
* economy/progression
* character data
* migrations
* shared services

HIGH-RISK changes MUST include:

* global search of affected properties/functions
* complete data-flow inspection
* persistence verification
* build/lint verification
* regression check of related functionality
* verification that existing records are preserved

---

# STOP CONDITIONS

Stop and investigate BEFORE editing if:

* the source of truth is unclear
* the affected value exists in multiple places
* CREATE and LOAD behavior are not clearly separated
* a persisted value may be overwritten during initialization
* a calculation has multiple execution points that have not been inspected
* hydration behavior is unclear
* the save payload has not been identified
* existing records may be affected
* a default may overwrite a valid value
* a fallback may overwrite a valid falsy value
* the lifecycle responsible for the behavior is unclear
* required verification cannot be performed

Never "fix" uncertainty by adding a default or fallback.

---

# REQUIRED PRE-EDIT REPORT

Before making a non-trivial code change, provide a concise investigation summary:

```text
## Investigation

Feature:
Affected files:
Affected components:
Affected data:
Source of truth:
Persistence:
Data flow:
Potential overwrite points:
Calculation involved:
Lifecycle involved:
Risk level:
Planned minimal change:
```

For trivial LOW-RISK changes, this report may be abbreviated.

---

# REQUIRED POST-EDIT VERIFICATION

Before declaring the task complete, verify:

```text
[ ] Only necessary files were changed
[ ] Source of truth was identified
[ ] Complete data flow was inspected
[ ] CREATE and LOAD behavior are separated
[ ] UPDATE behavior does not overwrite unrelated data
[ ] Existing persisted values are preserved
[ ] Defaults only apply where appropriate
[ ] Falsy values are handled correctly
[ ] Calculations were inspected
[ ] Every execution point of affected calculations was inspected
[ ] Initialization cannot overwrite persisted data
[ ] Hydration cannot overwrite persisted data
[ ] Final save payload was verified
[ ] Reload behavior was verified
[ ] Existing records were checked for preservation
[ ] Build was run
[ ] Lint was run
[ ] Related functionality was regression-checked
[ ] No unrelated refactoring was introduced
```

If a verification step cannot be performed, explicitly state:

```text
NOT VERIFIED:
Reason:
Potential impact:
```

Do not claim that something was verified when it was not.

---

# FINAL SELF-REVIEW

Before declaring the task complete, ask:

1. Did I change only what was necessary?
2. Did I identify the source of truth for every affected value?
3. Could any new default overwrite existing data?
4. Could initialization overwrite persisted data?
5. Could hydration overwrite persisted data?
6. Could a `useEffect` run at the wrong lifecycle stage?
7. Could a fallback overwrite a valid `0`, `false`, or empty value?
8. Did I modify a calculated value?
9. Did I inspect every place where that calculation executes?
10. Did I verify CREATE and LOAD separately?
11. Did I verify UPDATE behavior?
12. Did I verify the final save payload?
13. Did I verify persistence after reload?
14. Did I verify existing records are preserved?
15. Did I run build/lint?
16. Did I check for unrelated regressions?

Only after these checks may the task be considered complete.

---

# STABLE REFERENCES AND ATOMIC PERSISTENCE

## Use Stable IDs for Entity Relationships

Relationships between persisted entities MUST use stable unique IDs as their authoritative references. Human-readable names, labels, and descriptions are presentation data and MUST NOT be used as identity when creating, updating, deleting, assigning, or synchronizing related records.

For existing legacy records that contain names instead of IDs, resolve the relationship only when the match is unambiguous. Do not guess, use partial-name matching, or silently assign an arbitrary entity. Preserve unresolved legacy data and report it for explicit correction or migration.

## Save Related Changes Atomically

When one user action modifies multiple related documents or records, persist all required changes as one atomic operation whenever the storage system supports it. Audit records that describe the action should be included in the same operation.

The UI MUST await the completed operation before showing success, navigating away, clearing the form, consuming a resource, or applying an optimistic state that could appear committed. If the operation fails, preserve the user's input, report the failure, and ensure no partial related state is treated as successfully saved.

---
# CORE PRINCIPLE

**Understand first. Trace completely. Preserve existing data. Separate CREATE from LOAD. Calculate only at the correct lifecycle stage. Make the smallest safe change. Verify persistence. Then declare the task complete.**

---

# LEGACY MODEL FREEZE

The current `ShopItem`, `ItemModifiers`, `InventoryItem`, and free-form requirement models are frozen while the System Catalog core is designed and introduced.

Do not add new structural fields, effect kinds, requirement formats, rule tables, or identity relationships to these legacy models. Do not extend the Shop administrator into a broader rules editor.

Allowed changes are limited to:

* defects that block current development or corrupt test data;
* security or authentication defects;
* build and test failures;
* small adapters required to move an existing consumer to the new core;
* deletion of legacy code after its replacement is verified.

New system concepts must first be defined in the core architecture contract. If a requested feature would expand a frozen model, stop and identify the required `SystemElement`, `MechanicalEffect`, `Requirement`, `ShopOffer`, or reference contract instead.

---

# SYSTEM ELEMENT VERIFICATION

For changes that affect creation, editing, loading, persistence, publication, or deletion of system elements, verify the complete disposable-record lifecycle whenever the configured environment permits it:

```text
CREATE TEST ELEMENT
  → SAVE
  → LOAD AND COMPARE
  → EDIT
  → SAVE AGAIN
  → RELOAD AND COMPARE
  → DELETE THE TEST ELEMENT
  → CONFIRM IT NO LONGER EXISTS
```

Use an unmistakably temporary draft and remove it before completion. Never run this lifecycle against an existing user-created element. If remote rules, authentication, or environment access prevent the real persistence check, cover the lifecycle with automated tests and explicitly report that the remote check remains unverified.

---

# MECHANICAL EFFECT CONTRACT — REQUIRED

Before changing system mechanics, CE rules, element effects, techniques, targeting, combat execution, or their persistence, read:

* `docs/system-core-architecture-plan.md`
* `docs/mechanical-effects-contract.md`
* `src/domain/systemMechanics.ts`

The canonical contract centralizes reusable behavior and Stamina execution cost in System Rules. Catalog and Techniques apply those mechanics through stable references.

Mandatory rules:

* `CE` means `Coste de Estamina`. Never describe or implement it as design cost, construction points, power, balance, price, EXP, or currency.
* System Rules are the source of truth for scope, executable effect values and additional CE. Independent component options define targeting, quantity, range, area, duration, activation, cooldown, conditions, usage and consequences. Category targeting remains a compatibility fallback. See the updated mechanical-effects contract.
* Only the closed `effect.type` of a global option defines executable behavior. Names, descriptions, `logicalType`, badges, and icons never execute mechanics.
* `offensive` is a classification and `damage` is the behavior that reduces Health. Do not create parallel effects or properties for synonyms such as Damage/Offensive or Healing/Support.
* Catalog and Techniques MUST NOT recapture behavior already defined in System Rules. They persist only `applicationId`, `mechanicId`, `ruleId`, and optional local `groupId`, and may combine multiple references. No mechanical values belong in the reference.
* Do not persist copied `cost`, `ruleName`, `mechDesc`, dice, amount, target, or resolution in an applied reference. Resolve current values from `system_rules/system_mechanics`; broken references invalidate execution.
* `system_rules/stamina_execution_costs` is the source of truth for minimum action, object-use, technique-level, and active-skill-level Stamina costs. Final CE is the greater of the contextual minimum and the sum of active option costs; never add the minimum twice.
* Passive mechanics always cost 0 Stamina. They exist continuously on the bearer and must never be charged on equip, load, hydration, or turn processing.
* Use semantic fields such as `attributeId`, `statId`, `statusElementId`, `resourceId`, `currencyId`, and `ruleId`. Do not reintroduce the overloaded legacy `target` or `value` property.
* Every category targeting contract uses entity kinds, relationship, selection, minimum targets, and maximum targets. Area is a selection mode, not a relationship. `self` always selects exactly one direct target.
* Changing an effect type creates a clean variant. Do not retain hidden properties from the previous type.
* Validate canonical effects and system mechanics at the API boundary. Broken or duplicate references invalidate publication; they must not silently become zero-cost effects.
* Preserve legacy records until an explicit migration. Do not infer the behavior of a legacy `mechanic_rule` from its category name and do not normalize persisted effects during hydration.
* Keep one shared mechanic selector for Catálogo and Técnicas. The executable option editor belongs only to Reglas del Sistema.

Any new effect type or targeting dimension requires a coordinated update to the architecture document, domain schema, validator, engine, API validation, tests, and every active consumer.

---

# UI COMPONENT POLICY

When implementing or modifying interface controls, first check whether the project already contains a compatible shadcn/ui component.

If the component is not present but shadcn/ui provides a compatible primitive, add it to `src/components/ui` and use that shared implementation. Keep shadcn/ui primitives reusable and free of Shadowmore-specific business rules.

Create application-specific components only when they compose shared primitives or represent domain behavior that should not live in the generic UI layer. Do not reproduce a shadcn/ui control with one-off HTML and styles inside a feature component.

## Shadowmore Visual System — REQUIRED

ShadowApp must preserve the established visual language of Shadowmore System. When the sibling `ShadowmoreSystem` repository is available, inspect its equivalent screen and shared components before redesigning an existing ShadowApp screen. Treat it as a visual reference only; do not copy its domain calculations, persistence model, mock data, or obsolete business logic.

Before changing a screen, inspect:

* `src/index.css` for theme tokens, typography, spacing, and semantic colors;
* the existing components under `src/components/ui`;
* the equivalent layout in Shadowmore System, when available;
* the real data contract returned by the ShadowApp API.

### Use Theme Tokens

Use the existing semantic classes and CSS variables, including:

```text
background / foreground
card / muted / border / primary / destructive
bg1..bg8
text1 / text2
accent1..accent4
font-poppins / font-oxanium / font-yanone
```

Do not introduce a parallel palette with hard-coded hex colors when a project token already represents the intended role. Do not replace the Shadowmore fonts or visual hierarchy with generic defaults.

### Cyberpunk Component Contracts

Use the existing Cyberpunk components according to their declared TypeScript interfaces. Read the component source before supplying props; do not guess prop names from another component.

* `EntityPanel` is the standard container for themed sections and entity cards. Use its `pattern`, `accent`, `glow`, `cornerTicks`, `title`, `subtitle`, `badge`, and `icon` props. Keep its internal layout compact; do not reintroduce global `Card` spacing that duplicates the panel header/content padding.
* `CyberSpacer` uses the `variant` prop. Valid variants are `line`, `diamond`, `brackets`, `dots`, `circuit`, `hazard`, and `crosshair`. Do not pass `pattern` to `CyberSpacer`.
* `CyberFillerPanel` uses `icon`, `title`, `subtitle`, `variant`, `pattern`, and `className`. Use utility classes such as `min-h-24` through `className`; do not invent props such as `message` or `minHeight`.
* `CyberModule` is a compact label/status module. Use `title`, `subtitle`, `icon`, `variant`, `pattern`, and `showTelemetry`. Do not expect the `text` prop to render an unrestricted long-form body when a title is also supplied; render descriptive copy in an adjacent semantic element.
* shadcn/ui primitives remain the base for buttons, inputs, selects, dialogs, tabs, badges, and cards. Do not regenerate or replace a shared primitive without reviewing every consumer and performing a visual regression check.

If TypeScript rejects a visual component prop, correct the usage. Do not widen the component type merely to accept a prop that the component does not implement.

### Layout and Density

Shadowmore screens use compact, information-dense layouts:

* headers should not consume a large empty vertical area;
* character cards should preserve room for the avatar, identity, metadata, and actions;
* use `min-w-0` and `truncate` only where truncation is intentional;
* do not impose narrow fixed title widths such as `w-[100px]`;
* avoid fixed card heights when content or responsive wrapping may require more space;
* keep primary actions visible and give destructive actions a distinct treatment;
* verify layouts at mobile, tablet, and desktop breakpoints.

Decorative grids, dots, glows, telemetry, and corner ticks must support the content hierarchy. Do not use them as substitutes for spacing, labels, or structure.

### UI Must Reflect Real Behavior

Every visible control must work. Search fields, filters, tabs, sorting controls, and action buttons must be connected to real state and behavior before they are shown. Do not add placeholder filters that contain one option or display raw internal values such as `all`, `todos`, or `name` when the visible label should be `Grupo: Todos` or `Ordenar: Nombre`.

The UI must display persisted or API-provided values exactly as read, including valid `0` and `false` values. Presentation components must not:

* calculate gameplay attributes or derived statistics;
* invent formulas, defaults, possessions, techniques, traits, weaknesses, rewards, or inventory;
* hard-code sample character content into production screens;
* treat mock content from an older interface as real data;
* write display fallbacks back to component state, context, or persistence.

If an API does not yet hydrate a relation needed by the design, show an honest empty or unavailable state with `CyberFillerPanel`, and identify the missing data contract. Do not fabricate records to make the screen appear complete.

Public routes must remain usable without authentication. Do not make a public character sheet depend on authenticated endpoints, private context state, or admin-only configuration unless a public API contract explicitly supplies that data.

### Visual Change Verification

For every non-trivial visual change:

```text
1. Compare the affected screen with the Shadowmore System reference when available.
2. Confirm that all component props match their TypeScript interfaces.
3. Verify that visible controls perform their stated behavior.
4. Check loading, empty, error, sparse-data, and populated states.
5. Check mobile and desktop layouts.
6. Run TypeScript/lint and the production build.
7. Perform a browser or rendered screenshot review when the environment permits it.
8. Remove all temporary visual fixtures and sample data before completion.
```

Do not declare a visual task complete solely because it compiles. Confirm that the rendered result preserves readable hierarchy, compact spacing, responsive behavior, and the established Shadowmore identity.
