import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

mechanic_tab_start = content.find('<TabsContent value="mechanics"')
dialog_start = content.find('<Dialog open={isMechanicDialogOpen}')
# find where the dialog ends (we know it's near the end of the component, just before `</div>` and `); }`)
component_end = content.rfind('</div>\n  );\n}')

if mechanic_tab_start == -1 or dialog_start == -1 or component_end == -1:
    print("Could not find markers")
    exit(1)

# We want to replace everything from mechanic_tab_start to component_end with our new UI.
# BUT wait! The Dialog open={isMechanicDialogOpen} is inside a larger block. 
# Actually, the file structure:
# <TabsContent value="attributes">...
# <TabsContent value="stages">...
# <TabsContent value="mechanics">...
#   <Dialog attr>...
#   <Dialog stage>...
#   <Dialog mechanic>...
# </div>

print(content[dialog_start:dialog_start+100])
