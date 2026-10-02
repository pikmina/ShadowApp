import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ItemIcon,
  resolveLucideIcon,
  getCategoryFallbackIcon,
  CATEGORY_FALLBACK_ICONS,
} from '@/components/common/ItemIcon';
import { Swords, Shield, Pill, Package, Crosshair, Hammer } from 'lucide-react';
import { buildCharacterSheetViewModel } from '@/domain/characterSheetViewModel';

// Mock DB for persistence testing
const memory = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

vi.mock('@/db/index.ts', async () => {
  const { getTableName } = await import('drizzle-orm');
  const copy = (val: any) => JSON.parse(JSON.stringify(val));

  function evaluateSqlFilter(row: any, expr: any): boolean {
    if (!expr || !expr.queryChunks) return true;
    const chunks = expr.queryChunks;
    if (chunks.length >= 4 && chunks[1]?.name !== undefined) {
      const colName = chunks[1].name;
      const targetChunk = chunks[3];
      const targetVal = targetChunk && typeof targetChunk === 'object' && 'value' in targetChunk && !Array.isArray(targetChunk.value)
        ? targetChunk.value
        : targetChunk;
      return row[colName] === targetVal;
    }
    return true;
  }

  const db: any = {
    execute: async () => [],
    transaction: async (fn: any) => {
      const previous = copy(memory.tables);
      try {
        return await fn(db);
      } catch (err) {
        memory.tables = previous;
        throw err;
      }
    },
    select: () => ({
      from: (table: any) => {
        const getRows = () => copy(memory.tables[getTableName(table)] ?? []);
        return {
          where: (clause: any) => {
            const filtered = () => getRows().filter((r: any) => evaluateSqlFilter(r, clause));
            return {
              orderBy: () => filtered(),
              then: (fn: any) => Promise.resolve(filtered()).then(fn),
            };
          },
          orderBy: () => getRows(),
          then: (fn: any) => Promise.resolve(getRows()).then(fn),
        };
      },
    }),
    insert: (table: any) => ({
      values: (payload: any) => {
        const executeInsert = async () => {
          const row = copy(payload);
          const name = getTableName(table);
          const tableRows = (memory.tables[name] ??= []);
          tableRows.push(row);
          return [copy(row)];
        };
        return {
          returning: executeInsert,
          then: (fn: any) => executeInsert().then(fn),
        };
      },
    }),
    update: (table: any) => ({
      set: (payload: any) => ({
        where: (clause: any) => {
          const executeUpdate = async () => {
            const name = getTableName(table);
            const rows = memory.tables[name] ?? [];
            const idx = rows.findIndex((r: any) => evaluateSqlFilter(r, clause));
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...copy(payload) };
              return [copy(rows[idx])];
            }
            return [];
          };
          return {
            returning: executeUpdate,
            then: (fn: any) => executeUpdate().then(fn),
          };
        },
      }),
    }),
    delete: (table: any) => ({
      where: (clause: any) => {
        const executeDelete = async () => {
          const name = getTableName(table);
          const rows = memory.tables[name] ?? [];
          memory.tables[name] = rows.filter((r: any) => !evaluateSqlFilter(r, clause));
        };
        return {
          then: (fn: any) => executeDelete().then(fn),
        };
      },
    }),
  };

  return { db };
});

import { upsertElement, getElement } from '@/db/elements';

describe('Canonical Item Icons System (ItemIcon & Catalog Domain)', () => {
  beforeEach(() => {
    memory.tables = {
      system_rules: [{ key: 'system_mechanics', value: [] }],
      system_elements: [],
      audit_logs: [],
    };
  });

  // 1. Artículo con Lucide
  it('1. renders a Lucide icon when iconType is "lucide"', () => {
    const item = {
      name: 'Escudo Pesado',
      kind: 'equipment',
      iconType: 'lucide' as const,
      iconValue: 'shield',
    };
    const html = renderToStaticMarkup(<ItemIcon item={item} />);
    expect(html).toContain('lucide-shield');
    expect(html).toContain('<svg');
  });

  // 2. Artículo con emoji Unicode
  it('2. renders a Unicode emoji when iconType is "emoji"', () => {
    const item = {
      name: 'Suero Experimental',
      kind: 'consumable',
      iconType: 'emoji' as const,
      iconValue: '🧪',
    };
    const html = renderToStaticMarkup(<ItemIcon item={item} />);
    expect(html).toContain('🧪');
    expect(html).toContain('role="img"');
    // Ensure no SVG is rendered when emoji is used
    expect(html).not.toContain('<svg');
  });

  // 3. Artículo sin icono personalizado
  it('3. renders category fallback icon when item has no custom icon', () => {
    const item = {
      name: 'Katana Antigua',
      kind: 'weapon',
      iconType: null,
      iconValue: null,
    };
    const html = renderToStaticMarkup(<ItemIcon item={item} />);
    expect(html).toContain('lucide-swords');
    expect(html).toContain('<svg');
  });

  // 4. Fallback por categoría
  it('4. resolves category fallbacks correctly for standard system kinds', () => {
    expect(getCategoryFallbackIcon('weapon')).toBe(Swords);
    expect(getCategoryFallbackIcon('equipment')).toBe(Shield);
    expect(getCategoryFallbackIcon('consumable')).toBe(Pill);
    expect(getCategoryFallbackIcon('ammunition')).toBe(Crosshair);
    expect(getCategoryFallbackIcon('crafting_material')).toBe(Hammer);

    // Spanish synonyms
    expect(getCategoryFallbackIcon('armas')).toBe(Swords);
    expect(getCategoryFallbackIcon('armadura')).toBe(Shield);
    expect(getCategoryFallbackIcon('medicina')).toBe(Pill);
  });

  // 5. Categoría desconocida -> fallback genérico (Package)
  it('5. resolves unknown category to generic Package fallback', () => {
    expect(getCategoryFallbackIcon('categoria_inventada_inexistente')).toBe(Package);
    expect(getCategoryFallbackIcon(null)).toBe(Package);
    expect(getCategoryFallbackIcon(undefined)).toBe(Package);

    const item = {
      name: 'Artefacto Desconocido',
      kind: 'objeto_extraterrestre_no_registrado',
      iconType: null,
      iconValue: null,
    };
    const html = renderToStaticMarkup(<ItemIcon item={item} />);
    expect(html).toContain('lucide-package');
  });

  // 6. Nombre Lucide inválido -> fallback sin excepciones
  it('6. safely falls back when Lucide icon name is invalid or unknown, without throwing', () => {
    expect(() => {
      const resolved = resolveLucideIcon('icono_completamente_inexistente_12345');
      expect(resolved).toBeNull();
    }).not.toThrow();

    const item = {
      name: 'Ítem con Icono Corrupto',
      kind: 'weapon',
      iconType: 'lucide' as const,
      iconValue: 'non_existent_icon_xyz',
    };
    let html = '';
    expect(() => {
      html = renderToStaticMarkup(<ItemIcon item={item} />);
    }).not.toThrow();

    // Must safely fallback to category icon (Swords for weapon)
    expect(html).toContain('lucide-swords');
  });

  // 7. Persistencia al crear artículo con icono
  it('7. persists iconType and iconValue when creating a catalog element', async () => {
    const created = await upsertElement({
      name: 'Granada de Humo',
      kind: 'consumable',
      description: 'Crea una nube de humo denso.',
      status: 'draft',
      iconType: 'emoji',
      iconValue: '💨',
    });

    expect(created.id).toBeDefined();
    expect(created.iconType).toBe('emoji');
    expect(created.iconValue).toBe('💨');

    const loaded = await getElement(created.id);
    expect(loaded).toBeDefined();
    expect(loaded!.iconType).toBe('emoji');
    expect(loaded!.iconValue).toBe('💨');
  });

  // 8. Persistencia al editar artículo
  it('8. persists iconType and iconValue when editing an existing catalog element', async () => {
    const created = await upsertElement({
      name: 'Chaleco Antibalas',
      kind: 'equipment',
      description: 'Protección balística.',
      status: 'draft',
      iconType: 'lucide',
      iconValue: 'shield',
    });

    // Update name and description without passing iconType/iconValue -> must preserve existing
    const updated = await upsertElement({
      id: created.id,
      name: 'Chaleco Táctico Reforzado',
      kind: 'equipment',
      description: 'Protección balística de grado militar.',
      status: 'draft',
    });

    expect(updated.iconType).toBe('lucide');
    expect(updated.iconValue).toBe('shield');

    const reloaded = await getElement(created.id);
    expect(reloaded!.name).toBe('Chaleco Táctico Reforzado');
    expect(reloaded!.iconType).toBe('lucide');
    expect(reloaded!.iconValue).toBe('shield');
  });

  // 9. Cambio Emoji -> Lucide
  it('9. correctly updates and overrides when switching from Emoji to Lucide', async () => {
    const item = await upsertElement({
      name: 'Poción Curativa',
      kind: 'consumable',
      description: 'Restaura vitalidad.',
      status: 'draft',
      iconType: 'emoji',
      iconValue: '🧪',
    });

    expect(item.iconType).toBe('emoji');
    expect(item.iconValue).toBe('🧪');

    // Switch to Lucide
    const switched = await upsertElement({
      id: item.id,
      name: 'Poción Curativa',
      kind: 'consumable',
      description: 'Restaura vitalidad.',
      status: 'draft',
      iconType: 'lucide',
      iconValue: 'pill',
    });

    expect(switched.iconType).toBe('lucide');
    expect(switched.iconValue).toBe('pill');

    const reloaded = await getElement(item.id);
    expect(reloaded!.iconType).toBe('lucide');
    expect(reloaded!.iconValue).toBe('pill');
  });

  // 10. Cambio Lucide -> Emoji
  it('10. correctly updates and overrides when switching from Lucide to Emoji', async () => {
    const item = await upsertElement({
      name: 'Amuleto Dorado',
      kind: 'equipment',
      description: 'Un talismán protector.',
      status: 'draft',
      iconType: 'lucide',
      iconValue: 'shield',
    });

    expect(item.iconType).toBe('lucide');
    expect(item.iconValue).toBe('shield');

    // Switch to Emoji Unicode
    const switched = await upsertElement({
      id: item.id,
      name: 'Amuleto Dorado',
      kind: 'equipment',
      description: 'Un talismán protector.',
      status: 'draft',
      iconType: 'emoji',
      iconValue: '🧿',
    });

    expect(switched.iconType).toBe('emoji');
    expect(switched.iconValue).toBe('🧿');

    const reloaded = await getElement(item.id);
    expect(reloaded!.iconType).toBe('emoji');
    expect(reloaded!.iconValue).toBe('🧿');
  });

  // 11. Tienda obtiene el icono del Catálogo
  it('11. Shop renders canonical icon from the catalog element', () => {
    // Simulating Shop offer structure (join between shop_offers and system_elements)
    const offerWithLucide = {
      shop_offers: { id: 'offer-1', elementId: 'el-katana', prices: [{ currency: 'yen', amount: 15000 }] },
      system_elements: {
        id: 'el-katana',
        name: 'Katana Murasame',
        kind: 'weapon',
        description: 'Espada afilada.',
        iconType: 'lucide',
        iconValue: 'swords',
      },
    };

    const offerWithEmoji = {
      shop_offers: { id: 'offer-2', elementId: 'el-potion', prices: [{ currency: 'yen', amount: 5000 }] },
      system_elements: {
        id: 'el-potion',
        name: 'Poción Secreta',
        kind: 'consumable',
        description: 'Fórmula misteriosa.',
        iconType: 'emoji',
        iconValue: '🧪',
      },
    };

    const htmlLucide = renderToStaticMarkup(<ItemIcon item={offerWithLucide.system_elements} />);
    expect(htmlLucide).toContain('lucide-swords');

    const htmlEmoji = renderToStaticMarkup(<ItemIcon item={offerWithEmoji.system_elements} />);
    expect(htmlEmoji).toContain('🧪');
  });

  // 12. Inventario y Ficha pública no crean una segunda fuente de verdad
  it('12. Inventory and Public Sheet ViewModel resolves canonical icon through element relation without data duplication', () => {
    const canonicalWeapon = {
      id: 'canon-gun-01',
      name: 'Revólver Policial',
      kind: 'weapon',
      description: 'Arma de servicio reglamentaria.',
      iconType: 'lucide',
      iconValue: 'crosshair',
    };

    const canonicalSerum = {
      id: 'canon-serum-01',
      name: 'Suero de Fuerza',
      kind: 'consumable',
      description: 'Estimulante temporal.',
      iconType: 'emoji',
      iconValue: '💉',
    };

    const characterFixture = {
      name: 'Taro',
      profileData: {},
      possessions: [
        {
          possession: { characterId: 1, elementId: canonicalWeapon.id, quantity: 1, equipped: true },
          element: canonicalWeapon,
        },
        {
          possession: { characterId: 1, elementId: canonicalSerum.id, quantity: 3, equipped: false },
          element: canonicalSerum,
        },
      ],
    };

    const vm = buildCharacterSheetViewModel({
      character: characterFixture,
      elements: [canonicalWeapon, canonicalSerum],
    });

    expect(vm.possessions).toHaveLength(2);

    // First possession: Gun
    const gunPossession = vm.possessions.find(p => p.name === 'Revólver Policial')!;
    expect(gunPossession).toBeDefined();
    expect(gunPossession.iconType).toBe('lucide');
    expect(gunPossession.iconValue).toBe('crosshair');
    const gunHtml = renderToStaticMarkup(<ItemIcon item={gunPossession} />);
    expect(gunHtml).toContain('lucide-crosshair');

    // Second possession: Serum
    const serumPossession = vm.possessions.find(p => p.name === 'Suero de Fuerza')!;
    expect(serumPossession).toBeDefined();
    expect(serumPossession.iconType).toBe('emoji');
    expect(serumPossession.iconValue).toBe('💉');
    const serumHtml = renderToStaticMarkup(<ItemIcon item={serumPossession} />);
    expect(serumHtml).toContain('💉');
  });
});
