import re

with open('src/components/DashboardLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to add a section for Manual
nav_str = '  { label: "Administración", roles: ["superadmin"], items: ['
new_nav_str = '  { label: "Documentación", roles: ["superadmin", "moderator", "user"], items: [\n    { to: "/manual", label: "Manual del Sistema", icon: BookOpen },\n  ] },\n' + nav_str

if 'to: "/manual"' not in content:
    content = content.replace(nav_str, new_nav_str)

with open('src/components/DashboardLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

