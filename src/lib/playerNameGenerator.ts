/**
 * Player Name / Pseudonym Generator
 * Themed around Comics, Heroism, and Cute Animals.
 * Perfect for players who want a fun, distinctive, and anonymous identity in the community.
 */

export const COMIC_PREFIXES = [
  'Capitán', 'Super', 'Spider', 'Bat', 'Doctor', 'Lord', 'Mighty', 'Iron',
  'Comandante', 'Caballero', 'Agente', 'Guardián', 'Profesor', 'Astro', 'Cyber',
  'Mini', 'Centinela', 'Relámpago', 'Cósmico', 'Vengador', 'Centella', 'Sombra',
  'Titán', 'Phantom', 'Nova', 'Star', 'Flash', 'Vigilante', 'Omega', 'Alpha',
  'Turbo', 'Laser', 'Quantum', 'Neon', 'Pixel', 'Nexus', 'Dinámico'
];

export const CUTE_ANIMALS = [
  'Nutria', 'Gatito', 'Mapache', 'Ajolote', 'Panda', 'Hurón', 'Conejito',
  'Koala', 'Pinguinito', 'Capibara', 'Zorrito', 'Erizo', 'Lemur', 'Tejón',
  'Patito', 'Cuyo', 'Ardillita', 'Perezoso', 'Búho', 'Foquita', 'Hamster',
  'Colibrí', 'Ratoncito', 'Ajolotito', 'Michi', 'Perrito', 'Panda Rojo',
  'Chinchilla', 'Wombat', 'Alpaca', 'Koalita', 'Cobaya', 'Erizito', 'Mapachito',
  'Gatete', 'Nutrita', 'Patricio', 'Zorrillo', 'Zorrita', 'Capibarita'
];

export const HEROIC_SUFFIXES = [
  'Justiciero', 'de la Noche', 'Heroico', 'Atómico', 'Galáctico', 'Invisible',
  'Supremo', 'Vengativo', 'del Trueno', 'Estelar', 'del Alba', 'Invencible',
  'Radiactivo', 'Luminoso', 'Defensor', 'de Acero', 'Centella', 'Veloz',
  'Cáustico', 'Cósmico', 'del Infinito', 'Protector', 'de las Sombras',
  'Espacial', 'Renegado', 'Guardián', 'Imparable', 'Valiente', 'Magnífico',
  'del Cosmos', 'Fantasma', 'Sónico', 'de Luz', 'del Destino', 'Invicto',
  'Tenaz', 'Legendario', 'Misterioso', 'Abrasivo', 'del Futuro', 'Vengador'
];

export const CURATED_HEROIC_ALIASES = [
  'Ajolote Sónico',
  'Nutria Vengadora',
  'Capibara Supremo',
  'Gatito Cósmico',
  'Mapache del Trueno',
  'Bat-Hurón',
  'Super-Conejito',
  'Spider-Panda',
  'Cuyo de Acero',
  'Zorrito Radiactivo',
  'Panda Centinela',
  'Pinguino Nuclear',
  'Erizo Veloz',
  'Patito del Infinito',
  'Foca Justiciera',
  'Comandante Koala',
  'Agente Ajolote',
  'Capitán Capibara',
  'Doctor Mapache',
  'Lord Michi',
  'Ardilla Vigilante',
  'Perezoso Imparable',
  'Búho Protector',
  'Hamster Galáctico',
  'Chinchilla Cósmica',
  'Alpaca Heroica',
  'Tejón Atómico',
  'Michi Radiante',
  'Hurón Sombra',
  'Nutria del Alba',
  'Zorrillo Cuántico',
  'Cyber-Patito',
  'Astro-Capibara',
  'Gatito de Acero',
  'Conejito Relámpago',
  'Panda Rojo Cósmico',
  'Wombat Legendario',
  'Bat-Gatito',
  'Spider-Nutria',
  'Iron-Ajolote'
];

export type NameGeneratorCategory = 'all' | 'comic' | 'heroic' | 'cute_animals';

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a single creative player name.
 */
export function generatePlayerName(category: NameGeneratorCategory = 'all'): string {
  // 30% chance of returning a curated favorite in 'all' mode
  if (category === 'all' && Math.random() < 0.35) {
    return getRandomItem(CURATED_HEROIC_ALIASES);
  }

  const prefix = getRandomItem(COMIC_PREFIXES);
  const animal = getRandomItem(CUTE_ANIMALS);
  const suffix = getRandomItem(HEROIC_SUFFIXES);

  if (category === 'comic') {
    const isHyphen = Math.random() > 0.5;
    return isHyphen ? `${prefix}-${animal}` : `${prefix} ${animal}`;
  }

  if (category === 'heroic') {
    return `${animal} ${suffix}`;
  }

  if (category === 'cute_animals') {
    const cutePrefixes = ['Mini', 'Pequeño', 'Bebé', 'Gran', 'Super', 'Astro', 'Dulce', 'Lord'];
    const p = getRandomItem(cutePrefixes);
    return `${p} ${animal}`;
  }

  // All / Hybrid mode: choose between distinct patterns
  const pattern = Math.floor(Math.random() * 4);
  switch (pattern) {
    case 0: // Spider-Nutria / Bat-Ajolote
      return `${prefix}-${animal}`;
    case 1: // Capitán Capibara / Doctor Michi
      return `${prefix} ${animal}`;
    case 2: // Ajolote Sónico / Mapache del Trueno
      return `${animal} ${suffix}`;
    case 3: // Super Gatito Cósmico / Cyber Panda de Acero
    default:
      return `${prefix} ${animal} ${suffix}`;
  }
}

/**
 * Generate a distinct list of suggested player names.
 */
export function generatePlayerNameList(count: number = 6, category: NameGeneratorCategory = 'all'): string[] {
  const names = new Set<string>();
  let attempts = 0;
  while (names.size < count && attempts < 50) {
    names.add(generatePlayerName(category));
    attempts++;
  }
  return Array.from(names);
}
