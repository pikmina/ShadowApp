const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

const helper = `const getGroupColorClass = (group: string) => {
  const g = group.toLowerCase().trim();
  if (g === 'héroes' || g === 'heroes' || g === 'héroe' || g === 'hero' || g.includes('hero')) return 'border-blue-800 text-blue-400 bg-blue-950/30';
  if (g === 'villanos' || g === 'villains' || g === 'villano') return 'border-red-800 text-red-400 bg-red-950/30';
  if (g === 'estudiantes' || g === 'students' || g === 'estudiante' || g.includes('u.a') || g.includes('shiketsu')) return 'border-green-800 text-green-400 bg-green-950/30';
  if (g === 'vigilantes' || g === 'vigilante') return 'border-purple-800 text-purple-400 bg-purple-950/30';
  if (g === 'civiles' || g === 'civilian' || g === 'civil') return 'border-neutral-700 text-neutral-400 bg-neutral-900/30';
  
  const colors = [
    'border-cyan-800 text-cyan-400 bg-cyan-950/30',
    'border-orange-800 text-orange-400 bg-orange-950/30',
    'border-pink-800 text-pink-400 bg-pink-950/30',
    'border-yellow-800 text-yellow-400 bg-yellow-950/30',
    'border-indigo-800 text-indigo-400 bg-indigo-950/30'
  ];
  let hash = 0;
  for (let i = 0; i < g.length; i++) {
    hash = g.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function CharactersAdmin() {`;

content = content.replace('export default function CharactersAdmin() {', helper);

fs.writeFileSync(file, content, 'utf8');
console.log('Added helper');
