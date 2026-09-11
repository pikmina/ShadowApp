import { db } from '../src/db/index.ts';
import { characters, characterSheetFields } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const fields = await db.select().from(characterSheetFields);
  const chars = await db.select().from(characters);

  for (const character of chars) {
    if (!character.profileData) continue;
    
    const profile = { ...character.profileData };
    
    // Clear out faction_group if it matches basic_blood_type to undo the previous bug
    if (profile.faction_group === profile.basic_blood_type && profile.faction_group !== undefined) {
      delete profile.faction_group;
    }
    
    // Fallbacks to correct things
    for (const [key, val] of Object.entries(profile)) {
      if (val === undefined || val === null) continue;
      const nName = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
      if (nName.includes('sangre') || nName.includes('sanguineo')) profile['basic_blood_type'] = val;
      if (nName.includes('edad')) profile['basic_age'] = val;
      if (nName.includes('faccion') || (nName.includes('grupo') && !nName.includes('sangre') && !nName.includes('sanguineo'))) profile['faction_group'] = val;
    }
    
    await db.update(characters)
      .set({ profileData: profile })
      .where(eq(characters.id, character.id));
      
    console.log(`Migrated character ${character.id}`);
  }
  
  console.log("Migration complete!");
  process.exit(0);
}

main().catch(console.error);
