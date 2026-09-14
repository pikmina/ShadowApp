import { createCanonCharacter } from './src/db/canonCharacters.ts';
async function run() {
  try {
    const res = await createCanonCharacter({ name: "Test Canon 3" });
    console.log("Success:", res);
  } catch (e) {
    console.error("Failed:", e);
  }
  process.exit(0);
}
run();
