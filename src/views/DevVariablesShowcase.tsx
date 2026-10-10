import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { 
  FileText, 
  Database, 
  Code, 
  BookOpen, 
  User, 
  Zap, 
  Shield, 
  Swords, 
  Coins, 
  School, 
  Copy, 
  Check, 
  Search, 
  Sparkles, 
  Layers,
  Heart,
  AlertTriangle,
  Briefcase,
  Award,
  PackageCheck,
  Flame,
  Wrench
} from 'lucide-react';
import { SectionHeader } from '../components/common/SectionHeader';
import { toast } from 'sonner';

interface VariableDef {
  key: string;
  name: string;
  type: string;
  desc: string;
  aliases: string[];
  example: string;
  category: 'identidad' | 'demografia' | 'grupo' | 'quirk' | 'atributos' | 'derivados' | 'rasgos' | 'debilidades' | 'habilidades' | 'tecnicas' | 'inventario' | 'licencias' | 'economia';
}

const VARIABLES_CATALOG: VariableDef[] = [
  // 1. Identidad
  {
    key: 'basic_name',
    name: 'Nombre del Personaje',
    type: 'Texto Corto',
    desc: 'Nombre de pila o principal del personaje.',
    aliases: ['name', 'nombre', 'basic_name'],
    example: '"Izuku"',
    category: 'identidad'
  },
  {
    key: 'last_name',
    name: 'Apellido',
    type: 'Texto Corto',
    desc: 'Apellido o nombre de familia.',
    aliases: ['lastName', 'apellido', 'apellidos'],
    example: '"Midoriya"',
    category: 'identidad'
  },
  {
    key: 'alias',
    name: 'Apodo / Nombre de Héroe / Villano',
    type: 'Texto Corto',
    desc: 'Alias oficial, nombre heroico o villanesco.',
    aliases: ['alias', 'apodo', 'hero_name', 'nickname'],
    example: '"Deku"',
    category: 'identidad'
  },
  {
    key: 'faceclaim',
    name: 'Faceclaim / PB (Picture Base)',
    type: 'Texto Corto',
    desc: 'Personaje original, actor o modelo utilizado para la apariencia.',
    aliases: ['faceclaim', 'pb', 'faceclaim_pb'],
    example: '"Izuku Midoriya (My Hero Academia)"',
    category: 'identidad'
  },
  {
    key: 'avatar_url',
    name: 'Enlace al Avatar',
    type: 'URL / Imagen',
    desc: 'Enlace directo (HTTPS) a la imagen de perfil/retrato.',
    aliases: ['avatar_url', 'avatarUrl', 'avatar', 'imagen', 'image'],
    example: '"https://i.imgur.com/example.png"',
    category: 'identidad'
  },

  // 2. Demografía y Estado
  {
    key: 'birth_date',
    name: 'Fecha de Nacimiento',
    type: 'Fecha (YYYY-MM-DD)',
    desc: 'Fecha de nacimiento del personaje.',
    aliases: ['birth_date', 'fecha_nacimiento', 'nacimiento'],
    example: '"2008-07-15"',
    category: 'demografia'
  },
  {
    key: 'basic_age',
    name: 'Edad',
    type: 'Número',
    desc: 'Edad cronológica calculada automáticamente según la fecha del foro.',
    aliases: ['basic_age', 'edad', 'age'],
    example: '16',
    category: 'demografia'
  },
  {
    key: 'gender',
    name: 'Género',
    type: 'Selector',
    desc: 'Género o identidad del personaje.',
    aliases: ['gender', 'genero', 'sexo'],
    example: '"Masculino"',
    category: 'demografia'
  },
  {
    key: 'nationality',
    name: 'Nacionalidad',
    type: 'Texto Corto',
    desc: 'País de origen o procedencia.',
    aliases: ['nationality', 'nacionalidad', 'pais'],
    example: '"Japonesa"',
    category: 'demografia'
  },
  {
    key: 'basic_blood_type',
    name: 'Grupo Sanguíneo',
    type: 'Selector',
    desc: 'Tipo de sangre (O+, O-, A+, A-, B+, B-, AB+, AB-).',
    aliases: ['basic_blood_type', 'tipo_de_sangre', 'grupo_sanguineo', 'sangre'],
    example: '"O+"',
    category: 'demografia'
  },
  {
    key: 'basic_alignment',
    name: 'Alineación',
    type: 'Selector',
    desc: 'Tendencia moral (Heróica, Legal, Neutral, Caótica, Villanezca).',
    aliases: ['basic_alignment', 'alignment', 'alineacion', 'alineamiento'],
    example: '"Heróica"',
    category: 'demografia'
  },

  // 3. Grupo, Facción y Matrícula
  {
    key: 'faction_group',
    name: 'Facción / Grupo',
    type: 'Selector',
    desc: 'Organización o rol principal (Héroes, Villanos, Estudiantes, Civiles, Vigilantes).',
    aliases: ['faction_group', 'faccion', 'grupo', 'afiliacion'],
    example: '"Estudiante"',
    category: 'grupo'
  },
  {
    key: 'status',
    name: 'Estado del Personaje',
    type: 'Selector / Texto',
    desc: 'Situación actual del personaje (Activo, Retirado, Desaparecido, Fallecido).',
    aliases: ['status', 'estado', 'estatus'],
    example: '"Activo"',
    category: 'grupo'
  },
  {
    key: 'enrollment.school.name',
    name: 'Escuela / Academia',
    type: 'Relacional',
    desc: 'Academia asignada al estudiante (ej: Academia U.A., Shiketsu).',
    aliases: ['school', 'escuela', 'academia', 'schoolName'],
    example: '"Academia U.A."',
    category: 'grupo'
  },
  {
    key: 'enrollment.academicYear.name',
    name: 'Curso Académico',
    type: 'Relacional',
    desc: 'Especialidad académica (Curso de Héroes, Estudios Generales, Soporte, Gestión).',
    aliases: ['academic_year', 'curso', 'especialidad', 'courseName'],
    example: '"Curso de Héroes"',
    category: 'grupo'
  },
  {
    key: 'enrollment.classGroup.name',
    name: 'Aula / Sección',
    type: 'Relacional',
    desc: 'Aula o sección asignada al estudiante.',
    aliases: ['class_group', 'aula', 'clase', 'seccion', 'className'],
    example: '"Clase 1-A"',
    category: 'grupo'
  },
  {
    key: 'employments',
    name: 'Empleos y Cargos',
    type: 'Array de Objetos',
    desc: 'Lista de ocupaciones, agencias u organizaciones, puesto y compensación (¥/mes).',
    aliases: ['employments', 'empleos', 'ocupaciones', 'trabajo'],
    example: '[{"workplace": "Agencia Endeavor", "position": "Pasante", "salary": 25000}]',
    category: 'grupo'
  },

  // 4. Quirk / Poder
  {
    key: 'quirk_name',
    name: 'Nombre del Quirk / Don',
    type: 'Texto Corto',
    desc: 'Nombre oficial o popular del Don / Quirk.',
    aliases: ['quirk_name', 'don_name', 'don', 'quirk'],
    example: '"One For All"',
    category: 'quirk'
  },
  {
    key: 'quirk_type',
    name: 'Tipo de Quirk',
    type: 'Selector',
    desc: 'Clasificación biológica (Emisor, Mutante, Transformador, Sin quirk).',
    aliases: ['quirk_type', 'tipo_de_quirk', 'tipo_quirk', 'tipo_don'],
    example: '"Emisor"',
    category: 'quirk'
  },
  {
    key: 'quirk_level',
    name: 'Nivel Activo de Quirk',
    type: 'Selector',
    desc: 'Fase de dominio desbloqueada (Nivel 1. Despertar, Nivel 2. Dominio, Nivel 3. Trascendencia).',
    aliases: ['quirk_level', 'quirk_evolution', 'quirkEvolution', 'nivel_de_quirk'],
    example: '"Nivel 2. Dominio"',
    category: 'quirk'
  },
  {
    key: 'quirk_description',
    name: 'Descripción General del Quirk',
    type: 'Texto Largo',
    desc: 'Explicación del funcionamiento, origen y límites generales del poder.',
    aliases: ['quirk_description', 'quirk_desc', 'descripcion_quirk'],
    example: '"Acumulación y liberación concentrada de energía bio-cinética..."',
    category: 'quirk'
  },
  {
    key: 'quirk_lvl1',
    name: 'Quirk: Nivel 1 (Despertar)',
    type: 'Texto Largo',
    desc: 'Manifestación básica y efectos iniciales del poder.',
    aliases: ['quirk_lvl1', 'quirk_despertar', 'nivel_1'],
    example: '"Control al 5%: Mejora de velocidad e impacto moderado..."',
    category: 'quirk'
  },
  {
    key: 'quirk_lvl2',
    name: 'Quirk: Nivel 2 (Dominio)',
    type: 'Texto Largo',
    desc: 'Control avanzado, canalización eficiente y menor desgaste de estamina.',
    aliases: ['quirk_lvl2', 'quirk_dominio', 'nivel_2'],
    example: '"Control al 20% (Full Cowl): Movilidad aérea y ondas de choque..."',
    category: 'quirk'
  },
  {
    key: 'quirk_lvl3',
    name: 'Quirk: Nivel 3 (Trascendencia)',
    type: 'Texto Largo',
    desc: 'Máxima expresión, despertar completo o liberación de habilidades latentes.',
    aliases: ['quirk_lvl3', 'quirk_trascendencia', 'nivel_3'],
    example: '"Control al 100%: Liberación total de fuerza y factores hereditarios..."',
    category: 'quirk'
  },

  // 5. Atributos Primarios
  {
    key: 'atributos.fue',
    name: 'Fuerza (FUE)',
    type: 'Número (0-10)',
    desc: 'Capacidad muscular, levantamiento, potencia física y daño cuerpo a cuerpo.',
    aliases: ['fue', 'fuerza', 'str'],
    example: '5',
    category: 'atributos'
  },
  {
    key: 'atributos.des',
    name: 'Destreza (DES)',
    type: 'Número (0-10)',
    desc: 'Puntería, agilidad manual, precisión en armas y reflejos coordinados.',
    aliases: ['des', 'destreza', 'dex'],
    example: '4',
    category: 'atributos'
  },
  {
    key: 'atributos.res',
    name: 'Resistencia (RES)',
    type: 'Número (0-10)',
    desc: 'Tolerancia al daño físico, solidez corporal, fatiga y salud vital.',
    aliases: ['res', 'resistencia', 'con'],
    example: '6',
    category: 'atributos'
  },
  {
    key: 'atributos.int',
    name: 'Inteligencia (INT)',
    type: 'Número (0-10)',
    desc: 'Capacidad de deducción, memoria, táctica, tecnología e iniciativa.',
    aliases: ['int', 'inteligencia'],
    example: '7',
    category: 'atributos'
  },
  {
    key: 'atributos.vol',
    name: 'Voluntad (VOL)',
    type: 'Número (0-10)',
    desc: 'Fuerza mental, entereza, coraje psicológico y control del Quirk.',
    aliases: ['vol', 'voluntad', 'wis', 'wil'],
    example: '6',
    category: 'atributos'
  },
  {
    key: 'atributos.vel',
    name: 'Velocidad (VEL)',
    type: 'Número (0-10)',
    desc: 'Desplazamiento por turno, aceleración física y evasión de ataques.',
    aliases: ['vel', 'velocidad', 'spd'],
    example: '5',
    category: 'atributos'
  },

  // 6. Atributos Derivados
  {
    key: 'derived.salud',
    name: 'Salud Máxima (SA)',
    type: 'Fórmula: Salud Base + RES',
    desc: 'Puntos de vida vitales. A 0 SA el personaje cae inconsciente; a -10 SA muere.',
    aliases: ['salud', 'sa', 'hp', 'salud_maxima'],
    example: '26',
    category: 'derivados'
  },
  {
    key: 'derived.estamina',
    name: 'Estamina Máxima (ES)',
    type: 'Fórmula: Salud Base + DES',
    desc: 'Energía para ejecutar técnicas, maniobras y Don. Gastar 2 ES recupera 3 SA.',
    aliases: ['estamina', 'es', 'sp', 'estamina_maxima'],
    example: '24',
    category: 'derivados'
  },
  {
    key: 'derived.evasion',
    name: 'Evasión (EVA)',
    type: 'Fórmula: 10 + VEL',
    desc: 'Dificultad base (RD) que un rival debe superar para impactar con ataque físico.',
    aliases: ['evasion', 'eva'],
    example: '15',
    category: 'derivados'
  },
  {
    key: 'derived.coraje',
    name: 'Coraje (COR)',
    type: 'Fórmula: 10 + VOL',
    desc: 'Dificultad base (RD) para resistir intimidación, miedo o efectos mentales.',
    aliases: ['coraje', 'cor'],
    example: '16',
    category: 'derivados'
  },
  {
    key: 'derived.modFue',
    name: 'Modificador de FUE',
    type: 'Fórmula: Floor(FUE / 2)',
    desc: 'Bono numérico aplicado a tiradas pesadas y daño cuerpo a cuerpo.',
    aliases: ['modFue', 'mod_fue'],
    example: '+2',
    category: 'derivados'
  },
  {
    key: 'derived.modDes',
    name: 'Modificador de DES',
    type: 'Fórmula: Floor(DES / 2)',
    desc: 'Bono numérico aplicado a ataques a distancia y habilidades manuales.',
    aliases: ['modDes', 'mod_des'],
    example: '+2',
    category: 'derivados'
  },
  {
    key: 'derived.dañoFisico',
    name: 'Daño Físico (DF)',
    type: 'Fórmula: Dado Etapa + Mod FUE',
    desc: 'Fórmula de daño en combate cuerpo a cuerpo.',
    aliases: ['dañoFisico', 'daño_fisico', 'df'],
    example: '"1D8 + 2"',
    category: 'derivados'
  },
  {
    key: 'derived.dañoRango',
    name: 'Daño a Rango (DR)',
    type: 'Fórmula: Dado Etapa + Mod DES',
    desc: 'Fórmula de daño en ataques a distancia o proyectiles.',
    aliases: ['dañoRango', 'daño_rango', 'dr'],
    example: '"1D8 + 2"',
    category: 'derivados'
  },
  {
    key: 'derived.iniciativa',
    name: 'Iniciativa (INI)',
    type: 'Fórmula: Floor((INT+VEL)/2) / 2',
    desc: 'Velocidad de reacción al iniciar el combate y orden de turnos.',
    aliases: ['iniciativa', 'ini'],
    example: '+3',
    category: 'derivados'
  },
  {
    key: 'derived.reduccionDano',
    name: 'Reducción de Daño (RD)',
    type: 'Número',
    desc: 'Absorción fija otorgada por armaduras o efectos pasivos.',
    aliases: ['reduccionDano', 'reduccion_dano', 'rd'],
    example: '0',
    category: 'derivados'
  },

  // 7. Rasgos (Traits)
  {
    key: 'traits',
    name: 'Rasgos (Ventajas y Talentos)',
    type: 'Array de Elementos',
    desc: 'Ventajas pasivas, talentos innatos o particularidades biológicas/sociales.',
    aliases: ['traits', 'rasgos', 'talentos'],
    example: '[{"name": "Determinación Inquebrantable", "description": "+1 a COR..."}]',
    category: 'rasgos'
  },

  // 8. Debilidades (Weaknesses)
  {
    key: 'weaknesses',
    name: 'Debilidades y Limitaciones',
    type: 'Array de Elementos',
    desc: 'Vulnerabilidades, secuelas físicas o condiciones psicológicas que penalizan al personaje.',
    aliases: ['weaknesses', 'debilidades', 'limitaciones'],
    example: '[{"name": "Sobrecarga Muscular", "description": "Gasta +1 ES al usar 100%..."}]',
    category: 'debilidades'
  },

  // 9. Habilidades (Skills)
  {
    key: 'skills',
    name: 'Habilidades Entrenables',
    type: 'Array con Niveles (1-5)',
    desc: 'Capacidades técnicas y conocimientos entrenables (ej: Artes Marciales, Primeros Auxilios, Hackeo, Sigilo).',
    aliases: ['skills', 'habilidades', 'talentos_entrenables'],
    example: '[{"name": "Artes Marciales", "level": 3, "description": "+3 a DF..."}]',
    category: 'habilidades'
  },

  // 10. Técnicas de Combate (Techniques)
  {
    key: 'techniques',
    name: 'Técnicas de Combate',
    type: 'Array de Técnicas',
    desc: 'Movimientos especiales, superataques y maniobras tácticas con Coste de Estamina (CE), clasificación y efectos.',
    aliases: ['techniques', 'tecnicas', 'ataques_especiales'],
    example: '[{"name": "Detroit Smash", "classification": "Ofensiva", "staminaCost": 4, "description": "Impacto devastador..."}]',
    category: 'tecnicas'
  },

  // 11. Inventario & Equipamiento
  {
    key: 'possessions.equipment',
    name: 'Inventario y Equipamiento',
    type: 'Array de Posesiones',
    desc: 'Armas, trajes de héroe/villano, consumibles, munición y dispositivos con cantidad y estado de equipado.',
    aliases: ['inventory', 'inventario', 'equipamiento', 'objetos', 'armas'],
    example: '[{"name": "Guantes de Fuerza", "quantity": 1, "equipped": true, "kind": "equipment"}]',
    category: 'inventario'
  },

  // 12. Licencias, Permisos y Credenciales
  {
    key: 'possessions.credentials',
    name: 'Licencias, Permisos y Recursos',
    type: 'Array de Credenciales',
    desc: 'Licencia Provisional de Héroe, Permiso de Portación de Apoyo, Certificación Médica, Fondos o Contactos Clandestinos.',
    aliases: ['credentials', 'licencias', 'permisos', 'certificaciones'],
    example: '[{"name": "Licencia Provisional de Héroe", "kind": "license"}]',
    category: 'licencias'
  },

  // 13. Economía y Progresión
  {
    key: 'exp',
    name: 'Puntos de Experiencia (EXP)',
    type: 'Número',
    desc: 'Puntos acumulados para subir atributos, comprar habilidades y evolucionar técnicas.',
    aliases: ['exp', 'experiencia'],
    example: '150',
    category: 'economia'
  },
  {
    key: 'yen',
    name: 'Yenes (¥)',
    type: 'Número',
    desc: 'Moneda oficial para compras en el Shop, equipo y servicios.',
    aliases: ['yen', 'yenes', 'dinero'],
    example: '45000',
    category: 'economia'
  },
  {
    key: 'stage',
    name: 'Etapa / Rango del Personaje',
    type: 'Texto',
    desc: 'Nivel de rango y madurez en el sistema (Novato, Promesa, Élite, Leyenda).',
    aliases: ['stage', 'etapa', 'basic_stage'],
    example: '"Novato"',
    category: 'economia'
  }
];

export default function DevVariablesShowcase() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success(`Copiado: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredVars = VARIABLES_CATALOG.filter(v => {
    const matchesSearch = 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <SectionHeader 
        title="Guía de Variables del Sistema" 
        description="Referencia rápida y exhaustiva de todas las variables, objetos y relaciones del personaje (Identidad, Quirk, Atributos, Rasgos, Debilidades, Habilidades, Técnicas, Inventario y Licencias)."
        icon={BookOpen}
      />

      {/* Selector de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card/60 p-4 border border-border/80 rounded-xl backdrop-blur-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar variable (ej. Quirk, Técnicas, FUE, Rasgos, Licencias)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'identidad', label: 'Identidad' },
            { id: 'demografia', label: 'Demografía' },
            { id: 'grupo', label: 'Grupo / Rol' },
            { id: 'quirk', label: 'Quirk' },
            { id: 'atributos', label: 'Atributos' },
            { id: 'derivados', label: 'Derivados' },
            { id: 'rasgos', label: 'Rasgos' },
            { id: 'debilidades', label: 'Debilidades' },
            { id: 'habilidades', label: 'Habilidades' },
            { id: 'tecnicas', label: 'Técnicas' },
            { id: 'inventario', label: 'Inventario' },
            { id: 'licencias', label: 'Licencias' },
            { id: 'economia', label: 'Economía' }
          ].map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="text-xs h-8"
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="dictionary" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="dictionary" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Diccionario de Variables
          </TabsTrigger>
          <TabsTrigger value="quick-cards" className="flex items-center gap-2">
            <Layers className="w-4 h-4" /> Resumen por Categorías
          </TabsTrigger>
          <TabsTrigger value="api-json" className="flex items-center gap-2">
            <Code className="w-4 h-4" /> Consumo API JSON
          </TabsTrigger>
          <TabsTrigger value="foroactivo" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Integración Foroactivo
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: DICCIONARIO DE VARIABLES (TABLA) ================= */}
        <TabsContent value="dictionary" className="space-y-4">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-xl flex items-center justify-between">
                <span>Variables y Objetos del Personaje ({filteredVars.length})</span>
                <Badge variant="outline" className="font-mono text-xs">
                  SISTEMA 4.1.2 CANÓNICO
                </Badge>
              </CardTitle>
              <CardDescription>
                Haz clic en cualquier clave o alias para copiarlo al portapapeles y utilizarlo directamente en tus plantillas o scripts de Foroactivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[200px]">Campo / Variable</TableHead>
                      <TableHead className="w-[180px]">Clave Canónica (JSON)</TableHead>
                      <TableHead className="w-[140px]">Tipo de Dato</TableHead>
                      <TableHead className="w-[160px]">Aliases Admitidos</TableHead>
                      <TableHead>Descripción y Fórmulas</TableHead>
                      <TableHead className="w-[120px] text-right">Ejemplo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVars.map((v) => (
                      <TableRow key={v.key} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          {v.name}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => copyToClipboard(v.key)}
                            className="flex items-center gap-1.5 font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                            title="Copiar clave"
                          >
                            {v.key}
                            {copiedKey === v.key ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-60" />}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {v.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {v.aliases.map(a => (
                              <button
                                key={a}
                                onClick={() => copyToClipboard(a)}
                                className="font-mono text-[10px] text-muted-foreground bg-muted hover:bg-accent px-1.5 py-0.5 rounded transition-colors"
                                title="Copiar alias"
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {v.desc}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right text-emerald-400">
                          {v.example}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredVars.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No se encontraron variables con el término de búsqueda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: RESUMEN VISUAL POR CATEGORÍAS ================= */}
        <TabsContent value="quick-cards" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. IDENTIDAD & DEMOGRAFÍA */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-cyan-400">
                  <User className="w-4 h-4" /> 1. Identidad y Datos Básicos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <p className="text-muted-foreground">Datos personales principales del personaje:</p>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Nombre Completo</span>
                    <strong className="text-foreground">basic_name + last_name</strong>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Alias / Nombre Heroico</span>
                    <strong className="text-foreground">alias</strong>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Faceclaim (PB)</span>
                    <strong className="text-foreground">faceclaim</strong>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Avatar (URL)</span>
                    <strong className="text-foreground">avatar_url</strong>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Edad / Cumpleaños</span>
                    <strong className="text-foreground">basic_age / birth_date</strong>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-muted-foreground block text-[10px]">Sangre y Moral</span>
                    <strong className="text-foreground">basic_blood_type / basic_alignment</strong>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. QUIRK Y DON */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-400">
                  <Zap className="w-4 h-4" /> 2. Quirk / Don (Estructura Modular)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <p className="text-muted-foreground">El Quirk está compuesto por el nombre, tipo, nivel activo y redacción por fases:</p>
                <div className="space-y-2 font-mono">
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-foreground">quirk_name</span>
                    <Badge variant="outline" className="text-[10px]">Texto Corto (Nombre)</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-foreground">quirk_type</span>
                    <span className="text-muted-foreground">Emisor | Mutante | Transformador</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/30 rounded border border-border/50">
                    <span className="text-foreground">quirk_level</span>
                    <span className="text-muted-foreground">Nivel 1 | Nivel 2 | Nivel 3</span>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50 space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase">Niveles de Redacción:</div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] text-center">
                      <span className="bg-black/30 p-1 rounded">quirk_lvl1 (Despertar)</span>
                      <span className="bg-black/30 p-1 rounded">quirk_lvl2 (Dominio)</span>
                      <span className="bg-black/30 p-1 rounded">quirk_lvl3 (Trascendencia)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. ATRIBUTOS Y DERIVADOS */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
                  <Shield className="w-4 h-4" /> 3. Atributos y Estadísticas Derivadas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="p-2 bg-red-950/20 border border-red-800/30 rounded">
                    <strong className="text-red-400 block text-sm">FUE</strong>
                    <span className="text-muted-foreground text-[10px]">Fuerza</span>
                  </div>
                  <div className="p-2 bg-amber-950/20 border border-amber-800/30 rounded">
                    <strong className="text-amber-400 block text-sm">DES</strong>
                    <span className="text-muted-foreground text-[10px]">Destreza</span>
                  </div>
                  <div className="p-2 bg-emerald-950/20 border border-emerald-800/30 rounded">
                    <strong className="text-emerald-400 block text-sm">RES</strong>
                    <span className="text-muted-foreground text-[10px]">Resistencia</span>
                  </div>
                  <div className="p-2 bg-blue-950/20 border border-blue-800/30 rounded">
                    <strong className="text-blue-400 block text-sm">INT</strong>
                    <span className="text-muted-foreground text-[10px]">Inteligencia</span>
                  </div>
                  <div className="p-2 bg-purple-950/20 border border-purple-800/30 rounded">
                    <strong className="text-purple-400 block text-sm">VOL</strong>
                    <span className="text-muted-foreground text-[10px]">Voluntad</span>
                  </div>
                  <div className="p-2 bg-cyan-950/20 border border-cyan-800/30 rounded">
                    <strong className="text-cyan-400 block text-sm">VEL</strong>
                    <span className="text-muted-foreground text-[10px]">Velocidad</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono pt-2 border-t border-border/50">
                  <div className="p-1.5 bg-muted/30 rounded"><strong className="text-emerald-400">SA:</strong> Base + RES</div>
                  <div className="p-1.5 bg-muted/30 rounded"><strong className="text-cyan-400">ES:</strong> Base + DES</div>
                  <div className="p-1.5 bg-muted/30 rounded"><strong className="text-amber-400">EVA:</strong> 10 + VEL</div>
                  <div className="p-1.5 bg-muted/30 rounded"><strong className="text-purple-400">COR:</strong> 10 + VOL</div>
                </div>
              </CardContent>
            </Card>

            {/* 4. RASGOS & DEBILIDADES */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-400">
                  <Heart className="w-4 h-4 text-emerald-400" />
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  4. Rasgos y Debilidades
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <p className="text-muted-foreground">Efectos pasivos, ventajas y limitaciones innatas:</p>
                <div className="space-y-2 font-mono">
                  <div className="p-2 bg-emerald-950/20 border border-emerald-800/30 rounded">
                    <div className="flex justify-between text-emerald-400 font-bold mb-1">
                      <span>traits (Rasgos)</span>
                      <Badge variant="outline" className="text-[10px] border-emerald-700">Ventajas</Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px] block">
                      Lista de ventajas como Reflejos Felinos, Voluntad Indomable, etc.
                    </span>
                  </div>
                  <div className="p-2 bg-rose-950/20 border border-rose-800/30 rounded">
                    <div className="flex justify-between text-rose-400 font-bold mb-1">
                      <span>weaknesses (Debilidades)</span>
                      <Badge variant="outline" className="text-[10px] border-rose-700">Limitaciones</Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px] block">
                      Vulnerabilidades como Fatiga Térmica, Miopía, Dependencia de Objetos, etc.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. HABILIDADES Y TÉCNICAS */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-400">
                  <Swords className="w-4 h-4" /> 5. Habilidades y Técnicas de Combate
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="space-y-2 font-mono">
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <div className="flex justify-between text-indigo-300 font-bold mb-1">
                      <span>skills (Habilidades)</span>
                      <span className="text-muted-foreground text-[10px]">Nivel 1 al 5</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Habilidades entrenadas: Artes Marciales (Nvl 3), Sigilo (Nvl 2), Primeros Auxilios (Nvl 1).
                    </p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <div className="flex justify-between text-indigo-300 font-bold mb-1">
                      <span>techniques (Técnicas)</span>
                      <span className="text-amber-400 text-[10px]">CE: Coste de Estamina</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Movimientos con clasificación (Ofensiva, Defensiva, Soporte, Transformación), CE y efectos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. INVENTARIO & LICENCIAS */}
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-teal-400">
                  <PackageCheck className="w-4 h-4" /> 6. Inventario, Equipo y Licencias
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="space-y-2 font-mono">
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <div className="flex justify-between text-teal-300 font-bold mb-1">
                      <span>possessions (Equipo / Inventario)</span>
                      <Badge variant="outline" className="text-[10px]">Armas / Objetos</Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Objetos físicos con cantidad (`quantity`), estado equipado (`equipped: true/false`) y notas.
                    </p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded border border-border/50">
                    <div className="flex justify-between text-teal-300 font-bold mb-1">
                      <span>credentials (Licencias / Permisos)</span>
                      <Badge variant="outline" className="text-[10px]">Documentación</Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Licencia de Héroe, Permiso de Agencias, Autorizaciones especiales y Contactos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ================= TAB 3: CONSUMO API JSON ================= */}
        <TabsContent value="api-json" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Endpoints Públicos de la API</CardTitle>
              <CardDescription>
                Endpoints REST disponibles para consultar personajes por ID numérico o nombre.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-mono">GET</Badge>
                  <code className="text-xs font-mono bg-muted p-1.5 rounded flex-1">/api/public/character/:id_o_nombre</code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Devuelve el objeto completo del personaje con todos sus datos normalizados: perfil, atributos, técnicas, habilidades, rasgos, inventario y licencias.
                </p>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Estructura Completa del Objeto JSON Devuelto:
                </h4>
                <pre className="text-xs text-muted-foreground overflow-x-auto p-3 bg-black/60 rounded font-mono leading-relaxed">
{`{
  "id": 2574,
  "name": "Izuku",
  "playerId": 12,
  "active": true,
  "exp": 150,
  "yen": 50000,
  "profileData": {
    "basic_name": "Izuku",
    "last_name": "Midoriya",
    "alias": "Deku",
    "faceclaim": "Izuku Midoriya (MHA)",
    "avatar_url": "https://i.imgur.com/example.png",
    "birth_date": "2008-07-15",
    "basic_age": 16,
    "basic_blood_type": "O+",
    "basic_alignment": "Heróica",
    "nationality": "Japonesa",
    "faction_group": "Estudiante",
    "status": "Activo",
    
    // ⚡ Quirk
    "quirk_name": "One For All",
    "quirk_type": "Emisor",
    "quirk_level": "Nivel 2. Dominio",
    "quirk_description": "Acumulación y liberación de poder físico.",
    "quirk_lvl1": "Control al 5%...",
    "quirk_lvl2": "Control al 20%...",
    "quirk_lvl3": "Control al 100%...",

    // 🛡️ Atributos Primarios
    "atributos": {
      "fue": 5,
      "des": 4,
      "res": 6,
      "int": 7,
      "vol": 6,
      "vel": 5
    }
  },
  
  // 🥋 Técnicas de Combate
  "techniques": [
    {
      "id": "tech-01",
      "name": "Detroit Smash",
      "classification": "Ofensiva",
      "staminaCost": 4,
      "description": "Golpe de aire comprimido a gran potencia."
    }
  ],

  // 🎒 Inventario, Equipo y Licencias (Possessions)
  "possessions": [
    {
      "id": "pos-01",
      "quantity": 1,
      "equipped": true,
      "notes": "Reforzados para absorber impacto",
      "element": {
        "id": "item-01",
        "name": "Guantes de Fuerza",
        "kind": "equipment",
        "description": "Equipo de soporte de fibra de carbono."
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
        "description": "Permiso estatal para rescates y combate de emergencia."
      }
    },
    {
      "id": "pos-03",
      "quantity": 3,
      "element": {
        "id": "skill-01",
        "name": "Artes Marciales",
        "kind": "skill",
        "description": "Nivel 3 en combate cuerpo a cuerpo."
      }
    },
    {
      "id": "pos-04",
      "element": {
        "id": "trait-01",
        "name": "Voluntad Inquebrantable",
        "kind": "trait",
        "description": "+2 a tiradas de Coraje."
      }
    },
    {
      "id": "pos-05",
      "element": {
        "id": "weakness-01",
        "name": "Auto-daño por Sobrecarga",
        "kind": "weakness",
        "description": "Sufre daño si supera su límite de Estamina."
      }
    }
  ],

  // 🏢 Empleos y Agencias
  "employments": [
    {
      "id": 1,
      "workplace": "Agencia Endeavor",
      "position": "Pasante Heroico",
      "salary": 25000
    }
  ],

  // 🎓 Matrícula Académica (si es estudiante)
  "enrollment": {
    "school": { "name": "Academia U.A." },
    "academicYear": { "name": "Curso de Héroes" },
    "classGroup": { "name": "Clase 1-A" }
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 4: INTEGRACIÓN FOROACTIVO ================= */}
        <TabsContent value="foroactivo" className="space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Cómo integrar en Foroactivo (Modal / Drawer de Perfil)
              </CardTitle>
              <CardDescription>
                Estrategia recomendada para consumir la API y renderizar Técnicas, Habilidades, Equipo, Rasgos y Quirk sin romper el diseño del foro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
              
              <div className="p-4 bg-muted/20 border border-border/80 rounded-lg space-y-3">
                <h4 className="font-bold text-sm text-foreground">1. Filtrado de Posesiones (Inventario, Habilidades, Rasgos, Licencias)</h4>
                <p>
                  En la respuesta JSON, `possessions` contiene todos los elementos asociados al personaje. Puedes clasificarlos fácilmente por `element.kind` o `kind`:
                </p>
                <pre className="text-xs bg-black/60 p-3 rounded font-mono text-zinc-300">
{`const possessions = character.possessions || [];

// 1. Rasgos y Debilidades
const traits = possessions.filter(p => (p.element?.kind || p.kind) === 'trait');
const weaknesses = possessions.filter(p => (p.element?.kind || p.kind) === 'weakness');

// 2. Habilidades Entrenables
const skills = possessions.filter(p => (p.element?.kind || p.kind) === 'skill');

// 3. Inventario y Equipo
const inventory = possessions.filter(p => 
  ['equipment', 'weapon', 'consumable', 'ammunition', 'vehicle'].includes(p.element?.kind || p.kind)
);

// 4. Licencias y Credenciales
const licenses = possessions.filter(p => 
  ['license', 'permission', 'certification', 'character_resource'].includes(p.element?.kind || p.kind)
);`}
                </pre>
              </div>

              <div className="p-4 bg-muted/20 border border-border/80 rounded-lg space-y-3">
                <h4 className="font-bold text-sm text-foreground">2. Renderizado de Técnicas con Coste de Estamina (CE)</h4>
                <p>
                  Recorre `character.techniques` para armar la lista de técnicas:
                </p>
                <pre className="text-xs bg-black/60 p-3 rounded font-mono text-zinc-300">
{`const techniquesHtml = (character.techniques || []).map(tech => \`
  <div class="tech-item p-2 border rounded mb-2">
    <div class="flex justify-between font-bold">
      <span>\${tech.name}</span>
      <span class="text-cyan-400">CE: \${tech.staminaCost}</span>
    </div>
    <p class="text-xs text-slate-400">\${tech.description || 'Sin descripción'}</p>
  </div>
\`).join('');`}
                </pre>
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
