/**
 * Canonical Altered Statuses Metadata and Tier Helper
 *
 * Centralizes durations, families, severity tiers, and parsing
 * for both status application and status removal across UI editors.
 */

export interface CanonicalStatusFamily {
  id: string;
  key: string;
  name: string;
  icon: string;
  hasTiers: true;
  tiers: Array<{
    id: "leve" | "grave";
    label: string;
    statusId: string;
    turns: number;
  }>;
}

export interface CanonicalSingleStatus {
  id: string;
  key: string;
  name: string;
  icon: string;
  hasTiers: false;
  defaultTurns: number;
}

export const CANONICAL_STATUS_FAMILIES: CanonicalStatusFamily[] = [
  {
    id: "core.status.hemorragia",
    key: "hemorragia",
    name: "Hemorragia",
    icon: "🩸",
    hasTiers: true,
    tiers: [
      { id: "leve", label: "Leve", statusId: "core.status.hemorragia_leve", turns: 2 },
      { id: "grave", label: "Grave", statusId: "core.status.hemorragia_grave", turns: 4 },
    ],
  },
  {
    id: "core.status.quemadura",
    key: "quemadura",
    name: "Quemadura",
    icon: "🔥",
    hasTiers: true,
    tiers: [
      { id: "leve", label: "Leve", statusId: "core.status.quemadura_leve", turns: 2 },
      { id: "grave", label: "Grave", statusId: "core.status.quemadura_grave", turns: 4 },
    ],
  },
  {
    id: "core.status.veneno",
    key: "veneno",
    name: "Veneno",
    icon: "🧪",
    hasTiers: true,
    tiers: [
      { id: "leve", label: "Leve", statusId: "core.status.veneno_leve", turns: 2 },
      { id: "grave", label: "Grave", statusId: "core.status.veneno_grave", turns: 3 },
    ],
  },
  {
    id: "core.status.berserker",
    key: "berserker",
    name: "Berserker",
    icon: "⚡",
    hasTiers: true,
    tiers: [
      { id: "leve", label: "Leve", statusId: "core.status.berserker_leve", turns: 2 },
      { id: "grave", label: "Grave", statusId: "core.status.berserker_grave", turns: 3 },
    ],
  },
];

export const CANONICAL_SINGLE_STATUSES: CanonicalSingleStatus[] = [
  { id: "core.status.asfixia", key: "asfixia", name: "Asfixia", icon: "🫁", hasTiers: false, defaultTurns: 1 },
  { id: "core.status.stunned", key: "stunned", name: "Aturdido", icon: "⚡", hasTiers: false, defaultTurns: 1 },
  { id: "core.status.coma_ilusorio", key: "coma_ilusorio", name: "Coma Ilusorio", icon: "🌀", hasTiers: false, defaultTurns: 3 },
  { id: "core.status.concentrado", key: "concentrado", name: "Concentrado (beneficio)", icon: "🎯", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.congelado", key: "congelado", name: "Congelado", icon: "❄️", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.conmocion", key: "conmocion", name: "Conmoción", icon: "💥", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.desbalanceado", key: "desbalanceado", name: "Desbalanceado", icon: "⚖️", hasTiers: false, defaultTurns: 1 },
  { id: "core.status.desorientado", key: "desorientado", name: "Desorientado", icon: "💫", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.dormido", key: "dormido", name: "Dormido", icon: "💤", hasTiers: false, defaultTurns: 3 },
  { id: "core.status.electrocutado", key: "electrocutado", name: "Electrocutado", icon: "⚡", hasTiers: false, defaultTurns: 1 },
  { id: "core.status.inmovilizado", key: "inmovilizado", name: "Inmovilizado", icon: "🔒", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.locura", key: "locura", name: "Locura", icon: "🧠", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.miedo", key: "miedo", name: "Miedo / Aterrorizado", icon: "😱", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.mutacion_visual", key: "mutacion_visual", name: "Mutación Visual (Ceguera)", icon: "👁️", hasTiers: false, defaultTurns: 4 },
  { id: "core.status.nulificacion_don", key: "nulificacion_don", name: "Nulificación de Don", icon: "🚫", hasTiers: false, defaultTurns: 1 },
  { id: "core.status.ralentizado", key: "ralentizado", name: "Ralentizado", icon: "🐢", hasTiers: false, defaultTurns: 2 },
  { id: "core.status.sobrecalentado", key: "sobrecalentado", name: "Sobrecalentado", icon: "🌡️", hasTiers: false, defaultTurns: 2 },
];

export const CANONICAL_CURING_SCOPES = [
  { id: "all", name: "🌐 Todos los Estados Alterados (Purga Universal)" },
  { id: "leve", name: "🟢 Cualquier Estado Alterado Leve" },
  { id: "moderado", name: "🟡 Cualquier Estado Alterado Moderado" },
  { id: "grave", name: "🔴 Cualquier Estado Alterado Grave" },
];

/**
 * Returns canonical duration in turns for any status ID
 */
export function getCanonicalStatusDefaultTurns(statusId?: string): number {
  if (!statusId) return 1;
  const raw = String(statusId).toLowerCase().trim();

  // Tiered variants
  if (raw.includes("hemorragia_grave") || raw.includes("quemadura_grave")) return 4;
  if (raw.includes("berserker_grave") || raw.includes("veneno_grave")) return 3;
  if (raw.includes("hemorragia_leve") || raw.includes("quemadura_leve") || raw.includes("veneno_leve") || raw.includes("berserker_leve")) return 2;
  if (raw.includes("hemorragia") || raw.includes("quemadura")) return 3;

  // Single statuses
  const single = CANONICAL_SINGLE_STATUSES.find(s => s.id === raw || s.key === raw || raw.includes(s.key));
  if (single) return single.defaultTurns;

  const family = CANONICAL_STATUS_FAMILIES.find(f => f.id === raw || f.key === raw || raw.includes(f.key));
  if (family) return 2;

  return 2;
}

/**
 * Parses a status_remove statusElementId into a base family/scope key and an optional severity tier
 */
export function parseStatusRemoveSelection(statusElementId?: string): {
  baseKey: string;
  tier: "all" | "leve" | "grave";
  hasTiers: boolean;
} {
  if (!statusElementId) {
    return { baseKey: "all", tier: "all", hasTiers: false };
  }
  const raw = String(statusElementId).toLowerCase().trim();

  for (const fam of CANONICAL_STATUS_FAMILIES) {
    if (raw === `${fam.id}_leve` || raw === `${fam.key}_leve` || raw === `core.status_remove.${fam.key}_leve`) {
      return { baseKey: fam.id, tier: "leve", hasTiers: true };
    }
    if (raw === `${fam.id}_grave` || raw === `${fam.key}_grave` || raw === `core.status_remove.${fam.key}_grave`) {
      return { baseKey: fam.id, tier: "grave", hasTiers: true };
    }
    if (
      raw === fam.id ||
      raw === fam.key ||
      raw === `core.status_remove.${fam.key}` ||
      raw.startsWith(fam.id) ||
      raw.startsWith(fam.key)
    ) {
      return { baseKey: fam.id, tier: "all", hasTiers: true };
    }
  }

  return { baseKey: statusElementId, tier: "all", hasTiers: false };
}

/**
 * Composes a canonical status_remove statusElementId from a base key and selected severity tier
 */
export function composeStatusRemoveId(baseKey: string, tier: "all" | "leve" | "grave" = "all"): string {
  const isFamily = CANONICAL_STATUS_FAMILIES.find(f => f.id === baseKey || f.key === baseKey);
  if (!isFamily) {
    return baseKey;
  }
  if (tier === "leve") {
    return `${isFamily.id}_leve`;
  }
  if (tier === "grave") {
    return `${isFamily.id}_grave`;
  }
  return isFamily.id;
}
