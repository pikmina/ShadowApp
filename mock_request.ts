import { z } from 'zod';
const CharSchema = z.object({
  characterId: z.number().optional().nullable(),
  userId: z.number().optional(),
  name: z.string().optional(),
  profileData: z.record(z.string(), z.any()).optional(),
  expectedUpdatedAt: z.string().optional()
});

const req = {
  body: {
    characterId: null,
    name: "Unnamed",
    profileData: {}
  }
};
console.log(CharSchema.safeParse(req.body));
