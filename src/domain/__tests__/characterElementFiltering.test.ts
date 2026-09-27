import { describe, it, expect } from 'vitest';

describe('Character Element Form Filtering', () => {
  const sampleElements = [
    { id: 'el_eq_1', name: 'Traje de Combate', kind: 'equipment', status: 'published' },
    { id: 'el_wp_1', name: 'Katana', kind: 'weapon', status: 'published' },
    { id: 'el_cs_1', name: 'Poción de Vida', kind: 'consumable', status: 'published' },
    { id: 'el_am_1', name: 'Balas de 9mm', kind: 'ammunition', status: 'published' },
    { id: 'el_cm_1', name: 'Aleación de Titanio', kind: 'crafting_material', status: 'published' },
    { id: 'el_ig_1', name: 'Hierba Curativa', kind: 'ingredient', status: 'published' },
    { id: 'el_vh_1', name: 'Motocicleta Cyber', kind: 'vehicle', status: 'published' },
    { id: 'el_re_1', name: 'Refugio Seguro', kind: 'real_estate', status: 'published' },

    { id: 'el_lic_1', name: 'Licencia Provisional de Héroe', kind: 'license', status: 'published' },
    { id: 'el_perm_1', name: 'Permiso de Portación', kind: 'permission', status: 'published' },
    { id: 'el_cert_1', name: 'Certificación de Rescate', kind: 'certification', status: 'published' },
    { id: 'el_res_1', name: 'Acceso a Laboratorio', kind: 'character_resource', status: 'published' },
    { id: 'el_bg_1', name: 'Heredero de Fortuna', kind: 'background', status: 'published' },
    { id: 'el_cld_1', name: 'Red de Informantes', kind: 'clandestine_asset', status: 'published' },

    { id: 'el_tr_1', name: 'Ojo de Águila', kind: 'trait', status: 'published' },
    { id: 'el_wk_1', name: 'Miopía Severa', kind: 'weakness', status: 'published' },
    { id: 'el_sk_1', name: 'Combate Cuerpo a Cuerpo', kind: 'skill', status: 'published' },
    { id: 'el_upg_1', name: 'Entrenamiento de Fuerza', kind: 'attribute_upgrade', status: 'published' }
  ];

  const inventoryKinds = [
    'equipment', 'weapon', 'consumable', 'ammunition', 
    'crafting_material', 'ingredient', 'vehicle', 'real_estate'
  ];

  const credentialKinds = [
    'license', 'permission', 'certification', 
    'character_resource', 'background', 'clandestine_asset'
  ];

  it('filters published elements for inventory form to only allowed kinds', () => {
    const inventoryElements = sampleElements.filter(el => inventoryKinds.includes(el.kind));
    
    expect(inventoryElements.map(e => e.kind)).toEqual([
      'equipment', 'weapon', 'consumable', 'ammunition',
      'crafting_material', 'ingredient', 'vehicle', 'real_estate'
    ]);

    expect(inventoryElements.some(e => ['license', 'permission', 'certification', 'character_resource', 'background', 'clandestine_asset', 'trait', 'weakness', 'skill'].includes(e.kind))).toBe(false);
  });

  it('filters published elements for licenses and permissions form to only allowed kinds', () => {
    const credentialElements = sampleElements.filter(el => credentialKinds.includes(el.kind));

    expect(credentialElements.map(e => e.kind)).toEqual([
      'license', 'permission', 'certification',
      'character_resource', 'background', 'clandestine_asset'
    ]);

    expect(credentialElements.some(e => ['equipment', 'weapon', 'consumable', 'ammunition', 'crafting_material', 'ingredient', 'vehicle', 'real_estate', 'trait', 'weakness', 'skill'].includes(e.kind))).toBe(false);
  });
});
