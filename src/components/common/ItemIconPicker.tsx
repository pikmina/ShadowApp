import React, { useState, useMemo, useRef, useEffect } from 'react';
import { icons, LucideIcon, Search, Smile, Sparkles, X, ChevronDown, Check } from 'lucide-react';
import { Picker } from 'emoji-mart';
import emojiData from '@emoji-mart/data';
import { ItemIcon, resolveLucideIcon, getCategoryFallbackIcon } from './ItemIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ItemIconPickerProps {
  iconType: 'lucide' | 'emoji' | null;
  iconValue: string | null;
  kind?: string | null;
  itemName?: string;
  onChange: (iconType: 'lucide' | 'emoji' | null, iconValue: string | null) => void;
}

// Quick-access RPG and item emojis
const POPULAR_ITEM_EMOJIS = [
  '⚔️', '🗡️', '🛡️', '🏹', '🔫', '💣', '🔨', '⛏️', '🪓', '🥋',
  '🧪', '💊', '🩹', '💉', '🍷', '🍖', '🍎', '🍄', '🍞', '🥤',
  '📜', '📖', '🔑', '🗝️', '💰', '🪙', '💎', '💍', '👑', '🏆',
  '⚡', '🔥', '❄️', '🌪️', '✨', '⭐', '💀', '👁️', '🩸', '🔮',
  '🚗', '🏍️', '🚁', '🏠', '🏢', '🏰', '📦', '🎒', '🧭', '💼',
];

// Curated popular RPG & item Lucide icons shown by default
const POPULAR_LUCIDE_KEYS = [
  'swords', 'sword', 'shield', 'shield-alert', 'shield-check', 'shield-user',
  'crosshair', 'target', 'bomb', 'axe', 'hammer', 'wrench',
  'flask-conical', 'pill', 'syringe', 'heart-pulse', 'heart', 'activity',
  'sparkles', 'flame', 'zap', 'snowflake', 'skull', 'eye',
  'scroll', 'book-open', 'book', 'file-text', 'award', 'trophy',
  'coins', 'gem', 'crown', 'key', 'lock', 'package', 'box',
  'backpack', 'briefcase', 'compass', 'map', 'car', 'building',
  'user', 'user-shield', 'clock', 'hourglass', 'wand', 'apple',
];

// Spanish keyword mapping to Lucide icon search terms
const SPANISH_LUCIDE_KEYWORDS: Record<string, string[]> = {
  espada: ['sword', 'swords'],
  espadas: ['sword', 'swords'],
  escudo: ['shield'],
  escudos: ['shield'],
  pocion: ['flask', 'pill', 'syringe'],
  poción: ['flask', 'pill', 'syringe'],
  pociones: ['flask', 'pill'],
  medicina: ['pill', 'syringe', 'heart-pulse'],
  cura: ['heart', 'pill', 'heart-pulse', 'activity'],
  salud: ['heart', 'heart-pulse', 'activity'],
  vida: ['heart', 'heart-pulse', 'activity'],
  arma: ['sword', 'swords', 'crosshair', 'target', 'bomb', 'axe'],
  armas: ['sword', 'swords', 'crosshair', 'target', 'bomb', 'axe'],
  pistola: ['crosshair', 'target'],
  arco: ['target', 'crosshair', 'arrow'],
  flecha: ['target', 'crosshair', 'arrow'],
  fuego: ['flame', 'sparkles'],
  hielo: ['snowflake', 'ice'],
  rayo: ['zap', 'battery'],
  trueno: ['zap'],
  electricidad: ['zap', 'plug', 'battery'],
  magia: ['sparkles', 'wand', 'star'],
  don: ['sparkles', 'zap', 'flame', 'brain', 'activity'],
  quirk: ['sparkles', 'zap', 'flame', 'activity'],
  libro: ['book', 'book-open', 'library'],
  pergamino: ['scroll', 'file-text'],
  dinero: ['coins', 'circle-dollar-sign', 'banknote', 'wallet'],
  moneda: ['coins', 'circle-dollar-sign'],
  oro: ['coins', 'crown', 'gem'],
  gema: ['gem', 'crown'],
  joya: ['gem', 'crown'],
  corona: ['crown', 'trophy', 'award'],
  hacha: ['axe'],
  martillo: ['hammer'],
  llave: ['key'],
  candado: ['lock'],
  cerradura: ['lock', 'key'],
  ojo: ['eye'],
  calavera: ['skull'],
  veneno: ['skull', 'flask-conical', 'biohazard'],
  comida: ['apple', 'beef', 'pizza', 'utensils'],
  fruta: ['apple'],
  manzana: ['apple'],
  bebida: ['coffee', 'wine', 'cup-soda'],
  vehiculo: ['car', 'truck', 'bike', 'plane'],
  vehículo: ['car', 'truck', 'bike', 'plane'],
  coche: ['car'],
  auto: ['car'],
  mochila: ['backpack', 'package', 'box'],
  maletin: ['briefcase', 'box'],
  maletín: ['briefcase', 'box'],
  caja: ['box', 'package'],
  paquete: ['package', 'box'],
  reloj: ['clock', 'timer', 'hourglass'],
  tiempo: ['clock', 'hourglass'],
  herramienta: ['wrench', 'hammer'],
  armadura: ['shield', 'shield-user', 'shirt'],
  casco: ['hard-hat', 'shield'],
};

// Convert PascalCase to kebab-case
const toKebab = (str: string) =>
  str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Pre-index available Lucide icons
const ALL_LUCIDE_ICONS: Array<{ pascal: string; kebab: string; Icon: LucideIcon }> = Object.keys(icons)
  .map((key) => ({
    pascal: key,
    kebab: toKebab(key),
    Icon: (icons as Record<string, LucideIcon>)[key],
  }))
  .filter((i) => Boolean(i.Icon));

const ALL_LUCIDE_MAP = new Map<string, { pascal: string; kebab: string; Icon: LucideIcon }>();
for (const item of ALL_LUCIDE_ICONS) {
  ALL_LUCIDE_MAP.set(item.kebab, item);
  ALL_LUCIDE_MAP.set(item.pascal.toLowerCase(), item);
}

/**
 * Visual Emoji Picker container wrapping Emoji Mart web component.
 */
function EmojiMartPickerBox({ onSelect }: { onSelect: (unicodeEmoji: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    try {
      const picker = new Picker({
        data: emojiData,
        locale: 'es',
        theme: 'dark',
        previewPosition: 'none',
        skinTonePosition: 'search',
        onEmojiSelect: (emoji: any) => {
          // Strictly save only the Unicode native character (e.g. "🧪")
          if (emoji && typeof emoji.native === 'string') {
            onSelect(emoji.native);
          }
        },
      });

      if (containerRef.current) {
        containerRef.current.appendChild(picker as unknown as HTMLElement);
      }
    } catch (err) {
      console.error('Error al inicializar Emoji Mart:', err);
      setLoadError(true);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [onSelect]);

  if (loadError) {
    return (
      <div className="p-3 text-center text-xs text-muted-foreground border rounded bg-muted/20">
        No se pudo cargar el selector de Emoji Mart. Puedes seleccionar cualquier emoji de la paleta rápida superior.
      </div>
    );
  }

  return <div ref={containerRef} className="emoji-mart-wrapper flex justify-center max-w-full overflow-hidden rounded-md border border-border bg-card p-1 shadow-md" />;
}

export function ItemIconPicker({
  iconType,
  iconValue,
  kind,
  itemName = 'Artículo',
  onChange,
}: ItemIconPickerProps) {
  // Current active mode: 'none' | 'lucide' | 'emoji'
  const currentMode = iconType === 'lucide' ? 'lucide' : iconType === 'emoji' ? 'emoji' : 'none';

  // Lucide search state
  const [lucideSearch, setLucideSearch] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Filter Lucide icons with Spanish synonyms and smart ranking
  const filteredLucideIcons = useMemo(() => {
    if (!lucideSearch.trim()) {
      // Default: show popular RPG and utility icons first, then alphabetical
      const popularItems: Array<{ pascal: string; kebab: string; Icon: LucideIcon }> = [];
      const seen = new Set<string>();

      for (const key of POPULAR_LUCIDE_KEYS) {
        const found = ALL_LUCIDE_MAP.get(key);
        if (found && !seen.has(found.kebab)) {
          popularItems.push(found);
          seen.add(found.kebab);
        }
      }

      for (const item of ALL_LUCIDE_ICONS) {
        if (!seen.has(item.kebab)) {
          popularItems.push(item);
          seen.add(item.kebab);
        }
        if (popularItems.length >= 64) break;
      }

      return popularItems;
    }

    const rawQuery = lucideSearch.trim().toLowerCase();
    const cleanQuery = rawQuery.replace(/[^a-z0-9áéíóúñ]/gi, '');
    const tokens = rawQuery.split(/[\s-_]+/).filter(Boolean);

    // Expand Spanish synonyms
    const expandedTerms = new Set<string>([rawQuery, cleanQuery, ...tokens]);
    for (const token of [rawQuery, cleanQuery, ...tokens]) {
      const syns = SPANISH_LUCIDE_KEYWORDS[token];
      if (syns) {
        syns.forEach(s => expandedTerms.add(s.toLowerCase()));
      }
    }

    const searchTerms = Array.from(expandedTerms).filter(Boolean);

    const matches: Array<{ item: { pascal: string; kebab: string; Icon: LucideIcon }; score: number }> = [];

    for (const item of ALL_LUCIDE_ICONS) {
      const kebab = item.kebab;
      const pascal = item.pascal.toLowerCase();

      let bestScore = 0;

      for (const term of searchTerms) {
        if (kebab === term || pascal === term) {
          bestScore = Math.max(bestScore, 100); // Exact match
        } else if (kebab.startsWith(term) || pascal.startsWith(term)) {
          bestScore = Math.max(bestScore, 80); // Prefix match
        } else if (kebab.includes(term) || pascal.includes(term)) {
          bestScore = Math.max(bestScore, 50); // Substring match
        }
      }

      if (bestScore > 0) {
        matches.push({ item, score: bestScore });
      }
    }

    // Sort by relevance score descending, then shorter kebab name
    matches.sort((a, b) => b.score - a.score || a.item.kebab.length - b.item.kebab.length);

    return matches.slice(0, 96).map(m => m.item);
  }, [lucideSearch]);

  const handleModeChange = (newMode: 'none' | 'lucide' | 'emoji') => {
    if (newMode === 'none') {
      onChange(null, null);
      setIsEmojiPickerOpen(false);
    } else if (newMode === 'lucide') {
      // Switching to Lucide: clear previous emoji
      onChange('lucide', iconType === 'lucide' ? iconValue : 'package');
      setIsEmojiPickerOpen(false);
    } else if (newMode === 'emoji') {
      // Switching to Emoji: clear previous lucide icon
      onChange('emoji', iconType === 'emoji' ? iconValue : null);
      setIsEmojiPickerOpen(true);
    }
  };

  const handleSelectLucide = (kebabName: string) => {
    onChange('lucide', kebabName);
  };

  const handleSelectEmoji = (emojiNative: string) => {
    onChange('emoji', emojiNative);
    setIsEmojiPickerOpen(false);
  };

  const handleClearIcon = () => {
    onChange(null, null);
    setIsEmojiPickerOpen(false);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-card/60 p-4">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <Label className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" />
            Icono del Artículo (Catálogo)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Elige un icono de Lucide o un emoji Unicode para representar este artículo en todo el sistema.
          </p>
        </div>

        {/* Mode selector buttons */}
        <div className="inline-flex rounded-md border border-border bg-background p-1 text-xs shrink-0">
          <button
            type="button"
            onClick={() => handleModeChange('none')}
            className={cn(
              'px-2.5 py-1 rounded font-medium transition-colors',
              currentMode === 'none'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Por defecto
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('lucide')}
            className={cn(
              'px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1',
              currentMode === 'lucide'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="size-3" />
            Lucide
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('emoji')}
            className={cn(
              'px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1',
              currentMode === 'emoji'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Smile className="size-3" />
            Emoji
          </button>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/30 border border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-12 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 shadow-sm text-foreground">
            <ItemIcon
              iconType={iconType}
              iconValue={iconValue}
              kind={kind}
              itemName={itemName}
              className="size-6 text-primary"
            />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              Vista previa
            </span>
            <span className="font-bold text-sm text-foreground truncate block font-oxanium">
              {itemName || 'Nombre del artículo'}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {iconType === 'emoji' && iconValue
                ? `Emoji Unicode: ${iconValue}`
                : iconType === 'lucide' && iconValue
                ? `Lucide: "${iconValue}"`
                : 'Icono de categoría (Automático)'}
            </span>
          </div>
        </div>

        {iconType && iconValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearIcon}
            className="text-xs text-muted-foreground hover:text-destructive h-8 gap-1"
          >
            <X className="size-3.5" />
            Restablecer
          </Button>
        )}
      </div>

      {/* MODE 1: LUCIDE PICKER (Only shown when mode === 'lucide') */}
      {currentMode === 'lucide' && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={lucideSearch}
                onChange={(e) => setLucideSearch(e.target.value)}
                placeholder="Buscar icono Lucide (ej: sword, shield, potion, heart, tool, book)..."
                className="pl-8 text-xs h-8 bg-background"
              />
            </div>
            {lucideSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLucideSearch('')}
                className="h-8 px-2 text-xs"
              >
                Limpiar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1 border rounded-md bg-background/50">
            {filteredLucideIcons.map(({ kebab, Icon }) => {
              const isSelected = iconType === 'lucide' && iconValue?.toLowerCase() === kebab;
              return (
                <button
                  key={kebab}
                  type="button"
                  onClick={() => handleSelectLucide(kebab)}
                  title={kebab}
                  className={cn(
                    'p-2 rounded flex flex-col items-center justify-center gap-1 text-center transition-all hover:bg-muted group cursor-pointer border',
                    isSelected
                      ? 'bg-primary/15 border-primary text-primary shadow-xs font-bold'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className={cn('size-5', isSelected ? 'text-primary' : 'group-hover:text-foreground')} />
                  <span className="text-[9px] font-mono truncate w-full block leading-none">
                    {kebab}
                  </span>
                </button>
              );
            })}
            {filteredLucideIcons.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-muted-foreground font-oxanium">
                No se encontraron iconos para &ldquo;{lucideSearch}&rdquo;. Prueba con términos como <em>sword, escudo, pocion, flame, zap</em>.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>
              Icono seleccionado: <strong className="text-foreground">{iconValue || 'Ninguno'}</strong>
            </span>
            <span>{filteredLucideIcons.length} mostrados</span>
          </div>
        </div>
      )}

      {/* MODE 2: EMOJI MART PICKER (Only shown when mode === 'emoji') */}
      {currentMode === 'emoji' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-md border border-border bg-background">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-md bg-muted/60 border border-border flex items-center justify-center text-2xl select-none">
                {iconValue || '❓'}
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  {iconValue ? `Emoji seleccionado: ${iconValue}` : 'Ningún emoji seleccionado'}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {iconValue ? `Carácter Unicode: "${iconValue}"` : 'Haz clic en el botón para abrir el selector'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant={isEmojiPickerOpen ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="gap-1.5 text-xs font-semibold shrink-0"
            >
              <Smile className="size-4" />
              {isEmojiPickerOpen ? 'Cerrar Emoji Mart' : iconValue ? 'Buscar en Emoji Mart' : 'Elegir en Emoji Mart'}
            </Button>
          </div>

          {/* Quick selection chips for common RPG/item emojis */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Selección Rápida de Emojis Populares:
            </span>
            <div className="flex flex-wrap gap-1 p-2 rounded-md border border-border/70 bg-background/50 max-h-28 overflow-y-auto">
              {POPULAR_ITEM_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className={cn(
                    'size-8 rounded flex items-center justify-center text-base hover:bg-muted transition-colors cursor-pointer border',
                    iconValue === emoji ? 'border-primary bg-primary/20 scale-110 shadow-xs' : 'border-transparent'
                  )}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {isEmojiPickerOpen && (
            <div className="mt-2">
              <EmojiMartPickerBox onSelect={handleSelectEmoji} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
