import { db } from './src/db/index.ts';
import { systemElements, characters } from './src/db/schema.ts';
import { nanoid } from 'nanoid';

async function main() {
    const traitId = nanoid(10);
    await db.insert(systemElements).values({
        id: traitId,
        kind: 'trait',
        name: 'Fuerza Bruta',
        description: '+2 a Fuerza',
        status: 'published',
        effects: [{ type: 'stat_modifier', attributeId: 'FUE', value: 2 }]
    });

    const [char] = await db.insert(characters).values({
        userId: 1,
        name: 'Test Character',
        profileData: {
            traits: [traitId],
            FUE: 5,
            basic_stage: 'Novato'
        }
    }).returning();

    console.log("Created Character:", char);
}

main().catch(console.error);
