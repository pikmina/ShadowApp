import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BaseSheetView } from '@/components/character/themes/BaseSheetView';
import { buildCharacterSheetViewModel } from '@/domain/characterSheetViewModel';

describe('BaseSheetView Parity with Reference Screenshots', () => {
  const kirishimaFixture = {
    id: 2,
    name: 'Eijiro Kirishima',
    group: 'Estudiantes',
    yen: 5371,
    exp: 523,
    plus_ultra: 0,
    profileData: {
      basic_name: 'Eijiro',
      last_name: 'Kirishima',
      alias: 'Red Riot',
      basic_age: 15,
      gender: 'Masculino',
      nationality: 'Japonesa',
      birth_date: '2185-10-16',
      blood_type: 'O-',
      basic_alignment: 'Heróica',
      faceclaim: 'Eijiro Kirishima - MHA',
      FUE: 5,
      RES: 5,
      DES: 3,
      INT: 2,
      VEL: 3,
      VOL: 4,
      quirk_name: 'Endurecimiento',
      quirk_type: 'Transformación',
      quirk_level: 'Nivel 2. Dominio',
      quirk_description:
        'Le permite endurecer cualquier parte de su cuerpo hasta convertirla en una sustancia pétrea, afilada y extremadamente resistente.',
      quirk_lvl1:
        'Eijiro es capaz de endurecer su piel de manera temporal, aumentando su resistencia física frente a impactos leves.',
      quirk_lvl2:
        'Endurecimiento extendido a mayor densidad y resistencia balística.',
      quirk_lvl3:
        'Endurecimiento máximo temporal de cuerpo completo.',
    },
    possessions: [],
    techniques: [
      {
        id: 't-1',
        name: 'Crimson Counter',
        level: 1,
        cost: 3,
        type: 'Don / Quirk',
        target: 'FUE',
        description: 'Eijiro endurece rápidamente la parte superior de su cuerpo...',
        autoDescription: 'Inflige 2D6 de daño de tipo Físico a un enemigo. Coste: 3 de Estamina.',
      },
      {
        id: 't-2',
        name: 'Unbreakable',
        level: 1,
        cost: 1,
        type: 'Don / Quirk',
        target: 'RES',
        description: 'Kirishima concentra su quirk por todo el cuerpo...',
        autoDescription: 'Otorga 30 puntos de Barrera. Tiempo de recarga: 2 turnos. Coste: 1 de Estamina.',
      },
    ],
  };

  const catalog = [
    { id: 'sk-1', name: 'Carisma', kind: 'skill', quantity: 3 },
    { id: 'sk-2', name: 'Combate', kind: 'skill', quantity: 3 },
    { id: 'sk-3', name: 'Dominio de Quirk', kind: 'skill', quantity: 3 },
    { id: 'tr-1', name: 'Fuerte', kind: 'trait', description: '+1 en Fuerza.' },
    { id: 'tr-2', name: 'Fortaleza mental', kind: 'trait', description: '+1 en Voluntad.' },
    { id: 'wk-1', name: 'Punto de Quiebre', kind: 'weakness', description: 'Mientras su Salud se encuentre al 50% o menos...' },
    { id: 'wk-2', name: 'Rigidez Corporal', kind: 'weakness', description: 'La excesiva masa muscular compromete los reflejos...' },
    { id: 'cr-1', name: 'Registro de Quirk', kind: 'license', description: 'Se trata del registro de quirks de todos los ciudadanos...' },
  ];

  it('1. Renders complete BaseSheetView matching Screenshot 1, 2, and 3 architecture', () => {
    const vm = buildCharacterSheetViewModel({
      character: kirishimaFixture,
      elements: catalog,
    });

    const html = renderToStaticMarkup(
      <BaseSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group={vm.group || 'Sin grupo'}
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
        modFuerza={vm.combatStatus.modFuerza}
        modDestreza={vm.combatStatus.modDestreza}
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

    // SCREENSHOT 3 CHECKS:
    // Header
    expect(html).toContain('Eijiro Kirishima');
    expect(html).toContain('RED RIOT');
    expect(html).toContain('REPUTACIÓN');
    expect(html).toContain('YENES');
    expect(html).toContain('EXP');

    // SYS.INFO
    expect(html).toContain('SYS.INFO // DATOS BÁSICOS');
    expect(html).toContain('SANGRE // RH');
    expect(html).toContain('EDAD // AÑOS');
    expect(html).toContain('NACIMIENTO // DOB');
    expect(html).toContain('ALINEACIÓN // ALGN');
    expect(html).toContain('GÉNERO // GND');
    expect(html).toContain('NACIONALIDAD // NAT');

    // Left Column
    expect(html).toContain('ACTIVO');
    expect(html).toContain('FACECLAIM // PB');
    expect(html).toContain('SYS.DIAGNOSTIC // PROTOCOLO ACTIVO');

    // 2x2 Panels: ESTATUS, DEFENSAS, ATRIBUTOS BASE, ATRIBUTOS DERIVADOS
    expect(html).toContain('ESTATUS');
    expect(html).toContain('SALUD');
    expect(html).toContain('ESTAMINA');
    expect(html).toContain('DEFENSAS');
    expect(html).toContain('EVASIÓN');
    expect(html).toContain('CORAJE');
    expect(html).toContain('ATRIBUTOS BASE');
    expect(html).toContain('FUERZA');
    expect(html).toContain('RESISTENCIA');
    expect(html).toContain('DESTREZA');
    expect(html).toContain('INTELIGENCIA');
    expect(html).toContain('VELOCIDAD');
    expect(html).toContain('VOLUNTAD');
    expect(html).toContain('ATRIBUTOS DERIVADOS');
    expect(html).toContain('DAÑO FÍSICO');
    expect(html).toContain('DAÑO DE RANGO');
    expect(html).toContain('REDUCCIÓN DAÑO');
    expect(html).toContain('INICIATIVA');
    expect(html).toContain('MOD FUE');
    expect(html).toContain('MOD DES');
    expect(html).toContain('PLUS ULTRA');
    expect(html).toContain('RECURSO EXTRAORDINARIO');

    // SCREENSHOT 2 CHECKS:
    expect(html).toContain('// LEYENDA DE ICONOS:');
    expect(html).toContain('Endurecimiento');
    expect(html).toContain('Nivel 2. Dominio');
    expect(html).toContain('TIPO:');
    expect(html).toContain('NIVEL 1');
    expect(html).toContain('NIVEL 2');
    expect(html).toContain('NIVEL 3');

    // Right Panels
    expect(html).toMatch(/OCUPACIÓN\s*(&|&amp;)\s*FORMACIÓN/);
    expect(html).toContain('ESCUELA');
    expect(html).toContain('CERTIFICACIONES');
    expect(html).toContain('SYS.ARCHIVE // BIO-TELEMETRÍA');
    expect(html).toContain('SEC.NODE // 77-B');

    // 3 Columns: Habilidades, Rasgos, Debilidades
    expect(html).toContain('HABILIDADES');
    expect(html).toContain('RASGOS');
    expect(html).toContain('DEBILIDADES');

    // SCREENSHOT 1 CHECKS:
    expect(html).toContain('TÉCNICAS');
    expect(html).toContain('Crimson Counter');
    expect(html).toContain('3 CE');
    expect(html).toContain('DESCRIPCIÓN MECÁNICA:');
    expect(html).toContain('Unbreakable');
    expect(html).toContain('1 CE');

    // Inventory
    expect(html).toContain('INVENTARIO');
    expect(html).toContain('VACÍO');

    // Footer
    expect(html).toContain('FICHA PÚBLICA DE SÓLO LECTURA · SHADOWMORE OS');
  });

  it('2. Properly formats Modificador de Fuerza and Destreza when values are 0', () => {
    const fixtureZero = {
      ...kirishimaFixture,
      profileData: {
        ...kirishimaFixture.profileData,
        FUE: 0,
        DES: 1,
      },
    };

    const vm = buildCharacterSheetViewModel({
      character: fixtureZero,
    });

    const html = renderToStaticMarkup(
      <BaseSheetView
        fullName={vm.fullName}
        status={vm.status}
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
        modFuerza={0}
        modDestreza={0}
        baseAttributes={vm.baseAttributes}
        defenseList={vm.defenseList}
        combatStatusList={vm.combatStatusList}
        personalDataList={vm.personalDataList}
        traits={[]}
        weaknesses={[]}
        techniques={[]}
        possessions={[]}
        character={vm.character}
        profile={vm.profile}
      />
    );

    // Must show 0 for both MOD FUE and MOD DES
    expect(html).toMatch(/MOD FUE[\s\S]*?>\s*0\s*</);
    expect(html).toMatch(/MOD DES[\s\S]*?>\s*0\s*</);
  });
});
