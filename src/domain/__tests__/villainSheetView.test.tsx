import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCharacterSheetViewModel } from '@/domain/characterSheetViewModel';
import { VillainSheetView } from '@/components/character/themes/VillainSheetView';
import { detectFactionTheme } from '@/components/character/themes/FactionSheetTheme';

describe('VillainSheetView - Underground Grunge Parity & Anti-Fictitious Audit', () => {
  const fullVillainFixture = {
    id: 88,
    name: 'Ryuji Kageyama',
    group: 'Villanos',
    yen: 64000,
    exp: 580,
    plus_ultra: 3,
    profileData: {
      basic_name: 'Ryuji',
      last_name: 'Kageyama',
      alias: 'Blackout',
      basic_age: 28,
      birth_date: '2172-09-21',
      basic_blood_type: 'AB-',
      basic_alignment: 'Caótico Malvado',
      occupation: 'Operativo Clandestino',
      nationality: 'Japonesa',
      gender: 'Masculino',
      quote: 'El orden de su sociedad es una ilusión que arderá en cenizas.',
      FUE: 5,
      DES: 4,
      RES: 4,
      INT: 3,
      VOL: 4,
      VEL: 3,
      quirk_name: 'Disolución Umbría',
      quirk_type: 'Transformación',
      quirk_level: 'Nivel 3. Plus Ultra',
      quirk_description: 'Capacidad de disolver la materia orgánica mediante secreciones oscuras.',
      quirk_lvl1: 'N1: Secreción corrosiva al contacto directo.',
      quirk_lvl2: 'N2: Niebla cáustica en radio de 5 metros.',
      quirk_lvl3: 'N3: Fusión cáustica total con daño persistente.',
      traits: ['trait-feroz'],
      weaknesses: ['weak-frio'],
      skills: [
        { id: 'sk-cqc', name: 'Combate Callejero', description: 'Lucha brutal sin reglas', level: 3 },
        { id: 'sk-intimidar', name: 'Intimidación', description: 'Presión psicológica sobre el rival', level: 2 },
      ],
      licenses: [
        { id: 'cred-mercado', name: 'Pase del Mercado Negro', kind: 'Activo Clandestino', description: 'Acceso a canales no regulados' },
      ],
      biography: 'Desertor que formó una célula independiente en las cloacas metropolitanas.',
    },
    possessions: [
      {
        possession: { characterId: 88, elementId: 'item-cuchilla', quantity: 1, equipped: true },
        element: { id: 'item-cuchilla', name: 'Cuchilla de Tungsteno', kind: 'weapon', category: 'Armas', description: 'Filo reforzado' },
      },
      {
        possession: { characterId: 88, elementId: 'trait-feroz', quantity: 1 },
        element: { id: 'trait-feroz', name: 'Instinto Feroz', kind: 'trait', description: 'Bono a la agresividad en combate' },
      },
      {
        possession: { characterId: 88, elementId: 'weak-frio', quantity: 1 },
        element: { id: 'weak-frio', name: 'Sensibilidad Térmica', kind: 'weakness', description: 'Ralentización ante frío extremo' },
      },
    ],
    techniques: [
      {
        id: 'tech-garrada',
        name: 'Garrada Cáustica',
        cost: 5,
        classification: 'Ofensiva',
        staminaCost: 5,
        description: 'Zarpazo corrosivo que penetra defensas.',
        autoDescription: 'Daño 3D6 + Daño Físico.',
      },
    ],
    employments: [
      {
        id: 'emp-v1',
        position: { name: 'Ejecutor' },
        institution: { name: 'Sindicato Subterráneo' },
      },
    ],
  };

  const villainCatalog = [
    { id: 'item-cuchilla', name: 'Cuchilla de Tungsteno', kind: 'weapon', category: 'Armas', description: 'Filo reforzado' },
    { id: 'trait-feroz', name: 'Instinto Feroz', kind: 'trait', description: 'Bono a la agresividad en combate' },
    { id: 'weak-frio', name: 'Sensibilidad Térmica', kind: 'weakness', description: 'Ralentización ante frío extremo' },
    { id: 'cred-mercado', name: 'Pase del Mercado Negro', kind: 'Activo Clandestino', description: 'Acceso a canales no regulados' },
  ];

  it('1. Theme detection correctly identifies Villanos', () => {
    expect(detectFactionTheme('Villanos')).toBe('villain');
    expect(detectFactionTheme('Villano')).toBe('villain');
    expect(detectFactionTheme('Liga de Villanos')).toBe('villain');
  });

  it('2. VillainSheetView renders all real canonical data without data loss', () => {
    const vm = buildCharacterSheetViewModel({
      character: fullVillainFixture,
      elements: villainCatalog,
      employmentsList: fullVillainFixture.employments,
    });

    const html = renderToStaticMarkup(
      <VillainSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group={vm.group || 'Villanos'}
        status={vm.status}
        basicStage={vm.basicStage}
        quirkName={vm.quirk.name}
        quirkType={vm.quirk.type}
        quirkEvolution={vm.quirk.evolution}
        quirkDescription={vm.quirk.description}
        quirkLevelOne={vm.quirk.levelOne}
        quirkLevelTwo={vm.quirk.levelTwo}
        quirkLevelThree={vm.quirk.levelThree}
        reputation={vm.resources.reputation}
        yen={vm.resources.yen}
        exp={vm.resources.exp}
        plusUltra={vm.resources.plusUltra}
        currentHealth={vm.resources.currentHealth}
        maxHealth={vm.resources.maxHealth}
        currentStamina={vm.resources.currentStamina}
        maxStamina={vm.resources.maxStamina}
        evasion={vm.combatStatus.evasion}
        courage={vm.combatStatus.courage}
        physicalDamageText={vm.combatStatus.physicalDamageText}
        rangeDamageText={vm.combatStatus.rangeDamageText}
        damageReductionText={vm.combatStatus.damageReductionText}
        initiativeText={vm.combatStatus.initiativeText}
        baseAttributes={vm.baseAttributes}
        defenseList={vm.defenseList}
        combatStatusList={vm.combatStatusList}
        personalDataList={vm.personalDataList}
        traits={vm.traits}
        weaknesses={vm.weaknesses}
        skills={vm.skills}
        credentials={vm.credentials}
        techniques={vm.techniques}
        possessions={vm.possessions}
        biography={vm.biography}
        character={vm.character}
        profile={vm.profile}
        employments={vm.employments}
      />
    );

    // Personal & Identity
    expect(html).toContain('Ryuji Kageyama');
    expect(html).toContain('Blackout');
    expect(html).toContain('28 años');
    expect(html).toContain('2172-09-21');
    expect(html).toContain('AB-');
    expect(html).toContain('Caótico Malvado');
    expect(html).toContain('Ejecutor');
    expect(html).toContain('Japonesa');
    expect(html).toContain('El orden de su sociedad es una ilusión que arderá en cenizas.');

    // Quirk & 3 Levels
    expect(html).toContain('Disolución Umbría');
    expect(html).toContain('Tipo: Transformación');
    expect(html).toContain('Capacidad de disolver la materia orgánica mediante secreciones oscuras.');
    expect(html).toContain('N1: Secreción corrosiva al contacto directo.');
    expect(html).toContain('N2: Niebla cáustica en radio de 5 metros.');
    expect(html).toContain('N3: Fusión cáustica total con daño persistente.');

    // Base Attributes & Combat Stats
    expect(html).toMatch(/FUE/i);
    expect(html).toMatch(/DES/i);
    expect(html).toMatch(/RES/i);
    expect(html).toMatch(/INT/i);
    expect(html).toMatch(/VOL/i);
    expect(html).toMatch(/VEL/i);
    expect(html).toMatch(/SALUD/i);
    expect(html).toMatch(/ESTAMINA/i);
    expect(html).toMatch(/EVASI[ÓO]N/i);
    expect(html).toMatch(/CORAJE/i);
    expect(html).toMatch(/DAÑO FÍSICO/i);
    expect(html).toMatch(/DAÑO RANGO/i);
    expect(html).toMatch(/REDUCCIÓN DAÑO/i);
    expect(html).toMatch(/INICIATIVA/i);
    expect(html).toContain('Modificador de Fuerza');
    expect(html).toContain('Modificador de Destreza');
    expect(html).toContain('+2');

    // Skills
    expect(html).toContain('Combate Callejero');
    expect(html).toContain('Nivel 3');
    expect(html).toContain('Intimidación');
    expect(html).toContain('Nivel 2');

    // Traits & Weaknesses
    expect(html).toContain('Instinto Feroz');
    expect(html).toContain('Sensibilidad Térmica');

    // Techniques
    expect(html).toContain('Garrada Cáustica');
    expect(html).toContain('CE 5');
    expect(html).toContain('Daño 3D6 + Daño Físico.');

    // Inventory
    expect(html).toContain('Cuchilla de Tungsteno');
    expect(html).toContain('Equipado');

    // Credentials & Clandestine Assets
    expect(html).toContain('Pase del Mercado Negro');

    // Biography & Employments
    expect(html).toContain('Desertor que formó una célula independiente en las cloacas metropolitanas.');
    expect(html).toContain('Ejecutor');
    expect(html).toContain('Sindicato Subterráneo');
  });

  it('3. Verified that NO fictitious police/danger fields appear in the rendered DOM', () => {
    const vm = buildCharacterSheetViewModel({
      character: fullVillainFixture,
      elements: villainCatalog,
    });

    const html = renderToStaticMarkup(
      <VillainSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group={vm.group || 'Villanos'}
        status={vm.status}
        basicStage={vm.basicStage}
        quirkName={vm.quirk.name}
        quirkType={vm.quirk.type}
        quirkEvolution={vm.quirk.evolution}
        quirkDescription={vm.quirk.description}
        quirkLevelOne={vm.quirk.levelOne}
        quirkLevelTwo={vm.quirk.levelTwo}
        quirkLevelThree={vm.quirk.levelThree}
        reputation={vm.resources.reputation}
        yen={vm.resources.yen}
        exp={vm.resources.exp}
        plusUltra={vm.resources.plusUltra}
        currentHealth={vm.resources.currentHealth}
        maxHealth={vm.resources.maxHealth}
        currentStamina={vm.resources.currentStamina}
        maxStamina={vm.resources.maxStamina}
        evasion={vm.combatStatus.evasion}
        courage={vm.combatStatus.courage}
        physicalDamageText={vm.combatStatus.physicalDamageText}
        rangeDamageText={vm.combatStatus.rangeDamageText}
        damageReductionText={vm.combatStatus.damageReductionText}
        initiativeText={vm.combatStatus.initiativeText}
        baseAttributes={vm.baseAttributes}
        defenseList={vm.defenseList}
        combatStatusList={vm.combatStatusList}
        personalDataList={vm.personalDataList}
        traits={vm.traits}
        weaknesses={vm.weaknesses}
        skills={vm.skills}
        credentials={vm.credentials}
        techniques={vm.techniques}
        possessions={vm.possessions}
        biography={vm.biography}
        character={vm.character}
        profile={vm.profile}
      />
    );

    // Strictly prohibited invented pseudo-police fields
    expect(html).not.toContain('ÍNDICE DE PELIGRO');
    expect(html).not.toContain('ORDEN DE CAPTURA');
    expect(html).not.toContain('CONTENCIÓN');
    expect(html).not.toContain('FUERZA AUTORIZADA');
    expect(html).not.toContain('PRIORIDAD 1');
    expect(html).not.toContain('AMENAZA NIVEL-S');
    expect(html).not.toContain('COMISIÓN DE SEGURIDAD PÚBLICA');
    expect(html).not.toContain('ALERTA ROJA (S)');
  });

  it('4. VillainSheetView uses dynamic accent color and preserves Underground Grunge styling without hardcoded faction color', () => {
    const vm = buildCharacterSheetViewModel({
      character: fullVillainFixture,
    });

    const customColor = '#dc2626';
    const html = renderToStaticMarkup(
      <VillainSheetView
        fullName={vm.fullName}
        groupColor={customColor}
        baseAttributes={vm.baseAttributes}
      />
    );

    expect(html).toMatch(/--villain-accent:\s*#dc2626/);
    expect(html).toContain('UNDERGROUND CHAOTIC EDITORIAL');
  });

  it('5. Handles empty / minimal villain characters gracefully without mock content', () => {
    const minimalFixture = {
      id: 102,
      name: 'Villano Sin Nombre',
      group: 'Villanos',
      profileData: {},
    };

    const vm = buildCharacterSheetViewModel({
      character: minimalFixture,
    });

    const html = renderToStaticMarkup(
      <VillainSheetView
        fullName={vm.fullName}
        baseAttributes={vm.baseAttributes}
      />
    );

    expect(html).toContain('Villano Sin Nombre');
    expect(html).toContain('Sin habilidades registradas.');
    expect(html).toContain('Sin rasgos especiales registrados.');
    expect(html).toContain('Sin debilidades registradas.');
    expect(html).toContain('Sin técnicas de combate registradas.');
    expect(html).toContain('Sin objetos en inventario.');
  });
});
