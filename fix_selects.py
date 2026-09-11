import re

with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'r') as f:
    content = f.read()

# Replace SelectValue to explicitly render translated text
content = content.replace(
    '<SelectTrigger className="w-64"><SelectValue /></SelectTrigger>',
    '<SelectTrigger className="w-64"><SelectValue>{labels[effect.type as MechanicalEffectType] || effect.type}</SelectValue></SelectTrigger>'
)

content = content.replace(
    '<SelectTrigger className="w-44"><SelectValue /></SelectTrigger>',
    '<SelectTrigger className="w-44"><SelectValue>{{"passive": "Pasivo", "on_activation": "Al activar", "on_hit": "Al impactar", "on_critical": "En crítico", "after_effect": "Después del efecto", "turn_start": "Inicio del turno", "each_turn": "Cada turno", "on_fumble": "En pifia"}[effect.timing] || effect.timing}</SelectValue></SelectTrigger>'
)

content = content.replace(
    '<Select value={effect.targeting.relationship} onValueChange={relationship => patchTarget({ relationship: relationship as EffectTargeting["relationship"] })}><SelectTrigger><SelectValue /></SelectTrigger>',
    '<Select value={effect.targeting.relationship} onValueChange={relationship => patchTarget({ relationship: relationship as EffectTargeting["relationship"] })}><SelectTrigger><SelectValue>{{"self": "Portador", "ally": "Aliado", "enemy": "Enemigo", "any": "Cualquiera"}[effect.targeting.relationship] || effect.targeting.relationship}</SelectValue></SelectTrigger>'
)

content = content.replace(
    '<Select value={effect.targeting.selection} disabled={effect.targeting.relationship === "self"} onValueChange={selection => patchTarget({ selection: selection as EffectTargeting["selection"] })}><SelectTrigger><SelectValue /></SelectTrigger>',
    '<Select value={effect.targeting.selection} disabled={effect.targeting.relationship === "self"} onValueChange={selection => patchTarget({ selection: selection as EffectTargeting["selection"] })}><SelectTrigger><SelectValue>{{"direct": "Directo", "area": "Área"}[effect.targeting.selection] || effect.targeting.selection}</SelectValue></SelectTrigger>'
)

# For resourceId
content = content.replace(
    '<Select value={effect.resourceId} onValueChange={resourceId => patch({ resourceId })}><SelectTrigger><SelectValue /></SelectTrigger>',
    '<Select value={effect.resourceId} onValueChange={resourceId => patch({ resourceId })}><SelectTrigger><SelectValue>{{"SA": "Salud", "ES": "Estamina"}[effect.resourceId as string] || effect.resourceId}</SelectValue></SelectTrigger>'
)

# For currencyId
content = content.replace(
    '<Select value={effect.currencyId} onValueChange={currencyId => patch({ currencyId })}><SelectTrigger><SelectValue /></SelectTrigger>',
    '<Select value={effect.currencyId} onValueChange={currencyId => patch({ currencyId })}><SelectTrigger><SelectValue>{{"yen": "Yenes", "exp": "Experiencia"}[effect.currencyId as string] || effect.currencyId}</SelectValue></SelectTrigger>'
)


with open('src/components/mechanics/MechanicalEffectsEditor.tsx', 'w') as f:
    f.write(content)

