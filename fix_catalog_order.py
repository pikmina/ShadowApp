import re

with open('src/views/CatalogAdmin.tsx', 'r') as f:
    content = f.read()

# Remove the state declarations from their current location
states = """  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [form, setForm] = useState(defaultForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
"""
content = content.replace(states, "")

# Add them back right at the beginning of the component
content = content.replace(
    'export default function CatalogAdmin() {\n  const { user } = useAuth();',
    'export default function CatalogAdmin() {\n  const { user } = useAuth();\n\n' + states
)

with open('src/views/CatalogAdmin.tsx', 'w') as f:
    f.write(content)
