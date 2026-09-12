import re

with open('src/db/schema.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "elementId: text('element_id').references(() => systemElements.id).notNull(),",
    "elementId: text('element_id').references(() => systemElements.id, { onDelete: 'cascade' }).notNull(),"
)

with open('src/db/schema.ts', 'w') as f:
    f.write(content)
