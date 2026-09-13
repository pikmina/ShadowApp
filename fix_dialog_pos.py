import re

with open('src/views/RulesAdmin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the Dialog block
dialog_pattern = r'          <Dialog open=\{isRuleDialogOpen\}.*?</Dialog>\n'
match = re.search(dialog_pattern, content, re.DOTALL)
if match:
    dialog_block = match.group(0)
    # Remove it from where it currently is
    content = content.replace(dialog_block, '')
    
    # Insert it AFTER the `)}`
    content = content.replace('          )}\n        </TabsContent>', '          )}\n' + dialog_block + '        </TabsContent>')
    
    with open('src/views/RulesAdmin.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        print("Fixed Dialog position!")
else:
    print("Dialog not found")
