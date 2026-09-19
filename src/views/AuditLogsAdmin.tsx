import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { SectionHeader } from "@/components/common/SectionHeader";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  User,
  Shield,
  Trash2,
  Edit3,
  PlusCircle,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Zap,
  Tag,
  Coins,
  CopyPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface AuditLogEntry {
  id: number;
  actorUid: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  actionType: string;
  targetId: string | null;
  details: any;
  createdAt: string;
}

interface AuditStats {
  totalLogs: number;
  logsToday: number;
  logsPast7Days: number;
  topActors: { actorUid: string; count: number }[];
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; icon: any; color: string }> = {
  element_created: { label: "Elemento Creado", variant: "secondary", icon: PlusCircle, color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" },
  element_updated: { label: "Elemento Modificado", variant: "outline", icon: Edit3, color: "text-amber-400 bg-amber-950/40 border-amber-800/60" },
  element_deleted: { label: "Elemento Eliminado", variant: "destructive", icon: Trash2, color: "text-red-400 bg-red-950/40 border-red-800/60" },
  
  rule_created: { label: "Regla Creada", variant: "secondary", icon: PlusCircle, color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" },
  rule_updated: { label: "Regla Modificada", variant: "outline", icon: Edit3, color: "text-amber-400 bg-amber-950/40 border-amber-800/60" },
  rule_deleted: { label: "Regla Eliminada", variant: "destructive", icon: Trash2, color: "text-red-400 bg-red-950/40 border-red-800/60" },
  
  canon_character_created: { label: "Canon Creado", variant: "secondary", icon: PlusCircle, color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" },
  canon_character_updated: { label: "Canon Modificado", variant: "outline", icon: Edit3, color: "text-amber-400 bg-amber-950/40 border-amber-800/60" },
  canon_character_deleted: { label: "Canon Eliminado", variant: "destructive", icon: Trash2, color: "text-red-400 bg-red-950/40 border-red-800/60" },
  canon_character_reserved: { label: "Canon Reservado", variant: "outline", icon: Zap, color: "text-cyan-400 bg-cyan-950/40 border-cyan-800/60" },
  canon_character_released: { label: "Canon Liberado", variant: "outline", icon: Zap, color: "text-sky-400 bg-sky-950/40 border-sky-800/60" },
  
  character_deleted: { label: "Ficha Eliminada", variant: "destructive", icon: Trash2, color: "text-red-400 bg-red-950/40 border-red-800/60" },
  character_duplicated: { label: "Ficha Duplicada", variant: "secondary", icon: CopyPlus, color: "text-indigo-400 bg-indigo-950/40 border-indigo-800/60" },
  character_reward_granted: { label: "Recompensa Otorgada", variant: "outline", icon: Coins, color: "text-yellow-400 bg-yellow-950/40 border-yellow-800/60" },
  possession_updated: { label: "Posesión Ajustada", variant: "outline", icon: Tag, color: "text-purple-400 bg-purple-950/40 border-purple-800/60" },

  shop_offer_created: { label: "Oferta Creada", variant: "secondary", icon: PlusCircle, color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" },
  shop_offer_updated: { label: "Oferta Modificada", variant: "outline", icon: Edit3, color: "text-amber-400 bg-amber-950/40 border-amber-800/60" },
  shop_offer_deleted: { label: "Oferta Eliminada", variant: "destructive", icon: Trash2, color: "text-red-400 bg-red-950/40 border-red-800/60" },
  shop_purchase: { label: "Compra en Tienda", variant: "outline", icon: Coins, color: "text-blue-400 bg-blue-950/40 border-blue-800/60" },

  sheet_field_created: { label: "Campo Ficha Creado", variant: "secondary", icon: PlusCircle, color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60" },
  sheet_field_updated: { label: "Campo Ficha Modificado", variant: "outline", icon: Edit3, color: "text-amber-400 bg-amber-950/40 border-amber-800/60" },
  sheet_field_deleted: { label: "Campo Ficha Eliminado", variant: "destructive", icon: Trash2, color: "text-red-400 bg-red-950/40 border-red-800/60" },
};

function formatActionSummary(log: AuditLogEntry): string {
  const d = log.details || {};
  switch (log.actionType) {
    case "element_created":
      return `Creó el elemento "${d.name || log.targetId}" (Categoría: ${d.kind || "N/A"})`;
    case "element_updated":
      if (d.previousStatus && d.status && d.previousStatus !== d.status) {
        return `Modificó "${d.name || log.targetId}" (Estado: ${d.previousStatus} -> ${d.status})`;
      }
      return `Editó el elemento "${d.name || log.targetId}" (${d.kind || "N/A"})`;
    case "element_deleted":
      return `Eliminó permanentemente el elemento "${d.name || log.targetId}" (${d.kind || "N/A"})`;
      
    case "rule_created":
      return `Creó la regla de sistema "${log.targetId}" (${d.type || "json"})`;
    case "rule_updated":
      if (log.targetId === "global_settings") {
        return `Actualizó ajustes globales del sistema (Fecha / Grupos)`;
      }
      return `Modificó la regla de sistema "${log.targetId}"`;
    case "rule_deleted":
      return `Eliminó la regla de sistema "${log.targetId}"`;

    case "canon_character_created":
      return `Creó el personaje canon "${d.name || log.targetId}"`;
    case "canon_character_updated":
      return `Actualizó el personaje canon "${d.name || log.targetId}"`;
    case "canon_character_deleted":
      return `Eliminó el personaje canon "${d.name || log.targetId}"`;
    case "canon_character_reserved":
      return `Reservó el personaje canon "${d.name || log.targetId}"`;
    case "canon_character_released":
      return `Liberó la reserva del personaje canon "${d.name || log.targetId}"`;

    case "character_deleted":
      return `Eliminó la ficha de personaje "${d.name || log.targetId}" (ID: ${log.targetId})`;
    case "character_duplicated":
      return `Duplicó la ficha "${d.sourceName || d.sourceCharacterId}" -> "${d.newName}" (Nuevo ID: ${log.targetId})`;
    case "character_reward_granted":
      return `Otorgó ${d.amount > 0 ? "+" : ""}${d.amount} ${d.type?.toUpperCase()} al personaje ID ${log.targetId} (${d.reason || "Sin motivo"})`;
    case "possession_updated":
      return `Ajustó posesión de elemento "${d.elementId}" (${d.quantity > 0 ? "+" : ""}${d.quantity}) en ficha ID ${log.targetId}`;

    case "shop_offer_created":
      return `Publicó nueva oferta de tienda para el elemento "${d.elementId}"`;
    case "shop_offer_updated":
      return `Actualizó oferta de tienda (ID: ${log.targetId}, Estado: ${d.status})`;
    case "shop_offer_deleted":
      return `Eliminó oferta de tienda para elemento "${d.elementId}"`;
    case "shop_purchase":
      return `Compra en tienda: ${d.itemCount || 1} artículo(s) para personaje ID ${log.targetId} (Total: ${d.totalCost} ${d.currency})`;

    case "sheet_field_created":
      return `Creó el campo de ficha "${d.name || log.targetId}" (${d.type})`;
    case "sheet_field_updated":
      return `Modificó el campo de ficha "${d.name || log.targetId}"`;
    case "sheet_field_deleted":
      return `Eliminó el campo de ficha "${d.name || log.targetId}"`;

    default:
      return `Acción ${log.actionType} ejecutada sobre ${log.targetId || "recurso"}`;
  }
}

export default function AuditLogsAdmin() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("limit", pageSize.toString());
  if (debouncedSearch) queryParams.set("search", debouncedSearch);
  if (actionTypeFilter && actionTypeFilter !== "all") queryParams.set("actionType", actionTypeFilter);
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);

  const {
    data: logsResponse,
    error: logsError,
    isLoading: logsLoading,
    mutate: mutateLogs,
  } = useSWR<{ logs: AuditLogEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
    `/api/admin/audit-logs?${queryParams.toString()}`,
    fetcher
  );

  const { data: statsData, mutate: mutateStats } = useSWR<AuditStats>(
    "/api/admin/audit-logs/stats",
    fetcher
  );

  const handleRefresh = () => {
    mutateLogs();
    mutateStats();
    toast.success("Registro de auditoría actualizado");
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setActionTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleCopyDetails = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopied(true);
    toast.success("Detalle del log copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const logs = logsResponse?.logs || [];
  const pagination = logsResponse?.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 1 };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Log de Auditoría"
        description="Historial detallado y trazabilidad de acciones críticas: quién creó, modificó o eliminó reglas, elementos del catálogo, fichas canon, personajes o ajustes del sistema."
        icon={History}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2 font-oxanium text-xs"
          >
            <RefreshCw className={`size-3.5 ${logsLoading ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
        }
      />

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-oxanium">
              Total de Eventos
            </CardTitle>
            <History className="size-4 text-primary" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-oxanium text-foreground">
              {statsData ? statsData.totalLogs.toLocaleString() : "..."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Registros persistidos en el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-oxanium">
              Acciones Hoy
            </CardTitle>
            <Calendar className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-oxanium text-emerald-400">
              {statsData ? statsData.logsToday.toLocaleString() : "..."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Eventos en las últimas 24 horas</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-oxanium">
              Últimos 7 Días
            </CardTitle>
            <Zap className="size-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-oxanium text-cyan-400">
              {statsData ? statsData.logsPast7Days.toLocaleString() : "..."}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Actividad administrativa semanal</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-oxanium">
              Operadores Activos
            </CardTitle>
            <Shield className="size-4 text-indigo-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-oxanium text-indigo-400">
              {statsData?.topActors ? statsData.topActors.length : 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Cuentas con registros de auditoría</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, nombre, email o detalles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Action Type Filter */}
            <div className="md:col-span-3">
              <Select
                value={actionTypeFilter}
                onValueChange={(val) => {
                  setActionTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="element_created">Elemento Creado</SelectItem>
                  <SelectItem value="element_updated">Elemento Modificado</SelectItem>
                  <SelectItem value="element_deleted">Elemento Eliminado</SelectItem>
                  <SelectItem value="rule_created">Regla Creada</SelectItem>
                  <SelectItem value="rule_updated">Regla Modificada</SelectItem>
                  <SelectItem value="rule_deleted">Regla Eliminada</SelectItem>
                  <SelectItem value="canon_character_created">Canon Creado</SelectItem>
                  <SelectItem value="canon_character_updated">Canon Modificado</SelectItem>
                  <SelectItem value="canon_character_deleted">Canon Eliminado</SelectItem>
                  <SelectItem value="character_deleted">Ficha Eliminada</SelectItem>
                  <SelectItem value="character_duplicated">Ficha Duplicada</SelectItem>
                  <SelectItem value="character_reward_granted">Recompensa Otorgada</SelectItem>
                  <SelectItem value="possession_updated">Posesión Ajustada</SelectItem>
                  <SelectItem value="shop_offer_created">Oferta Tienda Creada</SelectItem>
                  <SelectItem value="shop_offer_updated">Oferta Tienda Modificada</SelectItem>
                  <SelectItem value="shop_offer_deleted">Oferta Tienda Eliminada</SelectItem>
                  <SelectItem value="shop_purchase">Compra en Tienda</SelectItem>
                  <SelectItem value="sheet_field_created">Campo de Ficha Creado</SelectItem>
                  <SelectItem value="sheet_field_updated">Campo de Ficha Modificado</SelectItem>
                  <SelectItem value="sheet_field_deleted">Campo de Ficha Eliminado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="md:col-span-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs"
                title="Fecha inicio"
              />
            </div>

            {/* End Date */}
            <div className="md:col-span-2">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs"
                title="Fecha fin"
              />
            </div>

            {/* Reset Button */}
            <div className="md:col-span-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Limpiar filtros"
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-border bg-card">
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[170px] text-xs font-oxanium">Fecha / Hora</TableHead>
                <TableHead className="w-[220px] text-xs font-oxanium">Operador (Usuario)</TableHead>
                <TableHead className="w-[180px] text-xs font-oxanium">Acción</TableHead>
                <TableHead className="w-[160px] text-xs font-oxanium">Objetivo (Target)</TableHead>
                <TableHead className="text-xs font-oxanium">Resumen del Evento</TableHead>
                <TableHead className="w-[80px] text-right text-xs font-oxanium">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="size-5 animate-spin text-primary" />
                      <span>Cargando registros de auditoría...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logsError ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-destructive text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="size-5" />
                      <span>Error al cargar logs: {logsError?.message || "Error desconocido"}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="size-6 text-muted-foreground/50" />
                      <span>No se encontraron eventos de auditoría con los filtros seleccionados.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const meta = ACTION_LABELS[log.actionType] || {
                    label: log.actionType,
                    variant: "outline" as const,
                    icon: FileText,
                    color: "text-muted-foreground bg-muted/40 border-border",
                  };
                  const ActionIcon = meta.icon;
                  const dateObj = new Date(log.createdAt);
                  const isToday = new Date().toDateString() === dateObj.toDateString();

                  return (
                    <TableRow
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors border-border/40 text-xs cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Date / Time */}
                      <TableCell className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {dateObj.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                        <div className="text-[10px]">
                          {isToday ? "Hoy" : dateObj.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </div>
                      </TableCell>

                      {/* Actor */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                            {log.actorEmail ? log.actorEmail.charAt(0).toUpperCase() : <User className="size-3" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate max-w-[150px]" title={log.actorEmail || log.actorUid}>
                              {log.actorEmail || log.actorName || log.actorUid}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
                              {log.actorRole ? (
                                <span className="uppercase text-[9px] font-semibold text-primary/80">{log.actorRole}</span>
                              ) : (
                                log.actorUid
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Action Type */}
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${meta.color}`}>
                          <ActionIcon className="size-3 shrink-0" />
                          <span className="truncate">{meta.label}</span>
                        </span>
                      </TableCell>

                      {/* Target */}
                      <TableCell className="font-mono text-[11px] text-foreground font-medium">
                        <span className="bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 truncate max-w-[140px] inline-block" title={log.targetId || "N/A"}>
                          {log.targetId || "—"}
                        </span>
                      </TableCell>

                      {/* Summary */}
                      <TableCell className="text-muted-foreground">
                        <span className="line-clamp-1 text-foreground/90 font-medium">
                          {formatActionSummary(log)}
                        </span>
                      </TableCell>

                      {/* View Action */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedLog(log)}
                          title="Ver detalle completo"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Mostrar</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>por página. Total: <strong>{pagination.total}</strong> eventos.</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">
              Página {pagination.page} de {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1 || logsLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= pagination.totalPages || logsLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="space-y-1 pb-3 border-b border-border">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="font-oxanium text-lg font-semibold flex items-center gap-2">
                <History className="size-5 text-primary" />
                Detalle del Evento #{selectedLog?.id}
              </DialogTitle>
              {selectedLog && (
                <Badge
                  variant={ACTION_LABELS[selectedLog.actionType]?.variant || "outline"}
                  className="font-oxanium text-xs"
                >
                  {ACTION_LABELS[selectedLog.actionType]?.label || selectedLog.actionType}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Registrado el {selectedLog && new Date(selectedLog.createdAt).toLocaleString("es-ES")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-oxanium">Operador (Actor)</span>
                  <span className="font-semibold text-foreground font-mono">{selectedLog.actorEmail || selectedLog.actorName || selectedLog.actorUid}</span>
                  {selectedLog.actorRole && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary uppercase font-bold">
                      {selectedLog.actorRole}
                    </span>
                  )}
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">UID: {selectedLog.actorUid}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-oxanium">Objetivo (Target ID)</span>
                  <span className="font-mono font-semibold text-foreground">{selectedLog.targetId || "N/A"}</span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Tipo: {selectedLog.actionType}</div>
                </div>
              </div>

              {/* Action Description */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <span className="text-xs font-semibold text-primary block mb-1">Descripción del Cambio</span>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {formatActionSummary(selectedLog)}
                </p>
              </div>

              {/* JSON Payload Details */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-oxanium text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-muted-foreground" />
                    Datos y Carga Útil (Payload JSON)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDetails}
                    className="h-7 px-2 text-[11px] flex items-center gap-1 font-oxanium"
                  >
                    {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    {copied ? "Copiado" : "Copiar JSON"}
                  </Button>
                </div>
                <pre className="p-3 bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-md font-mono text-[11px] overflow-x-auto max-h-64 leading-relaxed">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
