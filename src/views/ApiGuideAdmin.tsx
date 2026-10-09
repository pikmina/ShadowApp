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

const FOROACTIVO_SCRIPT = `// ========================================================
// Script de consumo de API ShadowApp para Foroactivo / Drawer
// ========================================================

const API_BASE_URL = "https://app.oneforallrpg.org";

/**
 * Consulta la ficha del personaje en la API.
 * Admite 'Nombre Apellido', 'Apellido Nombre', solo 'Apellido', solo 'Nombre', o Alias.
 */
async function fetchCharacterSheet(characterIdentifier) {
  if (!characterIdentifier) {
    console.warn("No se especificó un nombre o identificador de personaje.");
    return;
  }

  try {
    const url = \`\${API_BASE_URL}/api/public/character/\${encodeURIComponent(characterIdentifier)}\`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`Personaje no encontrado (status \${res.status})\`);
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
    const fue = attrs.fue || prof.FUE || 0;
    const des = attrs.des || prof.DES || 0;
    const res = attrs.res || prof.RES || 0;
    const int = attrs.int || prof.INT || 0;
    const vol = attrs.vol || prof.VOL || 0;
    const vel = attrs.vel || prof.VEL || 0;

    // 4. Extraer Estadísticas Derivadas (Salud, Estamina, etc.)
    const saludMaxima = prof.salud_maxima ?? char.stats?.salud_maxima ?? (20 + res);
    const estaminaMaxima = prof.estamina_maxima ?? char.stats?.estamina_maxima ?? (20 + des);

    // ⚡ Inyectar directamente en los elementos del HTML del Drawer:
    const healthEl = document.getElementById("drawer-health");
    if (healthEl) healthEl.textContent = saludMaxima;

    const staminaEl = document.getElementById("drawer-stamina");
    if (staminaEl) staminaEl.textContent = estaminaMaxima;

    // 5. Filtrar Posesiones
    const possessions = char.possessions || [];
    const traits = possessions.filter(p => (p.element?.kind || p.kind) === 'trait');
    const weaknesses = possessions.filter(p => (p.element?.kind || p.kind) === 'weakness');
    const skills = possessions.filter(p => (p.element?.kind || p.kind) === 'skill');
    const inventory = possessions.filter(p => ['equipment', 'weapon', 'consumable'].includes(p.element?.kind || p.kind));

    // 6. Si tienes una función para renderizar el resto del Drawer:
    if (typeof renderDrawerModal === "function") {
      renderDrawerModal({
        nombreCompleto: \`\${nombre} \${apellido}\`.trim(),
        alias,
        faceclaim,
        avatar,
        salud: saludMaxima,
        estamina: estaminaMaxima,
        quirk: { name: quirkName, type: quirkType, level: quirkLevel, desc: quirkDesc, lvl1: quirkLvl1, lvl2: quirkLvl2, lvl3: quirkLvl3 },
        atributos: { fue, des, res, int, vol, vel },
        traits,
        weaknesses,
        skills,
        techniques: char.techniques || [],
        inventory
      });
    }

  } catch (err) {
    console.error("Error al cargar la ficha:", err);
  }
}

/**
 * Ejemplo de lectura automática desde tu Drawer HTML:
 * <span id="drawer-char-name">Izuku Midoriya</span>
 */
function openDrawerForCurrentElement() {
  const el = document.getElementById("drawer-char-name");
  if (!el) return;
  
  // Limpia posibles barras diagonales invertidas '\\' o espacios extras
  const rawText = el.textContent || "";
  const cleanName = rawText.replace(/^[\\\\/@#\\s]+/, "").trim();
  
  if (cleanName) {
    fetchCharacterSheet(cleanName);
  }
}`;

const FOROACTIVO_JQUERY_SCRIPT = `// ========================================================
// Script de integración Foroactivo (jQuery + API ShadowApp)
// ========================================================

jQuery(document).ready(function($) {
    var API_BASE_URL = "https://app.oneforallrpg.org";
    var characterCache = {}; // Caché en memoria para evitar llamadas redundantes

    // Función asíncrona para consultar la ficha en la API
    async function cargarFichaDesdeAPI(characterName) {
        if (!characterName) return;

        // Limpia posibles barras diagonales invertidas '\\' o espacios extras
        var cleanName = characterName.replace(/^[\\\\/@#\\s]+/, '').trim();
        if (!cleanName) return;

        // Colocar estado de carga temporal en los campos de RPG
        $('#drawer-health').text('...');
        $('#drawer-stamina').text('...');

        // Si ya lo tenemos en caché, renderizar de inmediato
        if (characterCache[cleanName]) {
            renderizarDatosRPG(characterCache[cleanName]);
            return;
        }

        try {
            var url = API_BASE_URL + "/api/public/character/" + encodeURIComponent(cleanName);
            var res = await fetch(url);
            if (!res.ok) throw new Error("Ficha no encontrada en la API");
            var char = await res.json();

            // Guardar en caché
            characterCache[cleanName] = char;
            renderizarDatosRPG(char);
        } catch (err) {
            console.warn("No se pudo cargar la ficha RPG para:", cleanName, err);
            $('#drawer-health').text('--');
            $('#drawer-stamina').text('--');
        }
    }

    // Inyección de estadísticas numéricas en el DOM del Drawer
    function renderizarDatosRPG(char) {
        var prof = char.profileData || {};
        var attrs = prof.atributos || {};
        var res = attrs.res || prof.RES || 0;
        var des = attrs.des || prof.DES || 0;

        // 1. Estadísticas Derivadas (Salud, Estamina)
        var saludMaxima = (prof.salud_maxima !== undefined) ? prof.salud_maxima : (char.stats && char.stats.salud_maxima ? char.stats.salud_maxima : (20 + res));
        var estaminaMaxima = (prof.estamina_maxima !== undefined) ? prof.estamina_maxima : (char.stats && char.stats.estamina_maxima ? char.stats.estamina_maxima : (20 + des));

        $('#drawer-health').text(saludMaxima);
        $('#drawer-stamina').text(estaminaMaxima);

        // 2. Defensas y derivados
        if ($('#drawer-evasion').length) $('#drawer-evasion').text(prof.evasion || (10 + (attrs.vel || 0)));
        if ($('#drawer-courage').length) $('#drawer-courage').text(prof.coraje || (10 + (attrs.vol || 0)));
        if ($('#drawer-initiative').length) $('#drawer-initiative').text(prof.iniciativa || 0);

        // 3. Atributos Primarios (si existen los contenedores en tu Drawer)
        if ($('#drawer-attr-fue').length) $('#drawer-attr-fue').text(attrs.fue || prof.FUE || 0);
        if ($('#drawer-attr-des').length) $('#drawer-attr-des').text(attrs.des || prof.DES || 0);
        if ($('#drawer-attr-res').length) $('#drawer-attr-res').text(res);
        if ($('#drawer-attr-int').length) $('#drawer-attr-int').text(attrs.int || prof.INT || 0);
        if ($('#drawer-attr-vol').length) $('#drawer-attr-vol').text(attrs.vol || prof.VOL || 0);
        if ($('#drawer-attr-vel').length) $('#drawer-attr-vel').text(attrs.vel || prof.VEL || 0);

        // 4. Quirk Modular Avanzado (si deseas mostrar nivel y tipo)
        if (prof.quirk_level && $('#drawer-char-quirk-level').length) {
            $('#drawer-char-quirk-level').text(prof.quirk_level);
        }
    }

    function cargarDatosEnDrawer(postId) {
        var numericId = postId.replace('p', '');
        var $postContainer = $('#' + postId).closest('.post-bigwrap'); // Busca el contenedor con los colores
        var $profile = $('#profile' + numericId);

        // 1. EXTRAER Y APLICAR COLORES DEL GRUPO AL DRAWER
        var groupStyle = $postContainer.attr('style'); 
        if (groupStyle) {
            // Hereda directamente las variables --graccent1 y --graccent2
            $('#shadow-drawer').attr('style', groupStyle);
        }

        if ($profile.length > 0) {
            var name = $profile.find('.profile-name').text();
            var avatar = $profile.find('.profile-avatar').text();
            var quirk = $profile.find('.profile-quirk').text();
            var stats = $profile.find('.profile-stats').text();

            // Inyección en el DOM estático del Drawer
            $('#drawer-char-name').text(name);
            $('#drawer-char-title').text(name);
            $('#drawer-char-avatar').attr('src', avatar).attr('alt', name);
            $('#drawer-char-quirk').text(quirk);
            $('#drawer-char-stats').html(stats.replace(/\\|/g, '<br>'));

            // Clonar enlaces de contacto
            var $linksContainer = $('#drawer-char-links').empty();
            var $contactLinks = $postContainer.find('.user-mycontact').clone();

            $contactLinks.find('a').each(function() {
                var href = $(this).attr('href');
                var title = $(this).attr('title') || 'Enlace';
                var iconClass = $(this).find('i').attr('class') || 'fa-solid fa-link';

                $('<a></a>')
                    .attr('href', href)
                    .attr('target', '_blank')
                    .append($('<i></i>').addClass(iconClass))
                    .append(' ' + title)
                    .appendTo($linksContainer);
            });

            // ⚡ 2. CONSULTAR Y CARGAR FICHA RPG DESDE LA API SHADOWAPP
            cargarFichaDesdeAPI(name);
        }
    }

    $(document).on('click', '.open-shadow-drawer', function(e) {
        e.preventDefault();
        var postId = $(this).attr('data-post-id');
        cargarDatosEnDrawer(postId);
    });

    var primerPostId = $('.open-shadow-drawer').first().attr('data-post-id');
    if (primerPostId) {
        cargarDatosEnDrawer(primerPostId);
    }
});`;

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
                Copia este script e insértalo en la <strong>Gestión de Códigos JavaScript</strong> de Foroactivo o pruébalo localmente.
                El endpoint <code>/api/public/character/:identificador</code> resuelve automáticamente nombres como <strong>"Izuku Midoriya"</strong>, <strong>"Midoriya Izuku"</strong>, solo apellido <strong>"Midoriya"</strong>, solo nombre <strong>"Izuku"</strong>, o su alias <strong>"Deku"</strong> (insensible a orden, mayúsculas o tildes).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Script 1: jQuery Foroactivo Drawer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">1. jQuery (Foroactivo + Drawer Integrado):</span>
                    <p className="text-[11px] text-muted-foreground">Inyecta colores, avatar, enlaces y consulta la API para rellenar Salud, Estamina y Atributos automáticamente.</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(FOROACTIVO_JQUERY_SCRIPT, 'jQuery Drawer Script')}
                    className="text-xs h-7"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar jQuery
                  </Button>
                </div>
                
                <pre className="text-xs text-muted-foreground overflow-x-auto p-4 bg-black/70 border border-border/80 rounded-lg font-mono leading-relaxed max-h-[400px]">
{FOROACTIVO_JQUERY_SCRIPT}
                </pre>
              </div>

              {/* Script 2: Vanilla ES6 */}
              <div className="space-y-2 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">2. JavaScript (ES6 / Vanilla Modular):</span>
                    <p className="text-[11px] text-muted-foreground">Función pura async/await sin dependencias de jQuery para cualquier framework o modal.</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(FOROACTIVO_SCRIPT, 'Vanilla Script')}
                    className="text-xs h-7"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Vanilla
                  </Button>
                </div>
                
                <pre className="text-xs text-muted-foreground overflow-x-auto p-4 bg-black/70 border border-border/80 rounded-lg font-mono leading-relaxed max-h-[400px]">
{FOROACTIVO_SCRIPT}
                </pre>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
