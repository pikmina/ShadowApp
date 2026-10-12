/**
 * Generates human-readable, clean slug identifiers (e.g. "Sensorial" -> "sensorial", "Contacto Físico" -> "contacto_fisico")
 */
export function slugifyId(text: string, fallback = 'option'): string {
  if (!text) return fallback;
  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents / diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '') // Remove special characters
    .replace(/[\s-]+/g, '_') // Convert spaces and hyphens to underscores
    .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
  return slug || fallback;
}
