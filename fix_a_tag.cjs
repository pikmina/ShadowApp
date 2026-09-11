const fs = require('fs');
const file = 'src/views/CharactersAdmin.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                <div className="absolute top-2 left-2 rounded-full bg-black/40 p-0.5 border border-yellow-500/30">
                  <AlertCircle className="size-3.5 text-yellow-500" />
                </div>
              </button>`;
const replacement = `                <div className="absolute top-2 left-2 rounded-full bg-black/40 p-0.5 border border-yellow-500/30">
                  <AlertCircle className="size-3.5 text-yellow-500" />
                </div>
              </a>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Fixed the single closing tag.");
} else {
  console.log("Not found.");
}
