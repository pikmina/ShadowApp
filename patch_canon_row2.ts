import fs from 'fs';

let content = fs.readFileSync('src/views/CanonCharactersAdmin.tsx', 'utf-8');

// Also update Name which was missed previously or has duplicate reads
content = content.replace(
  `{readProfile(c.profileData, ['basic_name', 'name', 'nombre']) || c.firstName || c.name} {readProfile(c.profileData, ['last_name', 'apellido']) || c.lastName || ''}`,
  `{getProfileValueByCoreKey(c.profileData, 'basic_name', ['name', 'nombre']) || c.firstName || c.name} {getProfileValueByCoreKey(c.profileData, 'last_name', ['apellido']) || c.lastName || ''}`
);

fs.writeFileSync('src/views/CanonCharactersAdmin.tsx', content);
