import { describe, it, expect } from 'vitest';
import { deriveTechniqueLevelFromCost } from '../characterTechnique';
import {
  deriveSupportDefenseRD,
  calculateTechniqueStructuralCost,
  type SystemMechanicsConfig,
} from '../systemMechanics';
import {
  MECHANICAL_LABELS,
  getMechanicalLabel,
  getSourceTypeLabel,
  getAttributeLabel,
  getResourceLabel,
  getAlteredStatusLabel,
} from '../mechanicalLabels';

describe('Technique Creation & Form Audit Suite', () => {
  it('derives technique level dynamically from structural stamina cost', () => {
    // 1–5: Despertar (Lvl 1)
    expect(deriveTechniqueLevelFromCost(0)).toEqual({
      level: 1,
      label: 'Nivel 1 · Despertar',
      tierName: 'Despertar',
    });
    expect(deriveTechniqueLevelFromCost(3)).toEqual({
      level: 1,
      label: 'Nivel 1 · Despertar',
      tierName: 'Despertar',
    });
    expect(deriveTechniqueLevelFromCost(5)).toEqual({
      level: 1,
      label: 'Nivel 1 · Despertar',
      tierName: 'Despertar',
    });

    // 6–10: Dominio (Lvl 2)
    expect(deriveTechniqueLevelFromCost(6)).toEqual({
      level: 2,
      label: 'Nivel 2 · Dominio',
      tierName: 'Dominio',
    });
    expect(deriveTechniqueLevelFromCost(10)).toEqual({
      level: 2,
      label: 'Nivel 2 · Dominio',
      tierName: 'Dominio',
    });

    // 11+: Trascendencia (Lvl 3)
    expect(deriveTechniqueLevelFromCost(11)).toEqual({
      level: 3,
      label: 'Nivel 3 · Trascendencia',
      tierName: 'Trascendencia',
    });
    expect(deriveTechniqueLevelFromCost(20)).toEqual({
      level: 3,
      label: 'Nivel 3 · Trascendencia',
      tierName: 'Trascendencia',
    });
  });

  it('provides valid localized Spanish labels for rollType in roll_modifier', () => {
    const validRollTypes = ['action', 'attack', 'defense', 'saving', 'skill', 'all'] as const;

    for (const rollType of validRollTypes) {
      const label = getMechanicalLabel('rollTypes', rollType);
      expect(label).not.toBe(rollType);
      expect(label.length).toBeGreaterThan(0);
    }

    expect(getMechanicalLabel('rollTypes', 'action')).toBe('Acción general');
    expect(getMechanicalLabel('rollTypes', 'attack')).toBe('Tirada de ataque');
    expect(getMechanicalLabel('rollTypes', 'defense')).toBe('Tirada de defensa');
    expect(getMechanicalLabel('rollTypes', 'saving')).toBe('Tirada de salvación');
    expect(getMechanicalLabel('rollTypes', 'skill')).toBe('Prueba de habilidad');
    expect(getMechanicalLabel('rollTypes', 'all')).toBe('cualquier acción');
  });

  it('propagates Admin RD configuration from system rules to technique RD derivation', () => {
    // Custom Admin Config 1
    const customAdminTiers1 = [
      { maxCost: 3, rd: 12 },
      { maxCost: 6, rd: 15 },
      { maxCost: 10, rd: 18 },
      { maxCost: 999, rd: 22 },
    ];

    // Custom Admin Config 2
    const customAdminTiers2 = [
      { maxCost: 3, rd: 10 },
      { maxCost: 6, rd: 14 },
      { maxCost: 10, rd: 20 },
      { maxCost: 999, rd: 25 },
    ];

    // Structural cost = 3 (Tier 1)
    expect(deriveSupportDefenseRD(3, customAdminTiers1)).toBe(12);
    expect(deriveSupportDefenseRD(3, customAdminTiers2)).toBe(10);

    // Structural cost = 6 (Tier 2)
    expect(deriveSupportDefenseRD(6, customAdminTiers1)).toBe(15);
    expect(deriveSupportDefenseRD(6, customAdminTiers2)).toBe(14);

    // Structural cost = 10 (Tier 3)
    expect(deriveSupportDefenseRD(10, customAdminTiers1)).toBe(18);
    expect(deriveSupportDefenseRD(10, customAdminTiers2)).toBe(20);
  });

  it('ensures no technical English IDs leak into visible labels', () => {
    expect(getSourceTypeLabel('quirk')).toBe('Don');
    expect(getSourceTypeLabel('physical')).toBe('Física');
    expect(getSourceTypeLabel('weapon')).toBe('Arma');

    expect(getMechanicalLabel('targets', 'self')).toBe('Uno mismo');
    expect(getMechanicalLabel('targets', 'enemy')).toBe('Enemigo');
    expect(getMechanicalLabel('targets', 'ally')).toBe('Aliado');

    expect(getMechanicalLabel('durations', 'instant')).toBe('Instantánea');
    expect(getMechanicalLabel('durations', 'turns')).toBe('Turnos');
    expect(getMechanicalLabel('durations', 'permanent')).toBe('Permanente');

    expect(getAttributeLabel('FUE')).toBe('Fuerza (FUE)');
    expect(getAttributeLabel('DES')).toBe('Destreza (DES)');

    expect(getResourceLabel('SA')).toBe('Salud (SA)');
    expect(getResourceLabel('ES')).toBe('Estamina (ES)');
  });

  it('supports canonical damage types in Spanish registry', () => {
    const damageTypes = [
      'fisico',
      'cinetico',
      'fuego',
      'hielo',
      'electrico',
      'acido',
      'psiquico',
      'sonoro',
      'cortante',
      'perforante',
      'contundente',
    ] as const;

    for (const dt of damageTypes) {
      const label = getMechanicalLabel('damageTypes', dt);
      expect(label).not.toBe(dt);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
