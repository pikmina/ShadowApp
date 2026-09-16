export const coreProfileFields = [
  { key: 'basic_name', name: 'Nombre', type: 'text', aliases: ['nombre', 'nombre del personaje', 'basic_name'] },
  { key: 'last_name', name: 'Apellido', type: 'text', aliases: ['apellido', 'apellidos', 'last_name'] },
  { key: 'birth_date', name: 'Fecha de Nacimiento', type: 'date', aliases: ['nacimiento', 'fecha de nacimiento', 'fecha nacimiento', 'birth date', 'birth_date'] },
  { key: 'basic_blood_type', name: 'Tipo de Sangre', type: 'text', aliases: ['tipo de sangre', 'grupo sanguíneo', 'grupo sanguineo', 'basic_blood_type'] },
  { key: 'basic_alignment', name: 'Alineación', type: 'text', aliases: ['alineación', 'alineacion', 'alineamiento', 'basic_alignment'] },
  { key: 'nationality', name: 'Nacionalidad', type: 'text', aliases: ['nacionalidad', 'nationality'] },
  { key: 'faceclaim', name: 'Faceclaim', type: 'text', aliases: ['faceclaim', 'faceclaim_pb', 'pb'] },
  { key: 'quirk_type', name: 'Tipo de Quirk', type: 'text', aliases: ['tipo de quirk', 'tipo de don', 'quirk_type'] },
  { key: 'quirk_name', name: 'Quirk', type: 'text', aliases: ['quirk', 'nombre del quirk', 'nombre del don', 'quirk_name'] },
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
    alias: ['alias', 'nickname', 'apodo', 'hero_name'], avatar_url: ['avatar_url', 'avatarUrl', 'avatar', 'image', 'imagen'],
  };
  for (const candidate of candidates[key]) if (profile[candidate] !== undefined && profile[candidate] !== null) return profile[candidate];
  return undefined;
}
