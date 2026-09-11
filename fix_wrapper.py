import re

with open('src/components/character/CharacterEditor.tsx', 'r') as f:
    content = f.read()

# Finding the start of the tabs div
old_tabs_div = '<div className="flex bg-card/40 border border-border overflow-x-auto custom-scrollbar rounded-lg mb-6 p-1 gap-1 items-center">'
new_tabs_div = '<Card className="border-border shadow-sm bg-card/30 overflow-hidden">\n        <div className="flex bg-muted/20 border-b border-border/50 overflow-x-auto custom-scrollbar p-1.5 gap-1 items-center">'
content = content.replace(old_tabs_div, new_tabs_div)

# Finding the start of the content div
old_content_div = '</div>\n\n      <div className="space-y-6">'
new_content_div = '</div>\n\n        <div className="p-6">\n          <div className="space-y-6">'
content = content.replace(old_content_div, new_content_div)

# Finding the end of the file to close the Card and div
old_end = '      </div>\n    </div>\n  );\n}'
new_end = '          </div>\n        </div>\n      </Card>\n    </div>\n  );\n}'
content = content.replace(old_end, new_end)

with open('src/components/character/CharacterEditor.tsx', 'w') as f:
    f.write(content)

