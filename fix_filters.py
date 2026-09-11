import re

with open('src/views/CharactersAdmin.tsx', 'r') as f:
    content = f.read()

# Replace specific SelectValues
content = re.sub(
    r'<Select value=\{selectedGroup\} onValueChange=\{setSelectedGroup\}>\s*<SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue [^>]*\/><\/SelectTrigger>',
    '<Select value={selectedGroup} onValueChange={setSelectedGroup}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue placeholder="Grupo: Todos" /></SelectTrigger>',
    content
)

content = re.sub(
    r'<Select value=\{selectedDon\} onValueChange=\{setSelectedDon\}>\s*<SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue [^>]*\/><\/SelectTrigger>',
    '<Select value={selectedDon} onValueChange={setSelectedDon}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue placeholder="Don: Todos" /></SelectTrigger>',
    content
)

content = re.sub(
    r'<Select value=\{selectedStage\} onValueChange=\{setSelectedStage\}>\s*<SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue [^>]*\/><\/SelectTrigger>',
    '<Select value={selectedStage} onValueChange={setSelectedStage}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue placeholder="Etapa: Todas" /></SelectTrigger>',
    content
)

content = re.sub(
    r'<Select value=\{sortBy\} onValueChange=\{value => setSortBy\(value as \'name\' \| \'recent\'\)\}>\s*<SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue [^>]*\/><\/SelectTrigger>',
    '<Select value={sortBy} onValueChange={value => setSortBy(value as \'name\' | \'recent\')}>\n              <SelectTrigger className="h-9 bg-background/70 text-xs"><SelectValue placeholder="Ordenar: Nombre" /></SelectTrigger>',
    content
)

# And now replace the literal selectedGroup = 'all' initialization
content = content.replace("const [selectedGroup, setSelectedGroup] = useState('all');", "const [selectedGroup, setSelectedGroup] = useState('');")
content = content.replace("const [selectedDon, setSelectedDon] = useState('all');", "const [selectedDon, setSelectedDon] = useState('');")
content = content.replace("const [selectedStage, setSelectedStage] = useState('all');", "const [selectedStage, setSelectedStage] = useState('');")
content = content.replace("const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');", "const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');") # we can keep sortBy as name

with open('src/views/CharactersAdmin.tsx', 'w') as f:
    f.write(content)

