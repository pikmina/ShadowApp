import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCharacterSheetViewModel } from '@/domain/characterSheetViewModel';
import { VigilanteSheetView } from '@/components/character/themes/VigilanteSheetView';
import { detectFactionTheme } from '@/components/character/themes/FactionSheetTheme';

describe('VigilanteSheetView - Noir Comic Graphic Novel Parity & Theme Audit', () => {
  const fullVigilanteFixture = {
    id: 99,
    name: 'Kurogane Jin',
    group: 'Vigilantes',
    yen: 32000,
    exp: 450,
    plus_ultra: 2,
    profileData: {
      basic_name: 'Kurogane',
      last_name: 'Jin',
      alias: 'Shadowstep',
      basic_age: 26,
      birth_date: '2174-06-12',
      basic_blood_type: 'O-',
      basic_alignment: 'Caótico Bueno',
      occupation: 'Investigador Clandestino',
      nationality: 'Japonesa',
      gender: 'Masculino',
      quote: 'En las sombras de la ciudad no hay leyes, solo decisiones.',
      FUE: 3,
      DES: 5,
      RES: 3,
      INT: 4,
      VOL: 4,
      VEL: 4,
      quirk_name: 'Paso Espectral',
      quirk_type: 'Emisión',
      quirk_level: 'Nivel 2. Dominio',
      quirk_description: 'Capacidad para desplazarse instantáneamente entre zonas en sombra.',
      quirk_lvl1: 'N1: Desplazamiento en línea recta hacia sombras visibles.',
      quirk_lvl2: 'N2: Camuflaje sombrío y desvanecimiento sensorial.',
      quirk_lvl3: 'N3: Fusión dimensional en oscuridad total.',
      traits: ['trait-sigiloso'],
      weaknesses: ['weak-luz'],
      skills: [
        { id: 'sk-infil', name: 'Infiltración', description: 'Acceso sigiloso a zonas restringidas', level: 3 },
        { id: 'sk-rastreo', name: 'Rastreo Urbano', description: 'Seguimiento de pistas callejeras', level: 2 },
      ],
      licenses: [
        { id: 'cred-permiso', name: 'Credencial de Radioaficionado', kind: 'Permiso Clandestino', description: 'Frecuencia encriptada' },
      ],
      biography: 'Ex-detective que opera en los distritos bajos sin reporte oficial.',
    },
    possessions: [
      {
        possession: { characterId: 99, elementId: 'item-gancho', quantity: 2, equipped: true },
        element: { id: 'item-gancho', name: 'Gancho Neumático', kind: 'equipment', category: 'Herramientas', description: 'Cable de tungsteno' },
      },
      {
        possession: { characterId: 99, elementId: 'trait-sigiloso', quantity: 1 },
        element: { id: 'trait-sigiloso', name: 'Paso Silencioso', kind: 'trait', description: 'No emite sonido al caminar' },
      },
      {
        possession: { characterId: 99, elementId: 'weak-luz', quantity: 1 },
        element: { id: 'weak-luz', name: 'Fotofobia', kind: 'weakness', description: 'Sensibilidad extrema a fogonazos' },
      },
    ],
    techniques: [
      {
        id: 'tech-emboscada',
        name: 'Golpe desde la Penumbra',
        cost: 4,
        classification: 'Ofensiva',
        staminaCost: 4,
        description: 'Ataque por sorpresa surgiendo de un punto ciego.',
        autoDescription: 'Daño 2D8 + Daño Físico.',
      },
    ],
    employments: [
      {
        id: 'emp-1',
        position: { name: 'Vigilante Callejero' },
        institution: { name: 'Red Subterránea' },
      },
    ],
  };

  const vigilanteCatalog = [
    { id: 'item-gancho', name: 'Gancho Neumático', kind: 'equipment', category: 'Herramientas', description: 'Cable de tungsteno' },
    { id: 'trait-sigiloso', name: 'Paso Silencioso', kind: 'trait', description: 'No emite sonido al caminar' },
    { id: 'weak-luz', name: 'Fotofobia', kind: 'weakness', description: 'Sensibilidad extrema a fogonazos' },
    { id: 'cred-permiso', name: 'Credencial de Radioaficionado', kind: 'Permiso Clandestino', description: 'Frecuencia encriptada' },
  ];

  it('1. Theme detection correctly identifies Vigilantes', () => {
    expect(detectFactionTheme('Vigilantes')).toBe('vigilante');
    expect(detectFactionTheme('Vigilante')).toBe('vigilante');
    expect(detectFactionTheme('Grupo de Vigilantes')).toBe('vigilante');
  });

  it('2. VigilanteSheetView renders full canonical data from CharacterSheetViewModel without data loss', () => {
    const vm = buildCharacterSheetViewModel({
      character: fullVigilanteFixture,
      elements: vigilanteCatalog,
      employmentsList: fullVigilanteFixture.employments,
    });

    const html = renderToStaticMarkup(
      <VigilanteSheetView
        fullName={vm.fullName}
        alias={vm.alias}
        avatar={vm.avatar}
        group={vm.group || 'Vigilantes'}
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
    expect(html).toContain('Kurogane Jin');
    expect(html).toContain('Shadowstep');
    expect(html).toContain('26 años');
    expect(html).toContain('2174-06-12');
    expect(html).toContain('O-');
    expect(html).toContain('Caótico Bueno');
    expect(html).toContain('Vigilante Callejero');
    expect(html).toContain('Japonesa');
    expect(html).toContain('En las sombras de la ciudad no hay leyes, solo decisiones.');

    // Quirk & Levels
    expect(html).toContain('Paso Espectral');
    expect(html).toContain('Tipo: Emisión');
    expect(html).toContain('Capacidad para desplazarse instantáneamente entre zonas en sombra.');
    expect(html).toContain('N1: Desplazamiento en línea recta hacia sombras visibles.');
    expect(html).toContain('N2: Camuflaje sombrío y desvanecimiento sensorial.');
    expect(html).toContain('N3: Fusión dimensional en oscuridad total.');

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
    expect(html).toContain('+1');
    expect(html).toContain('+2');

    // Skills
    expect(html).toContain('Infiltración');
    expect(html).toContain('Nivel 3');
    expect(html).toContain('Rastreo Urbano');
    expect(html).toContain('Nivel 2');

    // Traits & Weaknesses
    expect(html).toContain('Paso Silencioso');
    expect(html).toContain('Fotofobia');

    // Techniques
    expect(html).toContain('Golpe desde la Penumbra');
    expect(html).toContain('CE 4');
    expect(html).toContain('Daño 2D8 + Daño Físico.');

    // Inventory
    expect(html).toContain('Gancho Neumático');
    expect(html).toContain('Equipado');
    expect(html).toContain('x2');

    // Credentials & Clandestine Assets
    expect(html).toContain('Credencial de Radioaficionado');

    // Biography & Employments
    expect(html).toContain('Ex-detective que opera en los distritos bajos sin reporte oficial.');
    expect(html).toContain('Vigilante Callejero');
    expect(html).toContain('Red Subterránea');
  });

  it('3. VigilanteSheetView uses dynamic accent color and preserves Noir styling without hardcoded faction color', () => {
    const vm = buildCharacterSheetViewModel({
      character: fullVigilanteFixture,
    });

    const customColor = '#7c3aed';
    const html = renderToStaticMarkup(
      <VigilanteSheetView
        fullName={vm.fullName}
        groupColor={customColor}
        baseAttributes={vm.baseAttributes}
      />
    );

    expect(html).toMatch(/--vigilante-accent:\s*#7c3aed/);
    expect(html).toContain('NOIR ARCHIVE // VIGILANTE DOSSIER');
  });

  it('4. Handles empty / minimal vigilante characters gracefully', () => {
    const minimalFixture = {
      id: 101,
      name: 'Anónimo',
      group: 'Vigilantes',
      profileData: {},
    };

    const vm = buildCharacterSheetViewModel({
      character: minimalFixture,
    });

    const html = renderToStaticMarkup(
      <VigilanteSheetView
        fullName={vm.fullName}
        baseAttributes={vm.baseAttributes}
      />
    );

    expect(html).toContain('Anónimo');
    expect(html).toContain('Sin habilidades registradas.');
    expect(html).toContain('Sin rasgos especiales registrados.');
    expect(html).toContain('Sin debilidades registradas.');
    expect(html).toContain('Sin técnicas de combate registradas.');
    expect(html).toContain('Sin objetos en inventario.');
  });
});
