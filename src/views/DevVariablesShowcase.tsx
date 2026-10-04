import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { FileText, Database, Code, BookOpen, Layers } from 'lucide-react';
import { SectionHeader } from '../components/common/SectionHeader';

export default function DevVariablesShowcase() {
  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Variables Showcase" 
        description="Cheatsheet y guía de referencia para usar la información de fichas, reglas, y componentes."
        icon={Code}
      />

      <Tabs defaultValue="characters" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="characters" className="flex items-center gap-2"><FileText className="w-4 h-4" /> Personajes (Ficha)</TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> Reglas del Sistema</TabsTrigger>
          <TabsTrigger value="context" className="flex items-center gap-2"><Code className="w-4 h-4" /> Contextos React</TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2"><Database className="w-4 h-4" /> Base de Datos (Drizzle)</TabsTrigger>
        </TabsList>

        {/* ================= PERSONAJES ================= */}
        <TabsContent value="characters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leer información de la ficha (Character profileData)</CardTitle>
              <CardDescription>
                Los datos de un personaje se guardan en el campo `profileData` de formato JSON. 
                Aquí tienes la lista exhaustiva de todas las variables base y cómo extraerlas y usarlas en un componente React.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-md border border-border">
                <h3 className="font-semibold text-sm mb-2 text-primary">Extracción y Rendering Completo (JSX)</h3>
                <pre className="text-xs text-muted-foreground overflow-x-auto p-2 bg-black/50 rounded">
{`import { readProfile } from '../lib/utils'; 

export function TarjetaFicha({ character }) {
  // ================= EXTRAER VARIABLES =================
  
  // 1. Identidad
  const firstName = readProfile(character.profileData, ['basic_name', 'name', 'nombre']) || 'Desconocido';
  const lastName = readProfile(character.profileData, ['last_name', 'apellido']) || '';
  const name = \`\${firstName} \${lastName}\`.trim();
  const alias = readProfile(character.profileData, ['alias', 'hero_name']) || 'Desconocido';
  const faceclaim = readProfile(character.profileData, ['faceclaim', 'pb']) || 'Ninguno';
  const avatarUrl = readProfile(character.profileData, ['avatar_url', 'avatarUrl', 'image']) || '/default-avatar.png';

  // 2. Demografía / Estado
  const birthDate = readProfile(character.profileData, ['birth_date', 'fecha_nacimiento']) || 'Desconocida';
  const nationality = readProfile(character.profileData, ['nationality', 'nacionalidad']) || 'Desconocida';
  const bloodType = readProfile(character.profileData, ['basic_blood_type', 'blood_type']) || 'Desconocido';
  const alignment = readProfile(character.profileData, ['basic_alignment', 'alignment']) || 'Desconocida';

  // 3. Quirk (Campos Compuestos)
  const quirkType = readProfile(character.profileData, ['quirk_type', 'tipo_quirk']) || 'Desconocido';
  const quirkLevel = readProfile(character.profileData, ['quirk_level', 'quirk_evolution', 'quirkEvolution', 'nivel_de_quirk']) || 'Nivel 1. Despertar';
  const quirkName = character.profileData?.['quirk_name_name'] || character.profileData?.['quirk_name'] || 'Sin don';
  const quirkDesc = character.profileData?.['quirk_name_desc'] || 'No hay descripción registrada.';
  const quirkLvl1 = character.profileData?.['quirk_name_lvl1'] || '-'; 
  const quirkLvl2 = character.profileData?.['quirk_name_lvl2'] || '-'; 
  const quirkLvl3 = character.profileData?.['quirk_name_lvl3'] || '-'; 


  // ================= RENDERING JSX =================
  return (
    <div className="perfil-card flex gap-4 p-4 border rounded-lg bg-card">
      {/* 📸 Avatar */}
      <img src={avatarUrl} alt={name} className="w-24 h-24 rounded-md object-cover border border-border" />
      
      <div className="info flex-1">
        {/* 👤 Identidad Básica */}
        <h2 className="text-xl font-bold text-white">{name}</h2>
        <p className="text-sm text-cyan-400 font-medium">AKA: {alias}</p>
        <p className="text-xs text-muted-foreground mt-1">Faceclaim: {faceclaim}</p>
        
        {/* 📋 Datos Personales / Demografía */}
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-slate-300 bg-black/20 p-3 rounded">
          <p><strong>Nacimiento:</strong> {birthDate}</p>
          <p><strong>Nacionalidad:</strong> {nationality}</p>
          <p><strong>Sangre:</strong> {bloodType}</p>
          <p><strong>Alineación:</strong> {alignment}</p>
        </div>
        
        {/* ⚡ Quirk Completo */}
        <div className="quirk-details mt-4 border-t border-border/50 pt-4">
          <h3 className="text-md font-bold text-primary">
            Don: {quirkName} <span className="text-xs font-normal text-muted-foreground">({quirkType} · {quirkLevel})</span>
          </h3>
          <p className="text-sm text-muted-foreground my-2 italic">{quirkDesc}</p>
          
          <div className="space-y-1 text-xs bg-muted/20 p-3 rounded">
            <p><strong className="text-foreground">Nivel 1 (Despertar):</strong> {quirkLvl1}</p>
            <p><strong className="text-foreground">Nivel 2 (Dominio):</strong> {quirkLvl2}</p>
            <p><strong className="text-foreground">Nivel 3 (Trascendencia):</strong> {quirkLvl3}</p>
          </div>
        </div>
      </div>
    </div>
  );
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= REGLAS ================= */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leer Reglas y Mecánicas (System Rules)</CardTitle>
              <CardDescription>
                Puedes inyectar las reglas del sistema global en cualquier componente React usando un Provider (si está implementado) o mediante la API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-md border border-border">
                <h3 className="font-semibold text-sm mb-2 text-primary">Obtener catálogo vía SWR</h3>
                <pre className="text-xs text-muted-foreground overflow-x-auto p-2 bg-black/50 rounded">
{`import useSWR from 'swr';
import { fetcher } from '../lib/utils';

export function MiComponente() {
  const { data: rules, isLoading } = useSWR('/api/system-rules', fetcher);
  const { data: techniques } = useSWR('/api/techniques', fetcher);
  
  if (isLoading) return <p>Cargando reglas...</p>;
  
  return <div>Hay {rules?.length || 0} reglas cargadas.</div>;
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= CONTEXTOS ================= */}
        <TabsContent value="context" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contextos Útiles en React</CardTitle>
              <CardDescription>Hooks globales disponibles en la aplicación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-md border border-border">
                <h3 className="font-semibold text-sm mb-2 text-primary">useAuth() - Manejo de Usuario</h3>
                <pre className="text-xs text-muted-foreground overflow-x-auto p-2 bg-black/50 rounded">
{`import { useAuth } from '../contexts/AuthContext';

function Header() {
  const { user, dbUser, loading, logout } = useAuth();
  
  if (loading) return null;
  
  // user = Firebase Auth Object (correo, UID)
  // dbUser = Datos de Drizzle (role, created_at, id interno)
  
  return (
    <div>
      <p>Bienvenido {dbUser?.email} (Rol: {dbUser?.role})</p>
      <button onClick={logout}>Salir</button>
    </div>
  );
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= DATABASE ================= */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultas de Base de Datos (Cloud SQL + Drizzle)</CardTitle>
              <CardDescription>Formatos usados para manejar relaciones desde el backend (Express/API).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 p-4 rounded-md border border-border">
                <h3 className="font-semibold text-sm mb-2 text-primary">Tablas Principales</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4 mb-4">
                  <li><code>users</code> - Usuarios y roles de acceso.</li>
                  <li><code>characters</code> - Fichas de personaje en partida.</li>
                  <li><code>canon_characters</code> - Catálogo de avatares disponibles/ocupados.</li>
                  <li><code>character_sheet_fields</code> - Diseño y campos de la ficha (estructura).</li>
                  <li><code>system_rules</code> - Mecánicas y catálogo frozen.</li>
                </ul>
              </div>
              <div className="bg-muted/40 p-4 rounded-md border border-border">
                <h3 className="font-semibold text-sm mb-2 text-primary">Consulta Típica de Personajes</h3>
                <pre className="text-xs text-muted-foreground overflow-x-auto p-2 bg-black/50 rounded">
{`import { db } from '../db';
import { characters, users } from '../db/schema';
import { eq } from 'drizzle-orm';

// En un endpoint de Express (server.ts):
app.get('/api/characters', async (req, res) => {
  const chars = await db.query.characters.findMany({
    with: {
      user: true // Trae datos del jugador relacionado (gracias a Relations)
    },
    orderBy: (characters, { desc }) => [desc(characters.createdAt)]
  });
  res.json(chars);
});`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
