const fs = require('fs');

let content = fs.readFileSync('src/views/TechniquesAdmin.tsx', 'utf8');

// Add import
content = content.replace(
  /import \{ apiFetch, fetcher \} from "\.\.\/lib\/api";/,
  `import { apiFetch, fetcher } from "../lib/api";\nimport { calculateTotalCE, getCELevel, resolveLiveRule } from "../domain/mechanics";`
);

// Replace CE calculation
content = content.replace(
  /\/\/ Basic CE calculation simulator[\s\S]*?const ceLevel = calculatedCE[^;]+;/m,
  `const calculatedCE = calculateTotalCE(form.effects || [], mechanics);
  const ceLevel = getCELevel(calculatedCE);`
);

// Replace the CE number in the UI
content = content.replace(
  /\{form\.effects\.filter\(\(e: any\) => e\.type === 'mechanic_rule'\)\.reduce\(\(sum: number, e: any\) => sum \+ \(e\.cost \|\| 0\), 0\)\}/,
  `{calculateTotalCE(form.effects || [], mechanics)}`
);

// Update the list mapping to use live resolution
content = content.replace(
  /\{form\.effects\.filter\(\(e: any\) => e\.type === 'mechanic_rule'\)\.map\(\(e: any, i: number\) => \([\s\S]*?<\/div>\s*\)\)\}/,
  `{form.effects.filter((e: any) => e.type === 'mechanic_rule').map((e: any, i: number) => {
                      const liveRule = resolveLiveRule(e, mechanics);
                      const cost = liveRule ? liveRule.cost : (e.cost || 0);
                      const name = liveRule ? liveRule.name : (e.ruleName || 'Regla');
                      return (
                      <div key={i} className="flex justify-between items-center text-sm border border-border/50 bg-black/20 p-2 rounded">
                        <span className="truncate pr-2 text-foreground/80">{name}</span>
                        <span className={\`font-mono font-bold shrink-0 \${cost > 0 ? 'text-destructive' : cost < 0 ? 'text-primary' : 'text-muted-foreground'}\`}>
                          {cost > 0 ? '+' : ''}{cost || 0}
                        </span>
                      </div>
                    )
                  })}`
);

fs.writeFileSync('src/views/TechniquesAdmin.tsx', content);
