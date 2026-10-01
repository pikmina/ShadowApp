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

describe('Comprehensive Category DATA / RENDER Parity Matrix Audit', () => {
  const fullFixture = {
    id: 100,
    name: 'Daiki Shimizu',
    group: 'Héroes',
    yen: 50000,
    exp: 600,
    plus_ultra: 3,
    profileData: {
      basic_name: 'Daiki',
      last_name: 'Shimizu',
      alias: 'Tempest',
      basic_age: 22,
      birth_date: '2178-11-03',
      basic_blood_type: 'B+',
      basic_alignment: 'Neutral Bueno',
      occupation: 'Héroe de Rescate',
      FUE: 4,
      DES: 4,
      RES: 3,
      INT: 4,
      VOL: 3,
      VEL: 5,
      quirk_name: 'Vórtice Atmosférico',
      quirk_type: 'Emisión',
      quirk_level: 'Nivel 3. Plus Ultra',
      quirk_description: 'Manipulación de corrientes de aire y vórtices ciclónicos.',
      quirk_lvl1: 'N1: Ráfagas de viento presurizado.',
      quirk_lvl2: 'N2: Vórtice envolvente de contención aérea.',
      quirk_lvl3: 'N3: Ciclón Plus Ultra de alta dispersión.',
      traits: ['trait-acrobata'],
      weaknesses: ['weak-asma'],
      skills: [
        { id: 'skill-med', name: 'Primeros Auxilios', description: 'Atención prehospitalaria', level: 2 },
      ],
    },
    possessions: [
      {
        possession: { characterId: 100, elementId: 'skill-pilot', quantity: 3 },
        element: { id: 'skill-pilot', name: 'Pilotaje Aéreo', description: 'Manejo de aeronaves y drones', kind: 'skill', status: 'published' },
      },
      {
        possession: { characterId: 100, elementId: 'trait-acrobata', quantity: 1 },
        element: { id: 'trait-acrobata', name: 'Acróbata', description: 'Gran agilidad en el aire', kind: 'trait', status: 'published' },
      },
      {
        possession: { characterId: 100, elementId: 'weak-asma', quantity: 1 },
        element: { id: 'weak-asma', name: 'Fatiga Pulmonar', description: 'Sensibilidad a gases', kind: 'weakness', status: 'published' },
      },
      {
        possession: { characterId: 100, elementId: 'cred-lic', quantity: 1 },
        element: { id: 'cred-lic', name: 'Licencia Profesional de Rescate', kind: 'license', status: 'published' },
      },
      {
        possession: { characterId: 100, elementId: 'item-traje', quantity: 1, equipped: true },
        element: { id: 'item-traje', name: 'Traje Aerodinámico Mk-IV', description: 'Traje reforzado con alas retráctiles', kind: 'equipment', status: 'published' },
      },
    ],
    techniques: [
      {
        id: 'tech-gale',
        name: 'Golpe Vendaval',
        level: 3,
        cost: 4,
        type: 'Don',
        target: 'Evasión',
        description: 'Concentra aire comprimido en los puños para propulsar un impacto lejano.',
        autoDescription: 'Daño 3D6 + Mod DES contra EVA.',
      },
    ],
  };

  const catalog = [
    { id: 'skill-pilot', name: 'Pilotaje Aéreo', description: 'Manejo de aeronaves y drones', kind: 'skill' },
    { id: 'skill-med', name: 'Primeros Auxilios', description: 'Atención prehospitalaria', kind: 'skill' },
    { id: 'trait-acrobata', name: 'Acróbata', description: 'Gran agilidad en el aire', kind: 'trait' },
    { id: 'weak-asma', name: 'Fatiga Pulmonar', description: 'Sensibilidad a gases', kind: 'weakness' },
  ];

  it('Matrix: All 11 Categories exist in CharacterSheetViewModel', () => {
    const vm = buildCharacterSheetViewModel({
      character: fullFixture,
      elements: catalog,
    });

    // 1. Personal Info
    expect(vm.fullName).toBe('Daiki Shimizu');
    expect(vm.alias).toBe('Tempest');
    expect(vm.personalDataList.find(d => d.label === 'Edad')?.value).toBe('22 años');
    expect(vm.personalDataList.find(d => d.label === 'Cumpleaños')?.value).toBe('2178-11-03');
    expect(vm.personalDataList.find(d => d.label === 'Género')?.value).toBe('No especificado');
    expect(vm.personalDataList.find(d => d.label === 'Tipo de Sangre')?.value).toBe('B+');
    expect(vm.personalDataList.find(d => d.label === 'Alineación')?.value).toBe('Neutral Bueno');

    // 2. Base Attributes
    expect(vm.baseAttributes).toHaveLength(6);
    expect(vm.baseAttributes.map(a => a.key)).toEqual(['FUE', 'RES', 'DES', 'INT', 'VOL', 'VEL']);

    // 3. Derived Stats
    expect(vm.defenseList.find(d => d.label === 'EVASIÓN')).toBeDefined();
    expect(vm.defenseList.find(d => d.label === 'CORAJE')).toBeDefined();

    // 4. Modifiers FUE/DES
    expect(vm.combatStatus.modFuerza).toBe(2); // floor(4/2) = 2
    expect(vm.combatStatus.modDestreza).toBe(2); // floor(4/2) = 2

    // 5. Skills (2 items)
    expect(vm.skills).toHaveLength(2);
    expect(vm.skills.find(s => s.name === 'Pilotaje Aéreo')?.level).toBe(3);
    expect(vm.skills.find(s => s.name === 'Primeros Auxilios')?.level).toBe(2);

    // 6. Credentials
    expect(vm.credentials).toHaveLength(1);

    // 7. Quirk & 3 Levels
    expect(vm.quirk.name).toBe('Vórtice Atmosférico');
    expect(vm.quirk.levelOne).toBe('N1: Ráfagas de viento presurizado.');
    expect(vm.quirk.levelTwo).toBe('N2: Vórtice envolvente de contención aérea.');
    expect(vm.quirk.levelThree).toBe('N3: Ciclón Plus Ultra de alta dispersión.');

    // 8. Traits
    expect(vm.traits).toHaveLength(1);
    expect(vm.traits[0].name).toBe('Acróbata');

    // 9. Weaknesses
    expect(vm.weaknesses).toHaveLength(1);
    expect(vm.weaknesses[0].name).toBe('Fatiga Pulmonar');

    // 10. Techniques
    expect(vm.techniques).toHaveLength(1);
    expect(vm.techniques[0].name).toBe('Golpe Vendaval');
    expect(vm.techniques[0].autoDescription).toContain('Daño 3D6');

    // 11. Inventory
    expect(vm.possessions).toHaveLength(1);
    expect(vm.possessions[0].name).toBe('Traje Aerodinámico Mk-IV');
  });

  const renderers = [
    {
      name: 'BASE',
      render: (vm: any) =>
        renderToStaticMarkup(
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
        ),
    },
    {
      name: 'HERO',
      render: (vm: any) =>
        renderToStaticMarkup(
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
        ),
    },
    {
      name: 'STUDENT',
      render: (vm: any) =>
        renderToStaticMarkup(
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
        ),
    },
    {
      name: 'CIVILIAN',
      render: (vm: any) =>
        renderToStaticMarkup(
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
        ),
    },
    {
      name: 'VILLAIN',
      render: (vm: any) =>
        renderToStaticMarkup(
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
            modFuerza={vm.combatStatus.modFuerza}
            modDestreza={vm.combatStatus.modDestreza}
            combatStatus={vm.combatStatus}
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
        ),
    },
    {
      name: 'VIGILANTE',
      render: (vm: any) =>
        renderToStaticMarkup(
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
            modFuerza={vm.combatStatus.modFuerza}
            modDestreza={vm.combatStatus.modDestreza}
            combatStatus={vm.combatStatus}
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
        ),
    },
  ];

  renderers.forEach(({ name, render }) => {
    it(`DOM Parity Matrix: ${name} renders all 11 system categories`, () => {
      const vm = buildCharacterSheetViewModel({
        character: fullFixture,
        elements: catalog,
      });

      const html = render(vm);

      // 1. Personal Info
      expect(html).toContain('Daiki');
      expect(html).toContain('Shimizu');
      expect(html).toContain('Tempest');
      expect(html).toContain('22 años');
      expect(html).toContain('2178-11-03');

      // 2. Base Attributes
      expect(html).toMatch(/FUE/i);
      expect(html).toMatch(/DES/i);

      // 3. Derived Stats
      expect(html).toMatch(/evasi[óo]n/i);
      expect(html).toMatch(/coraje/i);

      // 4. Modifiers
      expect(html).toMatch(/Mod(ificador)?(\.|\s+de)?\s*Fuerza/i);
      expect(html).toMatch(/Mod(ificador)?(\.|\s+de)?\s*Destreza/i);
      expect(html).toMatch(/(\+2|2)/);

      // 5. Skills (BOTH skills with correct levels)
      expect(html).toContain('Pilotaje Aéreo');
      expect(html).toMatch(/Nivel 3|Grado 3/i);
      expect(html).toContain('Primeros Auxilios');
      expect(html).toMatch(/Nivel 2|Grado 2/i);

      // 6. Credentials
      expect(html).toContain('Licencia Profesional de Rescate');

      // 7. Quirk and 3 Levels
      expect(html).toContain('Vórtice Atmosférico');
      expect(html).toContain('N1: Ráfagas de viento presurizado.');
      expect(html).toContain('N2: Vórtice envolvente de contención aérea.');
      expect(html).toContain('N3: Ciclón Plus Ultra de alta dispersión.');

      // 8. Traits
      expect(html).toContain('Acróbata');

      // 9. Weaknesses
      expect(html).toContain('Fatiga Pulmonar');

      // 10. Techniques
      expect(html).toContain('Golpe Vendaval');
      expect(html).toContain('Daño 3D6');

      // 11. Inventory
      expect(html).toContain('Traje Aerodinámico Mk-IV');
    });
  });
});
