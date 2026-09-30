import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildCharacterSheetViewModel } from '@/domain/characterSheetViewModel';
import { VillainSheetView } from '@/components/character/themes/VillainSheetView';

describe('VillainSheetView Dynamic Data & Visual Architecture Audit', () => {
  // Personaje A: Villano completo (Dabi / Toya)
  const villainA = {
    id: 101,
    name: 'Toya Todoroki',
    group: 'Liga de Villanos',
    yen: 15000,
    exp: 950,
    plus_ultra: 2,
    profileData: {
      basic_name: 'Toya',
      last_name: 'Todoroki',
      alias: 'Dabi',
      nickname: 'Llama Azul',
      avatarUrl: 'https://images.unsplash.com/photo-villain-a.jpg',
      basic_age: 24,
      birth_date: '18 de enero',
      gender: 'Masculino',
      blood_type: 'O',
      alignment: 'Caótico Malvado',
      occupation: 'Lugarteniente',
      quote: 'El pasado nunca muere.',
      status: 'En Búsqueda y Captura',
      basic_stage: 'Rango S',
      quirk_name: 'Llamas Azules Crematorias',
      quirk_type: 'Emisión',
      quirk_evolution: 'Nivel 2. Dominio Piromántico',
      quirk_description: 'Genera fuego azul de temperatura extrema capaz de reducir todo a cenizas.',
      quirk_lvl1: 'Ignición básica de fuego azul.',
      quirk_lvl2: 'Control de ráfagas expansivas a alta temperatura.',
      quirk_lvl3: 'Infierno azul desatado de máxima potencia destructiva.',
      FUE: 4,
      RES: 6,
      DES: 7,
      INT: 8,
      VEL: 9,
      VOL: 10,
      traits: ['Cuerpo Quemado', 'Resistencia al Dolor'],
      weaknesses: ['Sobrecalentamiento Corporal'],
      skills: [
        { id: 'sk-pyro', name: 'Control Piromántico', level: 5, description: 'Maestría con fuego' },
        { id: 'sk-intim', name: 'Intimidación', level: 4, description: 'Presencia aterradora' },
      ],
      biography: 'Ex-heredero renegado de la familia Todoroki que lidera el frente de choque.',
    },
    possessions: [
      {
        elementId: 'coat-01',
        quantity: 1,
        equipped: true,
        element: {
          id: 'coat-01',
          name: 'Abrigo de Cuero Negro',
          category: 'Indumentaria (B)',
          kind: 'item',
          description: 'Abrigo reforzado con costuras metálicas.',
        },
      },
      {
        elementId: 'cred-01',
        quantity: 1,
        element: {
          id: 'cred-01',
          name: 'Orden de Captura Internacional #S-99',
          kind: 'license',
          description: 'Registro de máxima alerta emitido por la Comisión.',
        },
      },
    ],
    techniques: [
      {
        id: 'tech-01',
        name: 'Llamarada Azul Expansiva',
        classification: 'Ofensiva',
        staminaCost: 8,
        description: 'Libera una onda de choque ígnea que calcina el área.',
        autoDescription: 'Daño 4D6 + Mod DES fuego directo.',
      },
    ],
  };

  // Personaje B: Villano secundario con datos mínimos y categorías vacías
  const villainB = {
    id: 102,
    name: 'Kurose',
    group: 'Villanos',
    yen: 0,
    exp: 50,
    plus_ultra: 0,
    profileData: {
      basic_name: 'Kurose',
      last_name: '',
      alias: '', // Sin alias
      basic_age: undefined, // Sin edad
      birth_date: undefined, // Sin cumpleaños
      gender: undefined, // Sin género
      blood_type: undefined, // Sin tipo sangre
      alignment: undefined, // Sin alineación
      occupation: undefined, // Sin ocupación
      quote: undefined, // Sin frase
      status: 'Activo',
      basic_stage: 'Novato',
      quirk_name: 'Garras de Sombra',
      quirk_type: 'Mutación',
      quirk_description: 'Extiende sus dedos como hojas oscuras.',
      quirk_lvl1: 'Filos cortantes básicos.',
      quirk_lvl2: null,
      quirk_lvl3: null,
      FUE: 3,
      RES: 3,
      DES: 4,
      INT: 2,
      VEL: 4,
      VOL: 2,
      traits: [],
      weaknesses: [],
      skills: [],
      biography: '',
    },
    possessions: [],
    techniques: [],
  };

  it('1. Personaje A (Villano Completo) renders strictly its own data without any mockup leaks', () => {
    const vm = buildCharacterSheetViewModel({
      character: villainA,
      derived: {
        salud: 30,
        estamina: 35,
        evasion: 14,
        coraje: 15,
        dañoFisico: '2D6',
        dañoRango: '3D6+4',
        reduccionDano: '2',
        iniciativa: '+5',
        derivedSources: { evasion: [], coraje: [], reduccionDano: [], iniciativa: [] },
      },
    });

    const html = renderToStaticMarkup(<VillainSheetView {...vm} />);

    // Character identity
    expect(html).toContain('Toya Todoroki');
    expect(html).toContain('Dabi');
    expect(html).toContain('24 años');
    expect(html).toContain('18 de enero');
    expect(html).toContain('Masculino');
    expect(html).toContain('Caótico Malvado');
    expect(html).toContain('Lugarteniente');
    expect(html).toContain('El pasado nunca muere.');

    // Quirk & levels
    expect(html).toContain('Llamas Azules Crematorias');
    expect(html).toContain('Ignición básica de fuego azul.');
    expect(html).toContain('Control de ráfagas expansivas a alta temperatura.');
    expect(html).toContain('Infierno azul desatado de máxima potencia destructiva.');

    // Skills
    expect(html).toContain('Control Piromántico');
    expect(html).toContain('5');
    expect(html).toContain('Intimidación');
    expect(html).toContain('4');

    // Traits & Weaknesses
    expect(html).toContain('Cuerpo Quemado');
    expect(html).toContain('Sobrecalentamiento Corporal');

    // Techniques & Inventory
    expect(html).toContain('Llamarada Azul Expansiva');
    expect(html).toContain('Abrigo de Cuero Negro');
    expect(html).toContain('Orden de Captura Internacional #S-99');

    // Combat stats
    expect(html).toContain('30'); // Salud
    expect(html).toContain('35'); // Estamina
    expect(html).toContain('2D6'); // Daño Físico

    // PROHIBITED MOCKUP STRINGS MUST NEVER APPEAR
    expect(html).not.toContain('Himiko');
    expect(html).not.toContain('Toga');
    expect(html).not.toContain('Quiero ser como tú');
    expect(html).not.toContain('Transformación');
    expect(html).not.toContain('Corte Frenético');
    expect(html).not.toContain('17 años');
    expect(html).not.toContain('7 de agosto');
    expect(html).not.toContain('トガ ヒミコ');
  });

  it('2. Personaje B (Villano con campos vacíos) renders gracefully without mockup fallbacks', () => {
    const vm = buildCharacterSheetViewModel({
      character: villainB,
      derived: {
        salud: 20,
        estamina: 20,
        evasion: 10,
        coraje: 10,
        dañoFisico: '1D4',
        dañoRango: '1D4',
        reduccionDano: '0',
        iniciativa: '0',
        derivedSources: { evasion: [], coraje: [], reduccionDano: [], iniciativa: [] },
      },
    });

    const html = renderToStaticMarkup(<VillainSheetView {...vm} />);

    // Character identity
    expect(html).toContain('Kurose');
    expect(html).toContain('No especificada'); // For missing age/alignment
    expect(html).toContain('No especificado'); // For missing birthday/blood type

    // Quirk
    expect(html).toContain('Garras de Sombra');
    expect(html).toContain('Filos cortantes básicos.');
    expect(html).toContain('En desarrollo / No alcanzado');
    expect(html).toContain('Sin despertar / No alcanzado');

    // Empty list graceful states
    expect(html).toContain('Sin habilidades registradas.');
    expect(html).toContain('Sin rasgos especiales registrados.');
    expect(html).toContain('Sin debilidades registradas.');
    expect(html).toContain('Sin técnicas de combate registradas.');
    expect(html).toContain('Sin objetos en inventario.');
    expect(html).toContain('Sin licencias, certificaciones ni activos clandestinos registrados.');

    // PROHIBITED MOCKUP STRINGS MUST NEVER APPEAR
    expect(html).not.toContain('Himiko');
    expect(html).not.toContain('Toga');
    expect(html).not.toContain('Quiero ser como tú');
    expect(html).not.toContain('17 años');
    expect(html).not.toContain('7 de agosto');
    expect(html).not.toContain('Transformación');
    expect(html).not.toContain('トガ ヒミコ');
  });
});
