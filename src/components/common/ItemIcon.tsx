import React from 'react';
import {
  icons,
  LucideIcon,
  Package,
  Swords,
  Shield,
  Pill,
  Crosshair,
  Hammer,
  Apple,
  Car,
  Building,
  Briefcase,
  Scroll,
  FileCheck,
  Award,
  Coins,
  TrendingUp,
  Zap,
  Flame,
  User,
  BookOpen,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ItemIconItem {
  iconType?: 'lucide' | 'emoji' | string | null;
  iconValue?: string | null;
  kind?: string | null;
  category?: string | null;
  name?: string | null;
}

export interface ItemIconProps {
  item?: ItemIconItem | null;
  iconType?: 'lucide' | 'emoji' | string | null;
  iconValue?: string | null;
  kind?: string | null;
  itemName?: string;
  className?: string;
  size?: number | string;
  fallbackIcon?: LucideIcon;
  style?: React.CSSProperties;
}

/**
 * Fallback mapping for real categories in ShadowApp.
 * Maps known canonical element kinds and Spanish synonyms to representative Lucide icons.
 */
export const CATEGORY_FALLBACK_ICONS: Record<string, LucideIcon> = {
  weapon: Swords,
  equipment: Shield,
  consumable: Pill,
  ammunition: Crosshair,
  crafting_material: Hammer,
  ingredient: Apple,
  vehicle: Car,
  real_estate: Building,
  clandestine_asset: Briefcase,
  license: Scroll,
  permission: FileCheck,
  certification: Award,
  character_resource: Coins,
  attribute_upgrade: TrendingUp,
  plus_ultra_effect: Zap,
  altered_status: Flame,
  background: User,
  skill: BookOpen,
  trait: Sparkles,
  weakness: TriangleAlert,

  // Spanish synonyms
  arma: Swords,
  armas: Swords,
  armadura: Shield,
  equipamiento: Shield,
  consumible: Pill,
  medicina: Pill,
  municion: Crosshair,
  munición: Crosshair,
  material: Hammer,
  ingrediente: Apple,
  vehiculo: Car,
  vehículo: Car,
  inmueble: Building,
  licencia: Scroll,
  permiso: FileCheck,
  certificacion: Award,
  certificación: Award,
  recurso: Coins,
  habilidad: BookOpen,
  rasgo: Sparkles,
  debilidad: TriangleAlert,
};

/**
 * Common aliases between historical Lucide icon names and current Lucide v1.x canonical keys.
 */
const LUCIDE_ALIASES: Record<string, string> = {
  AlertTriangle: 'TriangleAlert',
  Edit: 'Pen',
  Edit2: 'Pen',
  Delete: 'Trash2',
  Remove: 'Trash2',
};

/**
 * Safely resolves a Lucide icon by name without throwing exceptions.
 * Accepts kebab-case ("flask-conical"), snake_case ("flask_conical"), or PascalCase ("FlaskConical").
 * Returns null if not found or invalid.
 */
export function resolveLucideIcon(iconValue: string | null | undefined): LucideIcon | null {
  if (!iconValue || typeof iconValue !== 'string') return null;
  const trimmed = iconValue.trim();
  if (!trimmed) return null;

  // Convert kebab-case or snake_case to PascalCase
  const pascalName = trimmed
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase());

  // Direct lookup
  const lucideMap = icons as unknown as Record<string, LucideIcon>;
  if (lucideMap[pascalName]) {
    return lucideMap[pascalName];
  }

  // Alias lookup
  const canonicalAlias = LUCIDE_ALIASES[pascalName];
  if (canonicalAlias && lucideMap[canonicalAlias]) {
    return lucideMap[canonicalAlias];
  }

  return null;
}

/**
 * Returns the fallback icon for a category/kind.
 * Returns Package if the category has no explicit match.
 */
export function getCategoryFallbackIcon(kind?: string | null, explicitFallback?: LucideIcon): LucideIcon {
  if (!kind || typeof kind !== 'string') return explicitFallback || Package;
  const normalized = kind.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORY_FALLBACK_ICONS[normalized] || explicitFallback || Package;
}

/**
 * Canonical presentation component for catalog items across Shop, Inventory, Equipment and Character Sheets.
 *
 * Rules:
 * 1. iconType === "emoji" -> renders iconValue as Unicode emoji.
 * 2. iconType === "lucide" -> resolves iconValue safely against Lucide.
 * 3. Fallback -> category icon; if unknown category -> Package.
 *
 * Never throws exceptions on invalid or obsolete icon values.
 */
export function ItemIcon({
  item,
  iconType: explicitType,
  iconValue: explicitValue,
  kind: explicitKind,
  className,
  size,
  fallbackIcon: explicitFallback,
  style,
}: ItemIconProps) {
  const iconType = explicitType !== undefined ? explicitType : item?.iconType;
  const iconValue = explicitValue !== undefined ? explicitValue : item?.iconValue;
  const kind = explicitKind !== undefined ? explicitKind : (item?.kind || item?.category);

  // 1. Emoji mode
  if (iconType === 'emoji' && iconValue && typeof iconValue === 'string') {
    return (
      <span
        role="img"
        aria-label={item?.name || 'icono de artículo'}
        className={cn('inline-flex items-center justify-center leading-none select-none text-center', className)}
        style={{
          fontSize: typeof size === 'number' ? `${size}px` : size || '1.15em',
          ...style,
        }}
      >
        {iconValue}
      </span>
    );
  }

  // 2. Lucide mode
  if (iconType === 'lucide' && iconValue && typeof iconValue === 'string') {
    const LucideComponent = resolveLucideIcon(iconValue);
    if (LucideComponent) {
      return <LucideComponent className={className} size={size} style={style} />;
    }
  }

  // 3. Fallback: Category icon -> Package
  const FallbackComponent = getCategoryFallbackIcon(kind, explicitFallback);
  return <FallbackComponent className={className} size={size} style={style} />;
}
