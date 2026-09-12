import re

with open('src/db/elements.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "import { systemElements } from './schema.ts';",
    "import { systemElements, elementPossessions, shopOffers } from './schema.ts';"
)

delete_logic = """export async function deleteElement(id: string) {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(elementPossessions).where(eq(elementPossessions.elementId, id));
      await tx.delete(shopOffers).where(eq(shopOffers.elementId, id));
      await tx.delete(systemElements).where(eq(systemElements.id, id));
    });
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Failed to delete element", { cause: error });
  }
}"""

content = re.sub(
    r'export async function deleteElement\(id: string\) \{.*?^\}',
    delete_logic,
    content,
    flags=re.MULTILINE | re.DOTALL
)

with open('src/db/elements.ts', 'w') as f:
    f.write(content)

