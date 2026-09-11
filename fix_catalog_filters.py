import re

with open('src/views/CatalogAdmin.tsx', 'r') as f:
    content = f.read()

# Add Search to lucide-react imports
content = content.replace(
    'import { Plus, Settings2, Trash2, Edit } from "lucide-react";',
    'import { Plus, Settings2, Trash2, Edit, Search } from "lucide-react";\nimport { useMemo } from "react";'
)

# Update state variables
states_to_add = """  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState(defaultForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");"""

content = content.replace(
    '  const [isDialogOpen, setIsDialogOpen] = useState(false);\n  const [activeTab, setActiveTab] = useState("info");\n  const [form, setForm] = useState(defaultForm);',
    states_to_add
)

# Update elements logic
elements_logic = """  const elements = rawElements?.filter((el: any) => el.kind !== "technique" && el.kind !== "technique_entitlement");
  
  const filteredElements = useMemo(() => {
    if (!elements) return [];
    let list = elements;
    
    if (selectedType !== "all") {
      list = list.filter((el: any) => el.kind === selectedType);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((el: any) => 
        el.name.toLowerCase().includes(q) || 
        (KIND_TYPES[el.kind] || "").toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [elements, selectedType, searchTerm]);"""

content = content.replace(
    '  const elements = rawElements?.filter((el: any) => el.kind !== "technique" && el.kind !== "technique_entitlement");',
    elements_logic
)

# Replace mapping and conditionals
content = content.replace(
    '{(!elements || elements.length === 0) ? (',
    '{(!filteredElements || filteredElements.length === 0) ? ('
)
content = content.replace(
    'elements.map((el: any) => (',
    'filteredElements.map((el: any) => ('
)

# Add the UI
ui_to_add = """
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Buscar por nombre..." 
            className="pl-9 bg-card"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="bg-card">
              <SelectValue>{selectedType === 'all' ? 'Todos los tipos' : KIND_TYPES[selectedType]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(KIND_TYPES).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">"""

content = content.replace(
    '<div className="rounded-md border bg-card shadow-sm overflow-hidden">',
    ui_to_add
)

with open('src/views/CatalogAdmin.tsx', 'w') as f:
    f.write(content)

