const fs = require('fs');

let content = fs.readFileSync('src/views/RulesAdmin.tsx', 'utf8');

// Replace the DialogContent classname
content = content.replace(
  /<DialogContent className="admin-dialog sm:max-w-\[600px\] p-0 overflow-hidden">/,
  '<DialogContent className="admin-dialog sm:max-w-[700px] h-[90vh] flex flex-col p-0 overflow-hidden">'
);

// Remove the max-h from the scrollable body so it simply flexes
content = content.replace(
  /<div className="px-6 py-4 space-y-4 max-h-\[70vh\] overflow-y-auto">/,
  '<div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto">'
);

// Ensure DialogFooter doesn't shrink
content = content.replace(
  /<DialogFooter className="px-6 py-4 border-t bg-muted">/g,
  '<DialogFooter className="px-6 py-4 border-t bg-muted shrink-0">'
);

fs.writeFileSync('src/views/RulesAdmin.tsx', content);
