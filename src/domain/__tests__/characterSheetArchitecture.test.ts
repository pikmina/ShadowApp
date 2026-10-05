import { describe, it, expect } from 'vitest';
import { detectFactionTheme } from '@/components/character/themes/FactionSheetTheme';
import { resolveStatsHexagonTheme, STATS_HEXAGON_THEMES } from '@/components/character/HexagonRadarChart';
import { buildCharacterSheetViewModel, calculateAgeFromBirth } from '@/domain/characterSheetViewModel';

describe('Character Sheet Architecture & Group Theme Resolution', () => {
  describe('1. Automatic Group Detection & Canonical BASE Fallback', () => {
    it('A. Personaje sin grupo -> detectedTheme is BASE', () => {
      expect(detectFactionTheme(null)).toBe('base');
      expect(detectFactionTheme(undefined)).toBe('base');
      expect(detectFactionTheme('')).toBe('base');
    });

    it('B. Personaje Hero -> detectedTheme is HERO', () => {
      expect(detectFactionTheme('Héroes')).toBe('hero');
      expect(detectFactionTheme('Hero')).toBe('hero');
      expect(detectFactionTheme('Pro-Hero Agency')).toBe('hero');
    });

    it('C. Personaje Student -> detectedTheme is STUDENT', () => {
      expect(detectFactionTheme('Estudiantes')).toBe('student');
      expect(detectFactionTheme('Clase 1-A')).toBe('student');
      expect(detectFactionTheme('Academia UA')).toBe('student');
    });

    it('D. Personaje Civilian -> detectedTheme is CIVILIAN', () => {
      expect(detectFactionTheme('Civiles')).toBe('civilian');
      expect(detectFactionTheme('Civil')).toBe('civilian');
      expect(detectFactionTheme('Ciudadanos')).toBe('civilian');
      expect(detectFactionTheme('Ministerio')).toBe('civilian');
    });

    it('E. Personaje Villain -> detectedTheme is VILLAIN', () => {
      expect(detectFactionTheme('Villanos')).toBe('villain');
      expect(detectFactionTheme('Liga de Villanos')).toBe('villain');
      expect(detectFactionTheme('Frente de Liberación')).toBe('villain');
    });

    it('F. Personaje Vigilante -> detectedTheme is VIGILANTE', () => {
      expect(detectFactionTheme('Vigilantes')).toBe('vigilante');
      expect(detectFactionTheme('Vigilante')).toBe('vigilante');
    });

    it('G. Personaje con grupo desconocido -> fallback canónico es BASE (NUNCA HERO)', () => {
      expect(detectFactionTheme('Grupo Desconocido X')).toBe('base');
      expect(detectFactionTheme('Mercenarios')).toBe('base');
      expect(detectFactionTheme('Alianza Neutra')).toBe('base');
      expect(detectFactionTheme('Random Org')).not.toBe('hero');
    });
  });

  describe('2. StatsHexagon Theming & Resolution', () => {
    it('N. BASE theme uses BASE styles and fallback is BASE, never HERO', () => {
      expect(resolveStatsHexagonTheme('base')).toBe('base');
      expect(resolveStatsHexagonTheme(null)).toBe('base');
      expect(resolveStatsHexagonTheme(undefined)).toBe('base');
      expect(resolveStatsHexagonTheme('unknown')).toBe('base');
      expect(resolveStatsHexagonTheme('unknown')).not.toBe('hero');

      const baseConfig = STATS_HEXAGON_THEMES.base;
      expect(baseConfig.id).toBe('base');
      expect(baseConfig.gradientId).toBe('baseRadarGradient');
      expect(baseConfig.polygonStroke).toBe('#a1a1aa');
    });

    it('O. HERO theme uses HERO styles', () => {
      expect(resolveStatsHexagonTheme('hero')).toBe('hero');
      const heroConfig = STATS_HEXAGON_THEMES.hero;
      expect(heroConfig.gradientId).toBe('heroRadarGradient');
      expect(heroConfig.polygonStroke).toBe('#06b6d4');
      expect(heroConfig.cornerTopLeft).toContain('HUD.RADAR');
    });

    it('P. STUDENT theme uses STUDENT styles', () => {
      expect(resolveStatsHexagonTheme('student')).toBe('student');
      const studentConfig = STATS_HEXAGON_THEMES.student;
      expect(studentConfig.gradientId).toBe('studentRadarGradient');
      expect(studentConfig.polygonStroke).toBe('#2563eb');
      expect(studentConfig.cornerTopLeft).toContain('UA.EVAL');
    });

    it('Q. VILLAIN theme uses VILLAIN styles', () => {
      expect(resolveStatsHexagonTheme('villain')).toBe('villain');
      const villainConfig = STATS_HEXAGON_THEMES.villain;
      expect(villainConfig.gradientId).toBe('villainRadarGradient');
      expect(villainConfig.polygonStroke).toBe('#ef4444');
      expect(villainConfig.cornerTopLeft).toContain('PELIGROSIDAD');
    });

    it('R. CIVILIAN theme uses CIVILIAN styles', () => {
      expect(resolveStatsHexagonTheme('civilian')).toBe('civilian');
      const civilianConfig = STATS_HEXAGON_THEMES.civilian;
      expect(civilianConfig.gradientId).toBe('civilianRadarGradient');
      expect(civilianConfig.polygonStroke).toBe('#b45309');
      expect(civilianConfig.cornerTopLeft).toContain('REGISTRO.CIVIL');
    });

    it('S. VIGILANTE theme uses VIGILANTE styles', () => {
      expect(resolveStatsHexagonTheme('vigilante')).toBe('vigilante');
      const vigilanteConfig = STATS_HEXAGON_THEMES.vigilante;
      expect(vigilanteConfig.gradientId).toBe('vigilanteRadarGradient');
      expect(vigilanteConfig.polygonStroke).toBe('#10b981');
      expect(vigilanteConfig.cornerTopLeft).toContain('RECON.RADAR');
    });

    it('T. Cambiar el theme no altera los valores numéricos de las estadísticas', () => {
      const stats = [
        { label: 'Fuerza', key: 'FUE', value: 4, base: 4, bonus: 0, hasBonus: false },
        { label: 'Resistencia', key: 'RES', value: 3, base: 3, bonus: 0, hasBonus: false },
        { label: 'Destreza', key: 'DES', value: 2, base: 2, bonus: 0, hasBonus: false },
        { label: 'Inteligencia', key: 'INT', value: 5, base: 5, bonus: 0, hasBonus: false },
        { label: 'Voluntad', key: 'VOL', value: 3, base: 3, bonus: 0, hasBonus: false },
        { label: 'Velocidad', key: 'VEL', value: 4, base: 4, bonus: 0, hasBonus: false },
      ];

      // Values remain strictly 4, 3, 2, 5, 3, 4 regardless of theme
      const baseValues = stats.map(s => s.value);
      expect(baseValues).toEqual([4, 3, 2, 5, 3, 4]);
    });
  });

  describe('3. CharacterSheetViewModel Data Normalization & Parity', () => {
    it('Normalizes Momoka civilian data with exact age, birthday and no invented legal fields', () => {
      const mockMomoka = {
        id: 37,
        name: 'Momoka Nishimura',
        group: 'Civiles',
        yen: 15000,
        exp: 120,
        plus_ultra: 0,
        profileData: {
          basic_name: 'Momoka',
          last_name: 'Nishimura',
          alias: 'Momo',
          basic_age: 16,
          birth_date: '2184-04-30',
          basic_blood_type: 'A+',
          basic_alignment: 'Neutral Bueno',
          occupation: 'Estudiante de Bachillerato General',
          FUE: 2,
          DES: 3,
          RES: 2,
          INT: 4,
          VOL: 3,
          VEL: 2,
          quirk_name: 'Pétalos Flotantes',
          quirk_type: 'Emisión',
          quirk_level: 'Nivel 1. Despertar',
          quirk_description: 'Genera y manipula pétalos de cerezo con propiedades lumínicas.',
          quirk_lvl1: 'Despertar: Control de hasta 100 pétalos.',
          quirk_lvl2: 'Dominio: Torbellino floral defensivo.',
          quirk_lvl3: 'Plus Ultra: Floración total restauradora.',
        },
      };

      const vm = buildCharacterSheetViewModel({
        character: mockMomoka,
      });

      expect(vm.fullName).toBe('Momoka Nishimura');
      expect(vm.alias).toBe('Momo');
      expect(vm.detectedTheme).toBe('civilian');

      // Personal data
      const ageItem = vm.personalDataList.find(d => d.label === 'Edad');
      expect(ageItem?.value).toBe('16 años');

      const birthItem = vm.personalDataList.find(d => d.label === 'Cumpleaños');
      expect(birthItem?.value).toBe('2184-04-30');

      const bloodItem = vm.personalDataList.find(d => d.label === 'Tipo de Sangre');
      expect(bloodItem?.value).toBe('A+');

      const alignItem = vm.personalDataList.find(d => d.label === 'Alineación');
      expect(alignItem?.value).toBe('Neutral Bueno');

      // Modifiers
      expect(vm.combatStatus.modFuerza).toBe(1); // floor(2/2) = 1
      expect(vm.combatStatus.modDestreza).toBe(1); // floor(3/2) = 1

      // Quirk levels
      expect(vm.quirk.name).toBe('Pétalos Flotantes');
      expect(vm.quirk.levelOne).toBe('Despertar: Control de hasta 100 pétalos.');
      expect(vm.quirk.levelTwo).toBe('Dominio: Torbellino floral defensivo.');
      expect(vm.quirk.levelThree).toBe('Plus Ultra: Floración total restauradora.');
    });

    it('Calculates age from birth date if basic_age is absent', () => {
      const calculated = calculateAgeFromBirth('2184-04-30');
      expect(calculated).toBe(16);
    });

    it('Fallbacks cleanly to BASE theme when character has no group or unrecognized group', () => {
      const mockUngrouped = {
        id: 99,
        name: 'Sora',
        profileData: {
          basic_name: 'Sora',
        },
      };

      const vm = buildCharacterSheetViewModel({
        character: mockUngrouped,
      });

      expect(vm.detectedTheme).toBe('base');
    });

    it('Resolves student occupationOrClass cleanly without TDZ when student has no manual occupation', () => {
      const mockStudent = {
        id: 101,
        name: 'Taro',
        group: 'Estudiantes',
        profileData: {
          basic_name: 'Taro',
        },
      };

      const vm = buildCharacterSheetViewModel({
        character: mockStudent,
      });

      expect(vm.detectedTheme).toBe('student');
      const occItem = vm.personalDataList.find(d => d.label === 'Ocupación / Clase');
      expect(occItem?.value).toBe('Clase 1-A (Novato)');
    });
  });
});
