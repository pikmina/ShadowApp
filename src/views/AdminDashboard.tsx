import { useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '@/components/common/SectionHeader';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  BookOpen,
  Library,
  Briefcase,
  GraduationCap,
  ShoppingBag,
  History,
  Plus,
  ArrowRight,
  TrendingUp,
  Coins,
  Zap,
  Activity,
  RefreshCw,
  Layers,
  Sword,
  Shield,
  Clock,
  UserCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const getGroupColorClass = (group: string) => {
  const g = group.toLowerCase().trim();
  if (g.includes('héroe') || g.includes('hero')) return 'border-blue-700/60 text-blue-400 bg-blue-950/40';
  if (g.includes('villan')) return 'border-red-700/60 text-red-400 bg-red-950/40';
  if (g.includes('estudiant') || g.includes('u.a') || g.includes('shiketsu')) return 'border-emerald-700/60 text-emerald-400 bg-emerald-950/40';
  if (g.includes('vigilant')) return 'border-purple-700/60 text-purple-400 bg-purple-950/40';
  if (g.includes('civil')) return 'border-neutral-700/60 text-neutral-300 bg-neutral-900/40';
  if (g.includes('proscrit') || g.includes('yakuza')) return 'border-amber-700/60 text-amber-400 bg-amber-950/40';
  
  const colors = [
    'border-cyan-700/60 text-cyan-400 bg-cyan-950/40',
    'border-orange-700/60 text-orange-400 bg-orange-950/40',
    'border-pink-700/60 text-pink-400 bg-pink-950/40',
    'border-yellow-700/60 text-yellow-400 bg-yellow-950/40',
    'border-indigo-700/60 text-indigo-400 bg-indigo-950/40'
  ];
  let hash = 0;
  for (let i = 0; i < g.length; i++) {
    hash = g.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getStageBadgeColor = (index: number) => {
  const colors = [
    'border-sky-600/50 bg-sky-950/30 text-sky-400',
    'border-teal-600/50 bg-teal-950/30 text-teal-400',
    'border-emerald-600/50 bg-emerald-950/30 text-emerald-400',
    'border-amber-600/50 bg-amber-950/30 text-amber-400',
    'border-rose-600/50 bg-rose-950/30 text-rose-400',
    'border-purple-600/50 bg-purple-950/30 text-purple-400',
  ];
  return colors[index % colors.length];
};

export default function AdminDashboard() {
  const { user, dbUser } = useAuth();
  const navigate = useNavigate();
  const isMod = dbUser?.role === 'moderator' || dbUser?.role === 'superadmin';

  const { data: stats, error, isLoading, mutate } = useSWR(
    user && isMod ? '/api/admin/dashboard-stats' : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const formattedExp = useMemo(() => {
    return (stats?.characters?.totalExp || 0).toLocaleString('es-ES');
  }, [stats?.characters?.totalExp]);

  const formattedYen = useMemo(() => {
    return (stats?.characters?.totalYen || 0).toLocaleString('es-ES');
  }, [stats?.characters?.totalYen]);

  const quickActions = [
    {
      id: 'quick-action-mechanics',
      title: 'Categorías Mecánicas',
      description: 'Efectos mecánicos, costes de estamina CE y reglas del sistema.',
      icon: BookOpen,
      badge: 'Reglas Base',
      color: 'border-amber-500/40 hover:border-amber-500 bg-amber-950/20 text-amber-400',
      action: () => navigate('/rules?tab=mechanics'),
    },
    {
      id: 'quick-action-create-canon',
      title: 'Crear Nuevo Canon',
      description: 'Dar de alta un personaje canónico oficial y sus reservas.',
      icon: Sparkles,
      badge: 'Canon',
      color: 'border-purple-500/40 hover:border-purple-500 bg-purple-950/20 text-purple-400',
      action: () => navigate('/canon?create=true'),
    },
    {
      id: 'quick-action-create-character',
      title: 'Crear Nuevo Personaje',
      description: 'Registrar una nueva ficha de personaje y configurar sus datos.',
      icon: Users,
      badge: 'Personajes',
      color: 'border-cyan-500/40 hover:border-cyan-500 bg-cyan-950/20 text-cyan-400',
      action: () => navigate('/characters?create=true'),
    },
    {
      id: 'quick-action-create-catalog',
      title: 'Crear Elemento Catálogo',
      description: 'Añadir un nuevo rasgo, objeto, arma, consumible o equipo.',
      icon: Library,
      badge: 'Catálogo',
      color: 'border-blue-500/40 hover:border-blue-500 bg-blue-950/20 text-blue-400',
      action: () => navigate('/catalog?create=true'),
    },
    {
      id: 'quick-action-create-technique',
      title: 'Crear Nueva Técnica',
      description: 'Diseñar una técnica ejecutable con efectos y costes de estamina.',
      icon: Sword,
      badge: 'Técnicas',
      color: 'border-rose-500/40 hover:border-rose-500 bg-rose-950/20 text-rose-400',
      action: () => navigate('/techniques?create=true'),
    },
    {
      id: 'quick-action-employments',
      title: 'Gestión de Empleos',
      description: 'Administrar instituciones, vacantes y cálculo de nóminas.',
      icon: Briefcase,
      badge: 'Mundo',
      color: 'border-emerald-500/40 hover:border-emerald-500 bg-emerald-950/20 text-emerald-400',
      action: () => navigate('/employments'),
    },
    {
      id: 'quick-action-classes',
      title: 'Gestión de Clases',
      description: 'Gestionar cursos académicos y seguimiento de alumnos.',
      icon: GraduationCap,
      badge: 'Academia',
      color: 'border-indigo-500/40 hover:border-indigo-500 bg-indigo-950/20 text-indigo-400',
      action: () => navigate('/classes'),
    },
    {
      id: 'quick-action-audit',
      title: 'Log de Auditoría',
      description: 'Supervisar quién editó o eliminó elementos críticos del sistema.',
      icon: History,
      badge: 'Seguridad',
      color: 'border-neutral-500/40 hover:border-neutral-400 bg-neutral-900/30 text-neutral-300',
      action: () => navigate('/audit'),
    },
  ];

  if (!isMod) {
    return (
      <div className="p-8 text-center text-muted-foreground" id="admin-dashboard-unauthorized">
        No tienes permisos suficientes para acceder al panel administrativo.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12" id="admin-dashboard-view">
      {/* Header */}
      <SectionHeader
        icon={LayoutDashboard}
        title="Panel de Control Administrativo"
        description="Visión general del estado del sistema, estadísticas poblacionales por grupo y etapa, y accesos rápidos de gestión."
        actions={
          <Button
            id="refresh-dashboard-btn"
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
            className="flex items-center gap-2 border-border/80 hover:bg-accent/40 font-oxanium text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
        }
      />

      {/* Global KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-kpi-grid">
        {/* KPI 1: Personajes */}
        <Card className="bg-card/70 border-border/60 backdrop-blur-sm relative overflow-hidden" id="kpi-characters-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Población Total</span>
              <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight mt-1 text-foreground">
              {isLoading ? '...' : (stats?.characters?.total ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span>Originales / Canon</span>
              <span className="font-semibold text-foreground">
                {stats?.characters?.original ?? 0} / {stats?.characters?.canon ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>EXP / Yenes Totales</span>
              <span className="font-semibold text-foreground truncate max-w-[120px]" title={`${formattedExp} EXP / ¥${formattedYen}`}>
                {formattedExp} / ¥{formattedYen}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Canon */}
        <Card className="bg-card/70 border-border/60 backdrop-blur-sm relative overflow-hidden" id="kpi-canon-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personajes Canon</span>
              <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight mt-1 text-foreground">
              {isLoading ? '...' : (stats?.canonCharacters?.total ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span>Asignados en Juego</span>
              <span className="font-semibold text-purple-400">
                {stats?.canonCharacters?.assigned ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Reservados / Libres</span>
              <span className="font-semibold text-foreground">
                {stats?.canonCharacters?.reserved ?? 0} / {stats?.canonCharacters?.available ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Catálogo & Técnicas */}
        <Card className="bg-card/70 border-border/60 backdrop-blur-sm relative overflow-hidden" id="kpi-catalog-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catálogo y Técnicas</span>
              <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-400">
                <Library className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight mt-1 text-foreground">
              {isLoading ? '...' : (stats?.catalog?.total ?? 0) + (stats?.techniques?.total ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span>Elementos Catálogo</span>
              <span className="font-semibold text-foreground">
                {stats?.catalog?.published ?? 0} pub. ({stats?.catalog?.draft ?? 0} borr.)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Técnicas Registradas</span>
              <span className="font-semibold text-foreground">
                {stats?.techniques?.published ?? 0} pub. ({stats?.techniques?.draft ?? 0} borr.)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Mundo & Empleos */}
        <Card className="bg-card/70 border-border/60 backdrop-blur-sm relative overflow-hidden" id="kpi-world-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mundo & Ocupación</span>
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight mt-1 text-foreground">
              {isLoading ? '...' : (stats?.world?.activeEmployments ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span>Empleos Activos</span>
              <span className="font-semibold text-emerald-400">
                {stats?.world?.activeEmployments ?? 0} ({stats?.world?.institutions ?? 0} inst.)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Clases / Matrículas</span>
              <span className="font-semibold text-foreground">
                {stats?.world?.academicClasses ?? 0} clases ({stats?.world?.activeEnrollments ?? 0} alumnos)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Hub */}
      <div className="space-y-3" id="dashboard-quick-actions-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Accesos Directos y Creación Rápida</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Acceso veloz a las herramientas de diseño, reglas mecánicas y registro de entidades clave.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                id={action.id}
                onClick={action.action}
                className={`p-4 rounded-xl border text-left transition-all duration-200 group flex flex-col justify-between relative overflow-hidden ${action.color}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-background/60 border border-current/20">
                      <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold px-2 py-0.5 border-current/30 bg-background/40">
                      {action.badge}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {action.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-foreground/80 group-hover:text-primary group-hover:translate-x-1 transition-all">
                  <span>Acceder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Demographics Section: Groups & Stages Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-demographics-section">
        
        {/* Personajes por Grupo */}
        <Card className="border-border/60 bg-card/60" id="characters-by-group-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Personajes por Grupo / Facción</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Distribución de la población activa según su afiliación política u organizativa.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-cyan-400 hover:text-cyan-300"
                onClick={() => navigate('/characters')}
              >
                Ver todos <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Cargando grupos...</div>
            ) : !stats?.characters?.byGroup || stats.characters.byGroup.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No hay personajes registrados o clasificados en grupos.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.characters.byGroup.map((item: any) => {
                  const colorClass = getGroupColorClass(item.group);
                  return (
                    <div
                      key={item.group}
                      className="p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-accent/20 transition-colors space-y-2 cursor-pointer group"
                      onClick={() => navigate(`/characters?group=${encodeURIComponent(item.group)}`)}
                      title={`Filtrar personajes de ${item.group}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`font-semibold text-xs px-2 py-0.5 ${colorClass}`}>
                            {item.group}
                          </Badge>
                          <span className="text-muted-foreground text-[11px] group-hover:text-primary transition-colors">
                            {item.count} {item.count === 1 ? 'personaje' : 'personajes'}
                          </span>
                        </div>
                        <span className="font-bold text-foreground text-xs">
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 transition-all duration-500 rounded-full"
                          style={{ width: `${Math.max(item.percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personajes por Etapa */}
        <Card className="border-border/60 bg-card/60" id="characters-by-stage-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Personajes por Etapa de Edad</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Proporción de personajes en cada escala de madurez, experiencia y límites de atributos.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-emerald-400 hover:text-emerald-300"
                onClick={() => navigate('/rules?tab=stages')}
              >
                Reglas de etapas <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Cargando etapas...</div>
            ) : !stats?.characters?.byStage || stats.characters.byStage.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                No hay personajes registrados con etapas asignadas.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.characters.byStage.map((item: any, idx: number) => {
                  const badgeColor = getStageBadgeColor(idx);
                  return (
                    <div
                      key={item.stage}
                      className="p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-accent/20 transition-colors space-y-2 cursor-pointer group"
                      onClick={() => navigate(`/characters?stage=${encodeURIComponent(item.stage)}`)}
                      title={`Filtrar personajes en etapa ${item.stage}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`font-semibold text-xs px-2 py-0.5 ${badgeColor}`}>
                            {item.stage}
                          </Badge>
                          <span className="text-muted-foreground text-[11px] group-hover:text-primary transition-colors">
                            {item.count} {item.count === 1 ? 'personaje' : 'personajes'}
                          </span>
                        </div>
                        <span className="font-bold text-foreground text-xs">
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                          style={{ width: `${Math.max(item.percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Live Activity & Recent Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-recent-activity-section">
        {/* Recent Characters */}
        <Card className="border-border/60 bg-card/60" id="recent-characters-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Personajes Actualizados Recientemente</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Últimos personajes creados o modificados en la plataforma.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => navigate('/characters')}
              >
                Ver listado <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!stats?.characters?.recent || stats.characters.recent.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No hay actividad reciente registrada.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.characters.recent.map((char: any) => (
                  <div
                    key={char.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-accent/10 transition-colors px-1 rounded cursor-pointer"
                    onClick={() => navigate(`/characters`)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{char.name}</span>
                        {char.isCanon && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-700/60 text-purple-400 bg-purple-950/30">
                            Canon
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="truncate">{char.group}</span>
                        <span>•</span>
                        <span className="truncate">{char.stage}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {char.updatedAt ? new Date(char.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Activity */}
        <Card className="border-border/60 bg-card/60" id="recent-audit-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Actividad Reciente del Sistema</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Últimos eventos críticos capturados por el log de auditoría.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-amber-400 hover:text-amber-300"
                onClick={() => navigate('/audit')}
              >
                Auditoría completa <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!stats?.recentLogs || stats.recentLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No hay registros de auditoría recientes.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {stats.recentLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-accent/10 transition-colors px-1 rounded cursor-pointer"
                    onClick={() => navigate('/audit')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/80 text-foreground bg-muted/40 font-mono">
                          {log.actionType}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {log.actorEmail || 'Administrador'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {log.details?.name || log.details?.key || log.targetId || 'Acción administrativa'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
