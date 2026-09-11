import re

with open('src/views/CharactersAdmin.tsx', 'r') as f:
    content = f.read()

# Fix selectedDon
content = re.sub(
    r'<Select value=\{selectedDon\} onValueChange=\{setSelectedDon\}>\s*<SelectTrigger className="h-9 bg-background\/70 text-xs"><SelectValue>\{selectedGroup === \'all\' \? \'Grupo: Todos\' : `Grupo: \$\{selectedGroup\}`\}<\/SelectValue><\/SelectTrigger>',
    '<Select value={selectedDon} onValueChange={setSelectedDon}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{selectedDon === \'all\' || selectedDon === \'\' ? \'Don: Todos\' : `Don: ${selectedDon}`}</SelectValue></SelectTrigger>',
    content
)

# Fix selectedStage
content = re.sub(
    r'<Select value=\{selectedStage\} onValueChange=\{setSelectedStage\}>\s*<SelectTrigger className="h-9 bg-background\/70 text-xs"><SelectValue>\{selectedGroup === \'all\' \? \'Grupo: Todos\' : `Grupo: \$\{selectedGroup\}`\}<\/SelectValue><\/SelectTrigger>',
    '<Select value={selectedStage} onValueChange={setSelectedStage}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{selectedStage === \'all\' || selectedStage === \'\' ? \'Etapa: Todas\' : `Etapa: ${selectedStage}`}</SelectValue></SelectTrigger>',
    content
)

# Fix sortBy
content = re.sub(
    r'<Select value=\{sortBy\} onValueChange=\{value => setSortBy\(value as \'name\' \| \'recent\'\)\}>\s*<SelectTrigger className="h-9 bg-background\/70 text-xs"><SelectValue>\{selectedGroup === \'all\' \? \'Grupo: Todos\' : `Grupo: \$\{selectedGroup\}`\}<\/SelectValue><\/SelectTrigger>',
    '<Select value={sortBy} onValueChange={value => setSortBy(value as \'name\' | \'recent\')}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{sortBy === \'name\' ? \'Ordenar: Nombre\' : \'Ordenar: Actualización\'}</SelectValue></SelectTrigger>',
    content
)

# Fix selectedGroup to handle empty string too, and revert it properly
content = re.sub(
    r'<Select value=\{selectedGroup\} onValueChange=\{setSelectedGroup\}>\s*<SelectTrigger className="h-9 bg-background\/70 text-xs"><SelectValue>\{selectedGroup === \'all\' \? \'Grupo: Todos\' : `Grupo: \$\{selectedGroup\}`\}<\/SelectValue><\/SelectTrigger>',
    '<Select value={selectedGroup} onValueChange={setSelectedGroup}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue>{selectedGroup === \'all\' || selectedGroup === \'\' ? \'Grupo: Todos\' : `Grupo: ${selectedGroup}`}</SelectValue></SelectTrigger>',
    content
)

with open('src/views/CharactersAdmin.tsx', 'w') as f:
    f.write(content)

