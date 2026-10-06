import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  Sparkles, 
  User, 
  Swords, 
  BookOpen, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';
import { SectionHeader } from '../components/common/SectionHeader';
import { toast } from 'sonner';

// Sample Mock JSON payloads
const CHARACTER_SAMPLE_JSON = {
  "id": 2574,
  "name": "Izuku",
  "playerId": 12,
  "active": true,
  "exp": 150,
  "yen": 50000,
  "createdAt": "2026-03-10T14:20:00.000Z",
  "updatedAt": "2026-04-01T18:30:00.000Z",
  "profileData": {
    "basic_name": "Izuku",
    "last_name": "Midoriya",
    "alias": "Deku",
    "faceclaim": "Izuku Midoriya (My Hero Academia)",
    "avatar_url": "https://i.imgur.com/example-deku.png",
    "birth_date": "2008-07-15",
    "basic_age": 16,
    "gender": "Masculino",
    "nationality": "Japonesa",
    "basic_blood_type": "O+",
    "basic_alignment": "Heróica",
    "faction_group": "Estudiante",
    "status": "Activo",
    
    // ⚡ Quirk / Don (Estructura Modular Canónica)
    "quirk_name": "One For All",
    "quirk_type": "Emisor",
    "quirk_level": "Nivel 2. Dominio",
    "quirk_description": "Acumulación y liberación de poder físico concentrado en ráfagas de energía bio-cinética.",
    "quirk_lvl1": "Control al 5%: Incremento base de velocidad, agilidad e impacto en combate cuerpo a cuerpo.",
    "quirk_lvl2": "Control al 20% (Full Cowl): Desplazamiento aéreo continuo, saltos de gran altura y ráfagas de viento por presión.",
    "quirk_lvl3": "Control al 100%: Liberación total de fuerza devastadora y manifestación de dones secundarios latentes.",

    // 🛡️ Atributos Primarios (Escala 0-10)
    "atributos": {
      "fue": 5,
      "des": 4,
      "res": 6,
      "int": 7,
      "vol": 6,
      "vel": 5
    },

    // ⚔️ Atributos Derivados Calculados
    "salud_maxima": 26,
    "estamina_maxima": 24,
    "evasion": 15,
    "coraje": 16,
    "mod_fue": 2,
    "mod_des": 2,
    "iniciativa": 3,
    "daño_fisico": "1D8 + 2",
    "daño_rango": "1D8 + 2",
    "reduccion_dano": 0
  },

  // 🥋 Técnicas de Combate Asignadas
  "techniques": [
    {
      "id": "tech-ofa-01",
      "name": "Detroit Smash",
      "classification": "offensive",
      "staminaCost": 4,
      "description": "Golpe descendente a máxima velocidad que genera un vórtice de aire con daño en área.",
      "effects": [
        { "type": "damage", "amount": "2D8+4", "target": "enemy" }
      ]
    },
    {
      "id": "tech-ofa-02",
      "name": "Delaware Smash",
      "classification": "offensive",
      "staminaCost": 2,
      "description": "Disparo de aire comprimido chasqueando los dedos para mantener distancia.",
      "effects": [
        { "type": "damage", "amount": "1D8+2", "target": "ranged" }
      ]
    }
  ],

  // 🎒 Posesiones (Inventario, Habilidades, Rasgos, Debilidades y Licencias)
  "possessions": [
    {
      "id": "pos-01",
      "quantity": 1,
      "equipped": true,
      "notes": "Costeado por la Agencia de Apoyo U.A.",
      "element": {
        "id": "eq-01",
        "name": "Guantes de Fuerza Reforzados",
        "kind": "equipment",
        "category": "Equipamiento",
        "description": "Guantes de aleación de kevlar que reducen el retroceso cinético."
      }
    },
    {
      "id": "pos-02",
      "quantity": 1,
      "equipped": false,
      "element": {
        "id": "lic-01",
        "name": "Licencia Provisional de Héroe",
        "kind": "license",
        "category": "Licencias y Permisos",
        "description": "Habilitación oficial de rescate y combate ante incidentes de emergencia."
      }
    },
    {
      "id": "pos-03",
      "quantity": 3,
      "element": {
        "id": "sk-01",
        "name": "Artes Marciales",
        "kind": "skill",
        "category": "Habilidades",
        "description": "Dominio de combate cuerpo a cuerpo y llaves de sumisión (Nivel 3)."
      }
    },
    {
      "id": "pos-04",
      "element": {
        "id": "tr-01",
        "name": "Voluntad Inquebrantable",
        "kind": "trait",
        "category": "Rasgos",
        "description": "+2 de bonificación pasiva en tiradas de Coraje y resistencia mental."
      }
    },
    {
      "id": "pos-05",
      "element": {
        "id": "wk-01",
        "name": "Auto-daño por Sobrecarga",
        "kind": "weakness",
        "category": "Debilidades",
        "description": "Sufre 1D4 de daño interno si utiliza técnicas de nivel superior al permitido."
      }
    }
  ],

  // 🏢 Empleos y Agencias
  "employments": [
    {
      "id": 1,
      "workplace": "Agencia Endeavor",
      "position": "Pasante Heroico",
      "salary": 25000,
      "notes": "Contrato de prácticas trimestrales"
    }
  ],

  // 🎓 Matrícula Académica (si es estudiante)
  "enrollment": {
    "school": { "id": "sch-01", "name": "Academia U.A." },
    "academicYear": { "id": "ay-01", "name": "Curso de Héroes" },
    "classGroup": { "id": "cg-01", "name": "Clase 1-A" }
  }
};

const TECHNIQUES_SAMPLE_JSON = [
  {
    "id": "tech-001",
    "name": "Detroit Smash",
    "slug": "detroit-smash",
    "classification": "offensive",
    "staminaCost": 4,
    "description": "Impacto de choque cinético que comprime el aire provocando daño masivo frontal.",
    "cooldown": 1,
    "range": "Melee / Ráfaga 5m",
    "rules": [
      {
        "mechanicId": "mech_damage_heavy",
        "ruleName": "Daño Físico Pesado",
        "effectType": "damage"
      }
    ]
  },
  {
    "id": "tech-002",
    "name": "Muro de Hielo",
    "slug": "muro-de-hielo",
    "classification": "defensive",
    "staminaCost": 3,
    "description": "Genera una barrera sólida de hielo que bloquea proyectiles y absorbe impacto.",
    "cooldown": 2,
    "range": "Área 10m",
    "rules": [
      {
        "mechanicId": "mech_barrier",
        "ruleName": "Barrera de Protección",
        "effectType": "barrier"
      }
    ]
  }
];

const SYSTEM_RULES_SAMPLE_JSON = {
  "attributes": [
    { "id": "fue", "name": "Fuerza", "abbrev": "FUE", "desc": "Capacidad física, levantamiento y daño cuerpo a cuerpo." },
    { "id": "des", "name": "Destreza", "abbrev": "DES", "desc": "Agilidad, puntería, reflejos y habilidades manuales." },
    { "id": "res", "name": "Resistencia", "abbrev": "RES", "desc": "Tolerancia al daño físico, fatiga y salud vital." },
    { "id": "int", "name": "Inteligencia", "abbrev": "INT", "desc": "Capacidad analítica, memoria y tecnología." },
    { "id": "vol", "name": "Voluntad", "abbrev": "VOL", "desc": "Fuerza mental, resistencia psíquica y control del Quirk." },
    { "id": "vel", "name": "Velocidad", "abbrev": "VEL", "desc": "Desplazamiento, iniciativa en combate y evasión." }
  ],
  "derivedFormulas": {
    "salud": "Salud Base de Etapa + RES",
    "estamina": "Salud Base de Etapa + DES",
    "evasion": "10 + VEL",
    "coraje": "10 + VOL",
    "modificador": "Floor(Atributo / 2)",
    "dañoFisico": "Dado de Etapa + Mod. FUE",
    "dañoRango": "Dado de Etapa + Mod. DES",
    "iniciativa": "Floor((INT + VEL) / 2) / 2"
  },
  "staminaExecutionCosts": {
    "minimumActionCost": 1,
    "techniqueTier1": 2,
    "techniqueTier2": 4,
    "techniqueTier3": 6
  }
};

export default function ApiGuideAdmin() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`Copiado: ${label}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <SectionHeader 
        title="Guía de Consumo de API JSON" 
        description="Documentación técnica y estructuras de respuesta JSON para desarrolladores que integran scripts en Foroactivo, Drawers, Modales o aplicaciones externas."
        icon={Code2}
      />

      {/* Header Info Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/60 border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
              <Globe className="w-4 h-4" /> Acceso Público (CORS Habilitado)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Los endpoints bajo <code>/api/public/*</code> son accesibles directamente desde cualquier dominio mediante <code>fetch</code> o AJAX sin necesidad de API Key.
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-cyan-400">
              <Zap className="w-4 h-4" /> Formato de Respuesta
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            Todas las respuestas se entregan con <code>Content-Type: application/json</code> codificadas en UTF-8 y con valores canónicos normalizados.
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/80">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-400">
              <ShieldCheck className="w-4 h-4" /> Manejo de Errores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-muted-foreground">
            En caso de personaje no encontrado devuelve código <code>404</code> con <code>{`{ "error": "Character not found" }`}</code>.
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="character-api" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="character-api" className="flex items-center gap-2">
            <User className="w-4 h-4" /> 1. Ficha de Personaje
          </TabsTrigger>
          <TabsTrigger value="techniques-api" className="flex items-center gap-2">
            <Swords className="w-4 h-4" /> 2. Técnicas de Combate
          </TabsTrigger>
          <TabsTrigger value="rules-api" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> 3. Reglas y Atributos
          </TabsTrigger>
          <TabsTrigger value="code-examples" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" /> 4. Código para Foroactivo
          </TabsTrigger>
        </TabsList>

        {/* ================= 1. FICHA DE PERSONAJE ================= */}
        <TabsContent value="character-api" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-600 text-white font-mono text-xs">GET</Badge>
                    <code className="text-sm font-mono bg-muted/80 px-2 py-0.5 rounded text-primary">
                      /api/public/character/:identifier
                    </code>
                  </div>
                  <CardDescription className="text-xs">
                    Obtiene todos los datos de la ficha por <strong>ID numérico</strong> (ej: <code>2574</code>) o por <strong>nombre</strong> (ej: <code>Izuku</code> o <code>Midoriya Izuku</code>).
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(CHARACTER_SAMPLE_JSON, null, 2), 'Character JSON')}
                  className="text-xs flex items-center gap-1.5"
                >
                  {copiedKey === 'Character JSON' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar JSON de Muestra
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Visual Field Guide */}
                <div className="space-y-3 lg:col-span-1 text-xs">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" /> Estructura del Objeto
                  </h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="p-2 bg-muted/30 rounded border border-border/50">
                      <strong className="text-foreground block">profileData</strong>
                      Contiene los datos del perfil (Identidad, Don, Atributos, Estadísticas Derivadas).
                    </li>
                    <li className="p-2 bg-muted/30 rounded border border-border/50">
                      <strong className="text-foreground block">techniques</strong>
                      Array de técnicas de combate con Coste de Estamina (CE) y efectos mecánicos.
                    </li>
                    <li className="p-2 bg-muted/30 rounded border border-border/50">
                      <strong className="text-foreground block">possessions</strong>
                      Array unificado de inventario, armas, habilidades entrenadas, rasgos, debilidades y licencias.
                    </li>
                    <li className="p-2 bg-muted/30 rounded border border-border/50">
                      <strong className="text-foreground block">enrollment & employments</strong>
                      Datos de academia (escuela, curso, aula) y agencias de empleo con salario en Yenes (¥).
                    </li>
                  </ul>
                </div>

                {/* JSON Preview Box */}
                <div className="lg:col-span-2">
                  <pre className="text-xs text-muted-foreground overflow-x-auto p-4 bg-black/70 border border-border/80 rounded-lg font-mono max-h-[550px] leading-relaxed select-all">
                    {JSON.stringify(CHARACTER_SAMPLE_JSON, null, 2)}
                  </pre>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= 2. TÉCNICAS DE COMBATE ================= */}
        <TabsContent value="techniques-api" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-600 text-white font-mono text-xs">GET</Badge>
                    <code className="text-sm font-mono bg-muted/80 px-2 py-0.5 rounded text-primary">
                      /api/public/techniques
                    </code>
                  </div>
                  <CardDescription className="text-xs">
                    Devuelve el catálogo global de técnicas de combate activas registradas en el sistema.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(TECHNIQUES_SAMPLE_JSON, null, 2), 'Techniques JSON')}
                  className="text-xs flex items-center gap-1.5"
                >
                  {copiedKey === 'Techniques JSON' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar JSON de Técnicas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <pre className="text-xs text-muted-foreground overflow-x-auto p-4 bg-black/70 border border-border/80 rounded-lg font-mono max-h-[450px] leading-relaxed select-all">
                {JSON.stringify(TECHNIQUES_SAMPLE_JSON, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= 3. REGLAS Y ATRIBUTOS ================= */}
        <TabsContent value="rules-api" className="space-y-4">
          <Card className="border-border">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-600 text-white font-mono text-xs">GET</Badge>
                    <code className="text-sm font-mono bg-muted/80 px-2 py-0.5 rounded text-primary">
                      /api/public/system-rules
                    </code>
                  </div>
                  <CardDescription className="text-xs">
                    Diccionario canónico de atributos del sistema, fórmulas derivadas y costes mínimos de Estamina (CE).
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(SYSTEM_RULES_SAMPLE_JSON, null, 2), 'Rules JSON')}
                  className="text-xs flex items-center gap-1.5"
                >
                  {copiedKey === 'Rules JSON' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copiar JSON de Reglas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <pre className="text-xs text-muted-foreground overflow-x-auto p-4 bg-black/70 border border-border/80 rounded-lg font-mono max-h-[450px] leading-relaxed select-all">
                {JSON.stringify(SYSTEM_RULES_SAMPLE_JSON, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= 4. CÓDIGO LISTO PARA FOROACTIVO ================= */}
        <TabsContent value="code-examples" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Script de Integración para Foroactivo (Modal / Drawer)
              </CardTitle>
              <CardDescription>
                Copia este script e insértalo en la <strong>Gestión de Códigos JavaScript</strong> de Foroactivo (con opción <em>En todas las páginas</em> o <em>En los perfiles</em>).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">JavaScript (ES6 / Vanilla):</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`
// Script de consumo de API ShadowApp para Foroactivo
async function fetchCharacterSheet(characterIdentifier) {
  try {
    const res = await fetch(\`https://TU_DOMINIO/api/public/character/\${encodeURIComponent(characterIdentifier)}\`);
    if (!res.ok) throw new Error("Personaje no encontrado");
    const char = await res.json();
    
    // 1. Extraer Identidad
    const prof = char.profileData || {};
    const nombre = prof.basic_name || char.name || "Sin nombre";
    const apellido = prof.last_name || "";
    const alias = prof.alias ? \`AKA: \${prof.alias}\` : "";
    const faceclaim = prof.faceclaim || "Ninguno";
    const avatar = prof.avatar_url || "https://placehold.co/150";

    // 2. Extraer Quirk Modular
    const quirkName = prof.quirk_name || "Sin don";
    const quirkType = prof.quirk_type || "Desconocido";
    const quirkLevel = prof.quirk_level || "Nivel 1. Despertar";
    const quirkDesc = prof.quirk_description || "";
    const quirkLvl1 = prof.quirk_lvl1 || "-";
    const quirkLvl2 = prof.quirk_lvl2 || "-";
    const quirkLvl3 = prof.quirk_lvl3 || "-";

    // 3. Extraer Atributos
    const attrs = prof.atributos || {};
    const fue = attrs.fue || 0;
    const des = attrs.des || 0;
    const res = attrs.res || 0;
    const int = attrs.int || 0;
    const vol = attrs.vol || 0;
    const vel = attrs.vel || 0;

    // 4. Filtrar Posesiones
    const possessions = char.possessions || [];
    const traits = possessions.filter(p => (p.element?.kind || p.kind) === 'trait');
    const weaknesses = possessions.filter(p => (p.element?.kind || p.kind) === 'weakness');
    const skills = possessions.filter(p => (p.element?.kind || p.kind) === 'skill');
    const inventory = possessions.filter(p => ['equipment', 'weapon', 'consumable'].includes(p.element?.kind || p.kind));

    // 5. Inyectar en el Modal o Drawer del Foro
    renderDrawerModal({
      nombreCompleto: \`\${nombre} \${apellido}\`.trim(),
      alias,
      faceclaim,
      avatar,
      quirk: { name: quirkName, type: quirkType, level: quirkLevel, desc: quirkDesc, lvl1: quirkLvl1, lvl2: quirkLvl2, lvl3: quirkLvl3 },
      atributos: { fue, des, res, int, vol, vel },
      traits,
      weaknesses,
      skills,
      techniques: char.techniques || [],
      inventory
    });

  } catch (err) {
    console.error("Error al cargar la ficha:", err);
  }
}`, 'Foroactivo Script')}
                    className="text-xs h-7"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Script
                  </Button>
                </div>
                
                <pre className="text-xs text-muted-foreground overflow-x-auto p-4 bg-black/70 border border-border/80 rounded-lg font-mono leading-relaxed">
{`// Script de consumo de API ShadowApp para Foroactivo
async function fetchCharacterSheet(characterIdentifier) {
  try {
    const res = await fetch(\`https://TU_DOMINIO/api/public/character/\${encodeURIComponent(characterIdentifier)}\`);
    if (!res.ok) throw new Error("Personaje no encontrado");
    const char = await res.json();
    
    // 1. Extraer Identidad
    const prof = char.profileData || {};
    const nombre = prof.basic_name || char.name || "Sin nombre";
    const apellido = prof.last_name || "";
    const alias = prof.alias ? \`AKA: \${prof.alias}\` : "";
    const faceclaim = prof.faceclaim || "Ninguno";
    const avatar = prof.avatar_url || "https://placehold.co/150";

    // 2. Extraer Quirk Modular
    const quirkName = prof.quirk_name || "Sin don";
    const quirkType = prof.quirk_type || "Desconocido";
    const quirkLevel = prof.quirk_level || "Nivel 1. Despertar";
    const quirkDesc = prof.quirk_description || "";
    const quirkLvl1 = prof.quirk_lvl1 || "-";
    const quirkLvl2 = prof.quirk_lvl2 || "-";
    const quirkLvl3 = prof.quirk_lvl3 || "-";

    // 3. Extraer Atributos
    const attrs = prof.atributos || {};
    const fue = attrs.fue || 0;
    const des = attrs.des || 0;
    const res = attrs.res || 0;
    const int = attrs.int || 0;
    const vol = attrs.vol || 0;
    const vel = attrs.vel || 0;

    // 4. Filtrar Posesiones
    const possessions = char.possessions || [];
    const traits = possessions.filter(p => (p.element?.kind || p.kind) === 'trait');
    const weaknesses = possessions.filter(p => (p.element?.kind || p.kind) === 'weakness');
    const skills = possessions.filter(p => (p.element?.kind || p.kind) === 'skill');
    const inventory = possessions.filter(p => ['equipment', 'weapon', 'consumable'].includes(p.element?.kind || p.kind));

    // 5. Inyectar en el Modal o Drawer del Foro
    renderDrawerModal({
      nombreCompleto: \`\${nombre} \${apellido}\`.trim(),
      alias,
      faceclaim,
      avatar,
      quirk: { name: quirkName, type: quirkType, level: quirkLevel, desc: quirkDesc, lvl1: quirkLvl1, lvl2: quirkLvl2, lvl3: quirkLvl3 },
      atributos: { fue, des, res, int, vol, vel },
      traits,
      weaknesses,
      skills,
      techniques: char.techniques || [],
      inventory
    });

  } catch (err) {
    console.error("Error al cargar la ficha:", err);
  }
}`}
                </pre>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
