import { createCanonCharacter, deleteCanonCharacter } from './src/db/canonCharacters.ts';
async function run() {
  try {
    const res = await createCanonCharacter({ name: "To Be Deleted" });
    console.log("Created:", res.id);
    await deleteCanonCharacter(res.id);
    console.log("Deleted successfully.");
  } catch (e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
run();
