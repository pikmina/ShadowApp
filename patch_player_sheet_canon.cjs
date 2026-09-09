const fs = require('fs');

let code = fs.readFileSync('src/views/PlayerSheet.tsx', 'utf8');

// Add tab state
code = code.replace(
  'const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);',
  `const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'canon'>('all');`
);

// Update tab rendering
code = code.replace(
  `<button className="px-4 py-2 text-xs font-semibold bg-[#1a1a1a] border border-border rounded-md text-foreground transition-colors">Todos los Personajes</button>
           <button className="px-4 py-2 text-xs font-semibold bg-transparent text-muted-foreground hover:text-foreground transition-colors">Personajes Canon</button>`,
  `<button 
             onClick={() => setActiveTab('all')}
             className={\`px-4 py-2 text-xs font-semibold rounded-md transition-colors \${activeTab === 'all' ? 'bg-[#1a1a1a] border border-border text-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}\`}>
             Todos los Personajes
           </button>
           <button 
             onClick={() => setActiveTab('canon')}
             className={\`px-4 py-2 text-xs font-semibold rounded-md transition-colors \${activeTab === 'canon' ? 'bg-[#1a1a1a] border border-border text-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground'}\`}>
             Personajes Canon
           </button>`
);

// Filter the list based on the active tab and whether the character is marked as canon
code = code.replace(
  'const charactersList = isMod ? (allCharacters || []) : [];',
  `const charactersList = (isMod ? (allCharacters || []) : []).filter((c: any) => {
    if (activeTab === 'canon') return c.profileData?.isCanon === true;
    return true;
  });`
);

// Update action buttons (remove contact, keep eye, link eye to public sheet)
code = code.replace(
  `<div className="flex items-center gap-0.5 bg-black/40 border border-border/80 rounded-md p-0.5">
                     <button className="p-1.5 hover:text-foreground text-muted-foreground transition-colors hover:bg-white/5 rounded-sm"><Contact className="w-3.5 h-3.5" /></button>
                     <button className="p-1.5 hover:text-foreground text-muted-foreground transition-colors hover:bg-white/5 rounded-sm"><Eye className="w-3.5 h-3.5" /></button>
                   </div>`,
  `<div className="flex items-center gap-0.5 bg-black/40 border border-border/80 rounded-md p-0.5">
                     <a href={\`/sheet/\${c.id}\`} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:text-foreground text-muted-foreground transition-colors hover:bg-white/5 rounded-sm">
                       <Eye className="w-3.5 h-3.5" />
                     </a>
                   </div>`
);


fs.writeFileSync('src/views/PlayerSheet.tsx', code);
