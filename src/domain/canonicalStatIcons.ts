import React from 'react';
import {
  Heart,
  Zap,
  SportShoe,
  UserShield,
  ShieldUser,
  Feather,
  Swords,
  Target,
  Sparkles,
  Activity,
  HandFist,
} from 'lucide-react';

/**
 * CANONICAL STAT ICON MAPPINGS
 * Associated directly with the semantic meaning of the statistic,
 * independent of character faction or aesthetic theme.
 */
export const CANONICAL_STAT_ICONS = {
  health: Heart,
  stamina: Zap,
  evasion: SportShoe,
  courage: UserShield,
  initiative: Feather,
  damageReduction: ShieldUser,
  physicalDamage: Swords,
  rangeDamage: Target,
  modFuerza: Swords,
  modDestreza: Target,
  plusUltra: Sparkles,
  generalCombat: Activity,
} as const;

export type CanonicalStatKey = keyof typeof CANONICAL_STAT_ICONS;

export interface CanonicalStatDefinition {
  key: CanonicalStatKey;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  sub?: string;
  order: number;
}

export const CANONICAL_DERIVED_STATS: CanonicalStatDefinition[] = [
  {
    key: 'health',
    label: 'SALUD',
    shortLabel: 'HP',
    icon: CANONICAL_STAT_ICONS.health,
    description: 'Puntos de vida y vitalidad general',
    sub: 'Vitalidad',
    order: 1,
  },
  {
    key: 'stamina',
    label: 'ESTAMINA',
    shortLabel: 'ES',
    icon: CANONICAL_STAT_ICONS.stamina,
    description: 'Reserva de energía para acciones y técnicas',
    sub: 'Energía',
    order: 2,
  },
  {
    key: 'evasion',
    label: 'EVASIÓN',
    shortLabel: 'EVA',
    icon: CANONICAL_STAT_ICONS.evasion,
    description: 'Capacidad de esquivar impactos físicos y ataques directos',
    sub: 'Defensa Física',
    order: 3,
  },
  {
    key: 'courage',
    label: 'CORAJE',
    shortLabel: 'COR',
    icon: CANONICAL_STAT_ICONS.courage,
    description: 'Temple y resistencia a ataques mentales, miedo y coerción',
    sub: 'Defensa Mental',
    order: 4,
  },
  {
    key: 'physicalDamage',
    label: 'DAÑO FÍSICO',
    shortLabel: 'CQC',
    icon: CANONICAL_STAT_ICONS.physicalDamage,
    description: 'Impacto en combate cuerpo a cuerpo',
    sub: 'CQC / Melee',
    order: 5,
  },
  {
    key: 'rangeDamage',
    label: 'DAÑO RANGO',
    shortLabel: 'RNG',
    icon: CANONICAL_STAT_ICONS.rangeDamage,
    description: 'Impacto en ataques a distancia y proyectiles',
    sub: 'Distancia',
    order: 6,
  },
  {
    key: 'damageReduction',
    label: 'REDUCCIÓN DAÑO',
    shortLabel: 'RD',
    icon: CANONICAL_STAT_ICONS.damageReduction,
    description: 'Reducción pasiva de daño recibido por armadura o resistencia',
    sub: 'Armadura / RD',
    order: 7,
  },
  {
    key: 'initiative',
    label: 'INICIATIVA',
    shortLabel: 'INI',
    icon: CANONICAL_STAT_ICONS.initiative,
    description: 'Velocidad de reacción en combate',
    sub: 'Velocidad reacción',
    order: 8,
  },
  {
    key: 'modFuerza',
    label: 'MOD. FUERZA',
    shortLabel: 'MOD FUE',
    icon: CANONICAL_STAT_ICONS.modFuerza,
    description: 'Bono derivado de Fuerza: floor(FUE / 2)',
    sub: 'Bono CQC',
    order: 9,
  },
  {
    key: 'modDestreza',
    label: 'MOD. DESTREZA',
    shortLabel: 'MOD DES',
    icon: CANONICAL_STAT_ICONS.modDestreza,
    description: 'Bono derivado de Destreza: floor(DES / 2)',
    sub: 'Bono Puntería',
    order: 10,
  },
];

/**
 * Resolves a group color from Settings groups array or falls back to CSS faction variables.
 */
export function resolveCanonicalGroupColor(
  groupName?: string | null,
  settingsGroups?: Array<{ id: string; name: string; color: string }>,
  detectedTheme?: string
): string {
  if (groupName && Array.isArray(settingsGroups)) {
    const cleanGroup = groupName.trim().toLowerCase();
    const matched = settingsGroups.find(
      (g) => g.name && g.name.trim().toLowerCase() === cleanGroup
    );
    if (matched && matched.color) return matched.color;
  }

  // Fallback by faction theme or group name
  const theme = (detectedTheme || groupName || 'base').toLowerCase();
  if (theme.includes('hero') || theme.includes('héroe')) return 'var(--heroes, #0284c7)';
  if (theme.includes('villain') || theme.includes('villano')) return 'var(--villanos, #e11d48)';
  if (theme.includes('student') || theme.includes('estudiante') || theme.includes('alumno')) return 'var(--estudiantes, #16a34a)';
  if (theme.includes('vigilante')) return 'var(--vigilantes, #6366f1)';
  if (theme.includes('civil') || theme.includes('civilian')) return 'var(--civiles, #ec4899)';

  return 'var(--primary, #0284c7)';
}
