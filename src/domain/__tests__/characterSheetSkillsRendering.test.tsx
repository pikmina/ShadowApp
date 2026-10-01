import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCharacterSheetViewModel } from '@/domain/characterSheetViewModel';
import { BaseSheetView } from '@/components/character/themes/BaseSheetView';
import { HeroSheetView } from '@/components/character/themes/HeroSheetView';
import { StudentSheetView } from '@/components/character/themes/StudentSheetView';
import { CivilianSheetView } from '@/components/character/themes/CivilianSheetView';
import { VillainSheetView } from '@/components/character/themes/VillainSheetView';
import { VigilanteSheetView } from '@/components/character/themes/VigilanteSheetView';

describe('Skills Data Pipeline & Rendering Parity Audit', () => {
  // Real Character Fixture with 2 distinct Skills at different levels
  const mockCharacterWithSkills = {
    id: 42,
    name: 'Kenji Sato',
    group: 'Héroes',
    yen: 25000,
    exp: 340,
    plus_ultra: 2,
    profileData: {
      basic_name: 'Kenji',
      last_name: 'Sato',
      alias: 'Vanguard',
      basic_age: 24,
      birth_date: '2176-08-15',
      basic_blood_type: 'O+',
      basic_alignment: 'Legal Bueno',
      occupation: 'Héroe Profesional de Patrulla',
      FUE: 4,
      DES: 3,
      RES: 3,
      INT: 3,
      VOL: 4,
      VEL: 3,
      quirk_name: 'Escudo Cinético',
      quirk_type: 'Emisión',
      quirk_level: 'Nivel 2. Dominio',
      quirk_description: 'Absorbe energía de impacto y la redistribuye en barreras defensivas.',
      quirk_lvl1: 'Despertar: Generación de barrera personal frontal.',
      quirk_lvl2: 'Dominio: Esfera de contención cinética de 3 metros.',
      quirk_lvl3: 'Plus Ultra: Sobrecarga reflectora de alta densidad.',
      traits: ['trait-1'],
      weaknesses: ['weak-1'],
      // Direct profileData skills format
      skills: [
        { id: 'skill-inv', name: 'Investigación', description: 'Rastreo y análisis de pistas', level: 2 },
      ],
    },
    // Relational possessions skills format (from element_possessions table)
    possessions: [
      {
        possession: { characterId: 42, elementId: 'skill-com', quantity: 3, equipped: false },
        element: { id: 'skill-com', name: 'Combate', description: 'Técnicas de lucha cuerpo a cuerpo y CQC', kind: 'skill', status: 'published' },
      },
      {
        possession: { characterId: 42, elementId: 'trait-1', quantity: 1, equipped: false },
        element: { id: 'trait-1', name: 'Reflejos Rápidos', description: 'Bono de tiempo de respuesta', kind: 'trait', status: 'published' },
      },
      {
        possession: { characterId: 42, elementId: 'weak-1', quantity: 1, equipped: false },
        element: { id: 'weak-1', name: 'Sobrecarga', description: 'Fatiga tras uso continuo', kind: 'weakness', status: 'published' },
      },
      {
        possession: { characterId: 42, elementId: 'cred-1', quantity: 1, equipped: false },
        element: { id: 'cred-1', name: 'Licencia Provisional de Héroe', kind: 'license', status: 'published' },
      },
      {
        possession: { characterId: 42, elementId: 'item-1', quantity: 2, equipped: true },
        element: { id: 'item-1', name: 'Guanteletes de Absorción', description: 'Equipo táctico reforzado', kind: 'equipment', status: 'published' },
      },
    ],
    techniques: [
      {
        id: 'tech-1',
        name: 'Impacto Cinético',
        level: 2,
        cost: 3,
        type: 'Don',
        target: 'Evasión',
        description: 'Libera la energía absorbida en un golpe concusivo.',
        autoDescription: 'Daño 2D6 + Mod FUE contra EVA.',
      },
    ],
  };

  const catalogElements = [
    { id: 'skill-com', name: 'Combate', description: 'Técnicas de lucha cuerpo a cuerpo y CQC', kind: 'skill' },
    { id: 'skill-inv', name: 'Investigación', description: 'Rastreo y análisis de pistas', kind: 'skill' },
    { id: 'trait-1', name: 'Reflejos Rápidos', description: 'Bono de tiempo de respuesta', kind: 'trait' },
    { id: 'weak-1', name: 'Sobrecarga', description: 'Fatiga tras uso continuo', kind: 'weakness' },
  ];

  it('1. CharacterSheetViewModel captures BOTH skills from possessions and profileData with correct levels', () => {
    const vm = buildCharacterSheetViewModel({
      character: mockCharacterWithSkills,
      elements: catalogElements,
    });

    expect(vm.skills).toHaveLength(2);

    const combatSkill = vm.skills.find(s => s.name === 'Combate');
    expect(combatSkill).toBeDefined();
    expect(combatSkill?.level).toBe(3);
    expect(combatSkill?.description).toBe('Técnicas de lucha cuerpo a cuerpo y CQC');

    const invSkill = vm.skills.find(s => s.name === 'Investigación');
    expect(invSkill).toBeDefined();
    expect(invSkill?.level).toBe(2);
    expect(invSkill?.description).toBe('Rastreo y análisis de pistas');
  });

  it('2. BaseSheetView renders both skills with correct names and levels in the DOM', () => {
    const vm = buildCharacterSheetViewModel({
      character: mockCharacterWithSkills,
      elements: catalogElements,
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
        theme="base"
      />
    );

    expect(html).toContain('Combate');
    expect(html).toContain('Nivel 3');
    expect(html).toContain('Investigación');
    expect(html).toContain('Nivel 2');
  });

  it('3. HeroSheetView renders both skills with correct names and levels in the DOM', () => {
    const vm = buildCharacterSheetViewModel({
      character: mockCharacterWithSkills,
      elements: catalogElements,
    });

    const html = renderToStaticMarkup(
      <HeroSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group={vm.group || 'Héroes'}
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

    expect(html).toContain('Combate');
    expect(html).toContain('Nivel 3');
    expect(html).toContain('Investigación');
    expect(html).toContain('Nivel 2');
  });

  it('4. StudentSheetView renders both skills with correct names and levels in the DOM', () => {
    const vm = buildCharacterSheetViewModel({
      character: mockCharacterWithSkills,
      elements: catalogElements,
    });

    const html = renderToStaticMarkup(
      <StudentSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group={vm.group || 'Estudiantes'}
        className={vm.academic.className}
        courseName={vm.academic.courseName}
        schoolName={vm.academic.schoolName}
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

    expect(html).toContain('Combate');
    expect(html).toContain('Nivel 3');
    expect(html).toContain('Investigación');
    expect(html).toContain('Nivel 2');
  });

  it('5. CivilianSheetView renders both skills with correct names and levels in the DOM', () => {
    const vm = buildCharacterSheetViewModel({
      character: mockCharacterWithSkills,
      elements: catalogElements,
    });

    const html = renderToStaticMarkup(
      <CivilianSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group={vm.group || 'Civiles'}
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

    expect(html).toContain('Combate');
    expect(html).toContain('Nivel 3');
    expect(html).toContain('Investigación');
    expect(html).toContain('Nivel 2');
  });

  it('6. Villain & Vigilante themes render both skills in the DOM via BaseSheetView with theme', () => {
    const vm = buildCharacterSheetViewModel({
      character: mockCharacterWithSkills,
      elements: catalogElements,
    });

    const villainHtml = renderToStaticMarkup(
      <VillainSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group="Villanos"
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
    expect(villainHtml).toContain('Combate');
    expect(villainHtml).toContain('3');
    expect(villainHtml).toContain('Investigación');
    expect(villainHtml).toContain('2');

    const vigilanteHtml = renderToStaticMarkup(
      <VigilanteSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group="Vigilantes"
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
    expect(vigilanteHtml).toContain('Combate');
    expect(vigilanteHtml).toContain('Nivel 3');
    expect(vigilanteHtml).toContain('Investigación');
    expect(vigilanteHtml).toContain('Nivel 2');
  });
});
