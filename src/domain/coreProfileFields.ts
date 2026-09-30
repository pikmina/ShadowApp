export const coreProfileFields = [
  { key: 'basic_name', name: 'Nombre', type: 'text', aliases: ['nombre', 'nombre del personaje', 'basic_name'] },
  { key: 'last_name', name: 'Apellido', type: 'text', aliases: ['apellido', 'apellidos', 'last_name'] },
  { key: 'birth_date', name: 'Fecha de Nacimiento', type: 'date', aliases: ['nacimiento', 'fecha de nacimiento', 'fecha nacimiento', 'birth date', 'birth_date'] },
  {
    key: 'basic_blood_type',
    name: 'Grupo Sanguíneo',
    type: 'select',
    options: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
    aliases: ['tipo de sangre', 'grupo sanguíneo', 'grupo sanguineo', 'basic_blood_type']
  }, {
    key: 'basic_alignment',
    name: 'Alineación',
    type: 'select',
    options: ['Heróica', 'Legal', 'Neutral', 'Caótica', 'Villanezca'],
    aliases: ['alineación', 'alineacion', 'alineamiento', 'basic_alignment']
  },
  { key: 'nationality', name: 'Nacionalidad', type: 'text', aliases: ['nacionalidad', 'nationality'] },
  { key: 'faceclaim', name: 'Faceclaim', type: 'text', aliases: ['faceclaim', 'faceclaim_pb', 'pb'] },
  {
    key: 'quirk_type',
    name: 'Tipo de Quirk',
    type: 'select',
    category: 'Quirk',
    options: ['Emisor', 'Mutante', 'Transformador', 'Sin quirk'],
    aliases: ['tipo de quirk', 'tipo de don', 'quirk_type']
  },
  { key: 'quirk_name', name: 'Quirk', type: 'quirk', category: 'Quirk', aliases: ['quirk', 'nombre del quirk', 'nombre del don', 'quirk_name'] },
  { key: 'quirk_level', name: 'Nivel de Quirk', type: 'select', category: 'Quirk', options: ['Nivel 1. Despertar', 'Nivel 2. Dominio', 'Nivel 3. Trascendencia'], order: 15, aliases: ['nivel de quirk', 'nivel del quirk', 'nivel de don', 'nivel del don', 'quirk_level', 'nivel_de_quirk', 'nivel_quirk', 'quirk_evolution', 'quirkEvolution'] },
  { key: 'quirk_levels', name: 'Niveles de Quirk', type: 'quirk', category: 'Quirk', aliases: ['niveles de quirk', 'quirk_levels', 'niveles'] },
  { key: 'alias', name: 'Apodo', type: 'text', aliases: ['apodo', 'alias'] },
  { key: 'avatar_url', name: 'Enlace al avatar', type: 'image', aliases: ['avatar', 'enlace al avatar', 'url de avatar', 'url de imagen', 'avatar_url'] },
] as const;

export type CoreProfileKey = typeof coreProfileFields[number]['key'];
export const coreProfileKeys = new Set<string>(coreProfileFields.map(field => field.key));

export function normalizedFieldName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function profileValue(profile: Record<string, unknown>, key: CoreProfileKey): unknown {
  const candidates: Record<CoreProfileKey, string[]> = {
    basic_name: ['basic_name', 'name', 'nombre'], last_name: ['last_name', 'lastName', 'apellido'],
    birth_date: ['birth_date', 'basic_birth_date', 'fecha_nacimiento', 'date_of_birth'],
    basic_blood_type: ['basic_blood_type', 'bloodType', 'blood_type', 'grupo_sanguineo'],
    basic_alignment: ['basic_alignment', 'alignment', 'alineacion', 'alineamiento'],
    nationality: ['nationality', 'nacionalidad'], faceclaim: ['faceclaim', 'faceclaim_pb', 'pb'],
    quirk_type: ['quirk_type', 'quirkType', 'tipo_quirk', 'tipo_don'],
    quirk_name: ['quirk_name', 'quirkName', 'don_name', 'don'],
    quirk_level: ['quirk_level', 'quirk_evolution', 'quirkEvolution', 'nivel_de_quirk', 'nivel_quirk'],
    quirk_levels: ['quirk_levels', 'niveles_de_quirk'],
    alias: ['alias', 'nickname', 'apodo', 'hero_name'], avatar_url: ['avatar_url', 'avatarUrl', 'avatar', 'image', 'imagen'],
  };

  if (!candidates[key]) return profile[key];
  for (const candidate of candidates[key]) if (profile[candidate] !== undefined && profile[candidate] !== null) return profile[candidate];
  return undefined;
}

export interface CharacterNameSource {
  id?: number | string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileData?: Record<string, unknown> | null;
}

/**
 * Canonical display-name resolver for characters.
 * Guarantees that internal IDs are never leaked to the user.
 * Precedence:
 * 1. Combines basic_name/firstName and last_name/lastName if both exist
 * 2. basic_name / firstName
 * 3. last_name / lastName
 * 4. top-level name / profileData.name
 * 5. Fallback: "Personaje sin nombre" (NEVER returns an internal numeric/UUID ID)
 */
export function resolveCharacterDisplayName(
  char?: CharacterNameSource | null,
  fallback: string = 'Personaje sin nombre'
): string {
  if (!char) return fallback;

  const profile = (char.profileData || {}) as Record<string, unknown>;
  const firstRaw = profileValue(profile, 'basic_name') ?? char.firstName;
  const first = typeof firstRaw === 'string' ? firstRaw.trim() : '';

  const lastRaw = profileValue(profile, 'last_name') ?? char.lastName;
  const last = typeof lastRaw === 'string' ? lastRaw.trim() : '';

  if (first && last) {
    return `${first} ${last}`;
  }
  if (first) {
    return first;
  }
  if (last) {
    return last;
  }

  const directName = typeof char.name === 'string' ? char.name.trim() : '';
  if (directName) {
    return directName;
  }

  return fallback;
}

