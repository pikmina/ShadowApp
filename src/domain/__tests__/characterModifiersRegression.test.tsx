import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCharacterSheetViewModel } from '@/domain/characterSheetViewModel';
import { VillainSheetView } from '@/components/character/themes/VillainSheetView';
import { VigilanteSheetView } from '@/components/character/themes/VigilanteSheetView';
import { CANONICAL_STAT_ICONS } from '@/domain/canonicalStatIcons';
import { Swords, Target } from 'lucide-react';

describe('REGRESSION AUDIT: Modificador de Fuerza & Destreza in Villain and Vigilante DOM', () => {
  // 1. Fixture with unmistakable positive modifiers: FUE = 7 (+3), DES = 5 (+2)
  const fixturePositive = {
    id: 991,
    name: 'Akira Kage',
    group: 'Villanos',
    yen: 10000,
    exp: 500,
    plus_ultra: 1,
    profileData: {
      basic_name: 'Akira',
      last_name: 'Kage',
      alias: 'Nemesis',
      basic_age: 30,
      gender: 'Masculino',
      nationality: 'Japonesa',
      FUE: 7, // floor(7/2) = 3 -> +3
      DES: 5, // floor(5/2) = 2 -> +2
      RES: 4,
      INT: 4,
      VOL: 3,
      VEL: 3,
      quirk_name: 'Fuerza Gravitacional',
      quirk_type: 'Emisión',
      quirk_lvl1: 'Onda básica',
    },
    possessions: [],
    techniques: [],
  };

  // 2. Fixture with zero modifiers: FUE = 0 (0), DES = 1 (0)
  const fixtureZero = {
    id: 992,
    name: 'Rei Usagi',
    group: 'Vigilantes',
    yen: 500,
    exp: 0,
    plus_ultra: 0,
    profileData: {
      basic_name: 'Rei',
      last_name: 'Usagi',
      alias: 'Echo',
      basic_age: 19,
      gender: 'Femenino',
      nationality: 'Japonesa',
      FUE: 0, // floor(0/2) = 0 -> 0
      DES: 1, // floor(1/2) = 0 -> 0
      RES: 2,
      INT: 6,
      VOL: 4,
      VEL: 2,
      quirk_name: 'Eco Sísmico',
      quirk_type: 'Emisión',
      quirk_lvl1: 'Reverberación',
    },
    possessions: [],
    techniques: [],
  };

  it('1. Canonical stat icons are strictly bound to Swords and Target', () => {
    expect(CANONICAL_STAT_ICONS.modFuerza).toBe(Swords);
    expect(CANONICAL_STAT_ICONS.modDestreza).toBe(Target);
  });

  describe('VillainSheetView DOM Rendering', () => {
    it('renders "Modificador de Fuerza: +3" and "Modificador de Destreza: +2" when mapped from ViewModel', () => {
      const vm = buildCharacterSheetViewModel({
        character: fixturePositive,
      });

      // Verify ViewModel calculated properties first
      expect(vm.combatStatus.modFuerza).toBe(3);
      expect(vm.combatStatus.modDestreza).toBe(2);

      // Render with explicit props matching ViewModel contract
      const htmlExplicit = renderToStaticMarkup(
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
      );

      // Strict DOM assertion for Modificador de Fuerza
      expect(htmlExplicit).toContain('Modificador de Fuerza');
      expect(htmlExplicit).toContain('+3');

      // Strict DOM assertion for Modificador de Destreza
      expect(htmlExplicit).toContain('Modificador de Destreza');
      expect(htmlExplicit).toContain('+2');

      // Also verify spreading ViewModel directly
      const htmlSpread = renderToStaticMarkup(<VillainSheetView {...(vm as any)} />);
      expect(htmlSpread).toContain('Modificador de Fuerza');
      expect(htmlSpread).toContain('+3');
      expect(htmlSpread).toContain('Modificador de Destreza');
      expect(htmlSpread).toContain('+2');
    });

    it('renders "0" (not hidden or missing) when modifiers are 0 in VillainSheetView', () => {
      const vm = buildCharacterSheetViewModel({
        character: fixtureZero,
      });

      expect(vm.combatStatus.modFuerza).toBe(0);
      expect(vm.combatStatus.modDestreza).toBe(0);

      const html = renderToStaticMarkup(
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
      );

      expect(html).toContain('Modificador de Fuerza');
      expect(html).toContain('Modificador de Destreza');
      // Must render exactly "0" for both modifiers
      expect(html).toMatch(/Modificador de Fuerza[\s\S]*?>\s*0\s*</);
      expect(html).toMatch(/Modificador de Destreza[\s\S]*?>\s*0\s*</);
    });
  });

  describe('VigilanteSheetView DOM Rendering', () => {
    it('renders "Modificador de Fuerza: +3" and "Modificador de Destreza: +2" when mapped from ViewModel', () => {
      const vm = buildCharacterSheetViewModel({
        character: fixturePositive,
      });

      expect(vm.combatStatus.modFuerza).toBe(3);
      expect(vm.combatStatus.modDestreza).toBe(2);

      const htmlExplicit = renderToStaticMarkup(
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
      );

      expect(htmlExplicit).toContain('Modificador de Fuerza');
      expect(htmlExplicit).toContain('+3');
      expect(htmlExplicit).toContain('Modificador de Destreza');
      expect(htmlExplicit).toContain('+2');

      const htmlSpread = renderToStaticMarkup(<VigilanteSheetView {...(vm as any)} />);
      expect(htmlSpread).toContain('Modificador de Fuerza');
      expect(htmlSpread).toContain('+3');
      expect(htmlSpread).toContain('Modificador de Destreza');
      expect(htmlSpread).toContain('+2');
    });

    it('renders "0" (not hidden or missing) when modifiers are 0 in VigilanteSheetView', () => {
      const vm = buildCharacterSheetViewModel({
        character: fixtureZero,
      });

      expect(vm.combatStatus.modFuerza).toBe(0);
      expect(vm.combatStatus.modDestreza).toBe(0);

      const html = renderToStaticMarkup(
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
      );

      expect(html).toContain('Modificador de Fuerza');
      expect(html).toContain('Modificador de Destreza');
      expect(html).toMatch(/Modificador de Fuerza[\s\S]*?>\s*0\s*</);
      expect(html).toMatch(/Modificador de Destreza[\s\S]*?>\s*0\s*</);
    });

    it('5. Manual DOM inspection test for Villain and Vigilante outputs', () => {
      const vm = buildCharacterSheetViewModel({ character: fixturePositive });
      const villainHtml = renderToStaticMarkup(<VillainSheetView {...(vm as any)} />);
      const vigilanteHtml = renderToStaticMarkup(<VigilanteSheetView {...(vm as any)} />);

      // Extract the modifier blocks
      const extractModBlock = (html: string) => {
        const start = html.indexOf('Modificador de Fuerza');
        return html.substring(start > 200 ? start - 200 : 0, start + 1500);
      };

      const villainBlock = extractModBlock(villainHtml);
      const vigilanteBlock = extractModBlock(vigilanteHtml);

      console.log('--- VILLAIN DOM MODIFIERS BLOCK ---');
      console.log(villainBlock);
      console.log('--- VIGILANTE DOM MODIFIERS BLOCK ---');
      console.log(vigilanteBlock);

      expect(villainBlock).toContain('Modificador de Fuerza');
      expect(villainBlock).toContain('+3');
      expect(villainBlock).toContain('Modificador de Destreza');
      expect(villainBlock).toContain('+2');

      expect(vigilanteBlock).toContain('Modificador de Fuerza');
      expect(vigilanteBlock).toContain('+3');
      expect(vigilanteBlock).toContain('Modificador de Destreza');
      expect(vigilanteBlock).toContain('+2');
    });
  });
});
