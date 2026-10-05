import { describe, it, expect } from 'vitest';
import { createCoreCategories, getCategoryOptions } from '../coreRuleCatalog';
import {
  calculateTechniqueStructuralCost,
  findSkillOption,
  type SystemMechanicsConfig,
} from '../systemMechanics';
import {
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
} from '../mechanicalBehavior';

describe('Integración Dinámica de Habilidades del Catálogo en Reglas del Sistema (Opción 2)', () => {
  const coreCategories: SystemMechanicsConfig = createCoreCategories();

  const mockCatalogSkills = [
    { id: 'acrobacias', name: 'Acrobacias', status: 'published' },
    { id: 'sigilo', name: 'Sigilo', status: 'published' },
    { id: 'medicina', name: 'Medicina', status: 'published' },
    { id: 'combate_tactico', name: 'Combate Táctico', status: 'draft' },
  ];

  it('proyecta dinámicamente las habilidades del Catálogo en getCategoryOptions con el coste base general (3 CE)', () => {
    const skillOptions = getCategoryOptions(coreCategories, 'skill', mockCatalogSkills);
    expect(skillOptions.length).toBeGreaterThan(mockCatalogSkills.length);

    const acrobaciasOpt = skillOptions.find(o => o.runtimeKey === 'acrobacias');
    expect(acrobaciasOpt).toBeDefined();
    expect(acrobaciasOpt?.name).toBe('Acrobacias');
    expect(acrobaciasOpt?.cost).toBe(3); // Coste base por defecto
    expect(acrobaciasOpt?.isAvailable).toBe(true);

    const sigiloOpt = skillOptions.find(o => o.runtimeKey === 'sigilo');
    expect(sigiloOpt).toBeDefined();
    expect(sigiloOpt?.cost).toBe(3);

    const draftOpt = skillOptions.find(o => o.runtimeKey === 'combate_tactico');
    expect(draftOpt).toBeDefined();
    expect(draftOpt?.isAvailable).toBe(false); // Borrador marcado como no disponible
  });

  it('permite excepciones/overrides de CE individuales para habilidades específicas', () => {
    // Simulamos que el admin configuró una excepción: Sigilo cuesta 5 CE en lugar del base
    const categoriesWithOverride: SystemMechanicsConfig = coreCategories.map(cat => {
      if (cat.id === 'core.skill') {
        return {
          ...cat,
          rules: [
            ...cat.rules,
            {
              id: 'core.skill.sigilo',
              name: 'Sigilo',
              cost: 5,
              ruleType: 'cost_modifier' as const,
              runtimeKey: 'sigilo',
              isAvailable: true,
            },
          ],
        };
      }
      return cat;
    });

    const skillOptions = getCategoryOptions(categoriesWithOverride, 'skill', mockCatalogSkills);
    const sigiloOpt = skillOptions.find(o => o.runtimeKey === 'sigilo');
    expect(sigiloOpt?.cost).toBe(5); // Respeta el coste personalizado

    const acrobaciasOpt = skillOptions.find(o => o.runtimeKey === 'acrobacias');
    expect(acrobaciasOpt?.cost).toBe(3); // Sigue heredando el coste base general
  });

  it('findSkillOption resuelve correctamente habilidades del catálogo con coste base o personalizado', () => {
    // 1. Sin override -> Coste base general (3 CE)
    const resBase = findSkillOption(coreCategories, 'acrobacias');
    expect(resBase).toBeDefined();
    expect(resBase?.cost).toBe(3);

    // 2. Con override -> Coste personalizado
    const categoriesWithCustom: SystemMechanicsConfig = coreCategories.map(cat => {
      if (cat.id === 'core.skill') {
        return {
          ...cat,
          rules: [
            ...cat.rules,
            {
              id: 'core.skill.acrobacias',
              name: 'Acrobacias',
              cost: 1,
              ruleType: 'cost_modifier' as const,
              runtimeKey: 'acrobacias',
              isAvailable: true,
            },
          ],
        };
      }
      return cat;
    });

    const resCustom = findSkillOption(categoriesWithCustom, 'acrobacias');
    expect(resCustom?.cost).toBe(1);
  });

  it('actualizar el Coste Base General actualiza dinámicamente el coste de todas las habilidades sin override', () => {
    // Admin cambia el Coste Base General a 4 CE
    const categoriesNewBase: SystemMechanicsConfig = coreCategories.map(cat => {
      if (cat.id === 'core.skill') {
        return {
          ...cat,
          rules: cat.rules.map(r =>
            (r as any).runtimeKey === 'base' || r.id === 'core.skill.base'
              ? { ...r, cost: 4 }
              : r
          ),
        };
      }
      return cat;
    });

    const skillOptions = getCategoryOptions(categoriesNewBase, 'skill', mockCatalogSkills);
    const acrobaciasOpt = skillOptions.find(o => o.runtimeKey === 'acrobacias');
    expect(acrobaciasOpt?.cost).toBe(4);

    const sigiloOpt = skillOptions.find(o => o.runtimeKey === 'sigilo');
    expect(sigiloOpt?.cost).toBe(4);
  });

  it('calcula correctamente el CE estructural de una técnica con efecto skill_modifier usando habilidades del Catálogo', () => {
    const behavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior('b1', 'active', 'Salto Acrobático'),
      activation: { actionType: 'action', timing: 'immediate' },
      effects: [
        {
          id: 'eff1',
          type: 'skill_modifier',
          skillId: 'acrobacias',
          amount: 2,
          operation: 'add',
        },
      ],
    };

    // skill 'acrobacias' = 3 CE (base)
    // numeric_modifier +2 = 1 CE (cost is n - 1)
    // total = 3 + 1 = 4 CE
    const cost = calculateTechniqueStructuralCost([behavior], coreCategories);
    expect(cost).toBe(4);
  });
});
