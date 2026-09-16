import { z } from 'zod';
import { systemMechanicsConfigSchema } from './src/domain/systemMechanics.ts';
import fs from 'fs';

const rules = JSON.parse(fs.readFileSync('/tmp/rules.json', 'utf8'));
const mechanics = rules.find((r: any) => r.key === 'system_mechanics').value;

mechanics[23].rules[0].component = {
  kind: 'consequence',
  role: 'consequence',
  when: 'end',
  consequence: {
    kind: 'consume',
    elementId: null,
    quantity: 1
  }
};

const parsed = systemMechanicsConfigSchema.safeParse(mechanics);
if (!parsed.success) {
  console.log(parsed.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('\n'));
} else {
  console.log("Success");
}
