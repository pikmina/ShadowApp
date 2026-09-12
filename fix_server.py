import re

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'res.status(500).json({ error: "Failed to delete element" });',
    'console.error("DELETE ELEMENT ROUTE ERROR:", error);\n      res.status(500).json({ error: "Failed to delete element: " + (error.message || String(error)) });'
)

with open('server.ts', 'w') as f:
    f.write(content)

