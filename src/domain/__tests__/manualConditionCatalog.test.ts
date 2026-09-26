import { describe, it, expect } from 'vitest';
import { createCoreCategories, getCategoryOptions } from '../coreRuleCatalog';
import { describeMechanicalCondition } from '../mechanicalDescription';
import { type MechanicalCondition } from '../mechanicalBehavior';

describe('Manual Condition Connection with Rule Catalog', () => {
  // 1 & 2. manual obtains options from the Catalog & options are not hardcoded
  it('1 & 2. manual obtiene sus opciones desde el Catálogo (no están hardcodeadas)', () => {
    const coreCats = createCoreCategories();
    const manualOptions = getCategoryOptions(coreCats, 'manual_condition');
    
    expect(manualOptions.length).toBeGreaterThan(0);
    const hasVisual = manualOptions.some(o => o.name === 'Contacto visual' || o.runtimeKey === 'visual_contact');
    const hasPhysical = manualOptions.some(o => o.name === 'Contacto físico' || o.runtimeKey === 'physical_contact');
    expect(hasVisual).toBe(true);
    expect(hasPhysical).toBe(true);
  });

  // 3 & 4. Persisting stable identifier & UI shows translated Spanish label
  it('3 & 4. Seleccionar una opción persiste su identificador estable y muestra la etiqueta en español', () => {
    const coreCats = createCoreCategories();
    const manualOptions = getCategoryOptions(coreCats, 'manual_condition');
    const visualOpt = manualOptions.find(o => o.runtimeKey === 'visual_contact');
    
    expect(visualOpt).toBeDefined();
    expect(visualOpt!.name).toBe('Contacto visual');
    // The identifier persisted is visual_contact (stable ID/runtimeKey)
    expect(visualOpt!.runtimeKey).toBe('visual_contact');
  });

  // 5. A known condition can be described without explicit description
  it('5. Una condición conocida se describe automáticamente sin description obligatoria', () => {
    const cond: MechanicalCondition = {
      type: 'manual',
      signalId: 'visual_contact',
      negated: false,
    };
    
    const desc = describeMechanicalCondition(cond);
    expect(desc.complete).toBe(true);
    expect(desc.text).toBe('Requiere contacto visual');
    expect(desc.warnings.length).toBe(0);
  });

  // 6. description acts as optional contextual detail
  it('6. description actúa como detalle contextual opcional', () => {
    // When signalId matches a rule (e.g. emotion or visual_contact or consumption)
    const condEmotion: MechanicalCondition = {
      type: 'manual',
      signalId: 'emotion',
      description: 'Ira o furia ciega',
      negated: false,
    };
    const descEmotion = describeMechanicalCondition(condEmotion);
    expect(descEmotion.complete).toBe(true);
    expect(descEmotion.text).toBe('Emoción intensa (Ira o furia ciega)');

    const condConsumption: MechanicalCondition = {
      type: 'manual',
      signalId: 'consumption', // additional_requirement consumption rule matches
      description: 'Sangre fresca del objetivo',
      negated: false,
    };
    const descConsumption = describeMechanicalCondition(condConsumption);
    expect(descConsumption.complete).toBe(true);
    expect(descConsumption.text).toBe('Requiere consumir sangre fresca del objetivo');
  });

  // 7. negated: false does not produce "No"
  it('7. negated: false no genera "No"', () => {
    const cond: MechanicalCondition = {
      type: 'manual',
      signalId: 'physical_contact',
      negated: false,
    };
    const desc = describeMechanicalCondition(cond);
    expect(desc.text).toBe('Requiere contacto físico');
    expect(desc.text).not.toContain('No');
  });

  // 8. negated: true does generate natural negated condition
  it('8. negated: true sí genera una condición negada natural', () => {
    const cond: MechanicalCondition = {
      type: 'manual',
      signalId: 'physical_contact',
      negated: true,
    };
    const desc = describeMechanicalCondition(cond);
    expect(desc.text).toBe('No requiere contacto físico');
  });

  // 9. Legacy manual condition with free text continues loading gracefully
  it('9. Una condición manual antigua con texto libre sigue cargando y describiéndose', () => {
    const condLegacy: MechanicalCondition = {
      type: 'manual',
      signalId: 'permiso_master',
      negated: false,
    };
    const descLegacy = describeMechanicalCondition(condLegacy);
    expect(descLegacy.complete).toBe(true);
    expect(descLegacy.text).toBe('Permiso del Master');

    const condFreeText: MechanicalCondition = {
      type: 'manual',
      signalId: 'sangre_del_objetivo_free',
      description: 'Beber sangre del objetivo',
      negated: false,
    };
    const descFreeText = describeMechanicalCondition(condFreeText);
    expect(descFreeText.complete).toBe(true);
    expect(descFreeText.text).toBe('Condición: Beber sangre del objetivo');
  });

  // 10. Changing Catalog options reflects on the returned list
  it('10. Cambiar las opciones en el Catálogo se refleja en las opciones listadas', () => {
    const customCats = [
      {
        id: 'core.manual_condition',
        name: 'Condición manual',
        description: 'Categoría de prueba',
        rules: [
          {
            id: 'custom.manual_condition.custom_rule',
            runtimeKey: 'custom_rule',
            name: 'Haber sido invitado a pasar',
            cost: 0,
            ruleType: 'component' as const,
          }
        ],
        scope: { actions: true, objects: true, techniques: true },
        coreKey: 'manual_condition',
        logicalType: 'utility' as const,
      }
    ];

    const options = getCategoryOptions(customCats, 'manual_condition');
    expect(options.length).toBe(1);
    expect(options[0].name).toBe('Haber sido invitado a pasar');
    expect(options[0].runtimeKey).toBe('custom_rule');
  });
});
