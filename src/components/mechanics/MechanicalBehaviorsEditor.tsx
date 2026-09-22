import React, { useState } from "react";
import { nanoid } from "nanoid";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  Shield,
  Zap,
  Clock,
  Target as TargetIcon,
  Sliders,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  createDefaultMechanicalBehavior,
  createDefaultMechanicalEffect,
  type MechanicalBehavior,
  type MechanicalBehaviorMode,
  type MechanicalCondition,
  type MechanicalEffectItem,
  type MechanicalLimitation,
  type DifferentiatedOutcome,
} from "../../domain/mechanicalBehavior.ts";
import {
  getMechanicalLabel,
  getAlteredStatusLabel,
  getAttributeLabel,
  getResourceLabel,
  getTagLabel,
  MECHANICAL_LABELS,
} from "../../domain/mechanicalLabels.ts";
import { MechanicalEffectsEditor } from "./MechanicalEffectsEditor.tsx";
import type { SystemMechanicsConfig } from "../../domain/systemMechanics.ts";

interface MechanicalBehaviorsEditorProps {
  behaviors: MechanicalBehavior[];
  onChange: (behaviors: MechanicalBehavior[]) => void;
  // Optional legacy props for full compatibility
  legacyEffects?: unknown[];
  onLegacyChange?: (effects: unknown[]) => void;
  mechanics?: SystemMechanicsConfig;
  maxLevel?: number;
}

export function MechanicalBehaviorsEditor({
  behaviors,
  onChange,
  legacyEffects = [],
  onLegacyChange,
  mechanics = [],
  maxLevel,
}: MechanicalBehaviorsEditorProps) {
  // If element has legacy effects and no modern behaviors, allow viewing legacy editor
  const hasLegacy = Array.isArray(legacyEffects) && legacyEffects.length > 0;
  const hasBehaviors = Array.isArray(behaviors) && behaviors.length > 0;
  const [viewMode, setViewMode] = useState<"behaviors" | "legacy">(
    hasBehaviors || !hasLegacy ? "behaviors" : "legacy"
  );

  const addBehavior = (mode: MechanicalBehaviorMode = "active") => {
    const newBehavior = createDefaultMechanicalBehavior(
      nanoid(8),
      mode,
      `Comportamiento ${behaviors.length + 1}`
    );
    onChange([...behaviors, newBehavior]);
  };

  const updateBehavior = (index: number, updated: MechanicalBehavior) => {
    const copy = [...behaviors];
    copy[index] = updated;
    onChange(copy);
  };

  const removeBehavior = (index: number) => {
    onChange(behaviors.filter((_, i) => i !== index));
  };

  const moveBehavior = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= behaviors.length) return;
    const copy = [...behaviors];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher if legacy exists */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 border rounded-lg">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-sm font-bold tracking-wide uppercase">
              Comportamientos mecánicos
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              {behaviors.length} {behaviors.length === 1 ? "comportamiento" : "comportamientos"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define la activación, condiciones, resolución y efectos del elemento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasLegacy && onLegacyChange && (
            <div className="flex items-center bg-background border rounded-md p-0.5 text-xs">
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === "behaviors"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("behaviors")}
              >
                Nuevo Modelo ({behaviors.length})
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === "legacy"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setViewMode("legacy")}
              >
                Referencias Legacy ({legacyEffects.length})
              </button>
            </div>
          )}

          {viewMode === "behaviors" && (
            <Button
              type="button"
              size="sm"
              onClick={() => addBehavior("active")}
              className="gap-1.5 h-8 text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              <span>Añadir comportamiento</span>
            </Button>
          )}
        </div>
      </div>

      {/* Legacy View Mode */}
      {viewMode === "legacy" && onLegacyChange && (
        <div className="space-y-3 p-4 border rounded-lg bg-card/40">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Modo de compatibilidad con referencias legacy</p>
              <p className="text-muted-foreground mt-0.5">
                Este elemento posee referencias mecánicas del catálogo universal anterior. Puedes editarlas aquí o migrar al nuevo modelo añadiendo comportamientos arriba.
              </p>
            </div>
          </div>
          <MechanicalEffectsEditor
            effects={legacyEffects}
            mechanics={mechanics}
            maxLevel={maxLevel}
            onChange={onLegacyChange}
          />
        </div>
      )}

      {/* Modern Behaviors View Mode */}
      {viewMode === "behaviors" && (
        <div className="space-y-4">
          {behaviors.length === 0 ? (
            <div className="p-8 border border-dashed rounded-lg text-center bg-card/20 space-y-3">
              <div className="mx-auto size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="size-5" />
              </div>
              <div className="max-w-md mx-auto">
                <p className="text-sm font-semibold">Sin comportamientos mecánicos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crea un comportamiento para asignar habilidades activas, reacciones o efectos pasivos continuos.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addBehavior("active")}
                  className="gap-1.5 text-xs"
                >
                  <Zap className="size-3.5 text-amber-400" />
                  <span>+ Comportamiento Activo</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addBehavior("reactive")}
                  className="gap-1.5 text-xs"
                >
                  <Shield className="size-3.5 text-blue-400" />
                  <span>+ Comportamiento Reactivo</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addBehavior("continuous")}
                  className="gap-1.5 text-xs"
                >
                  <Clock className="size-3.5 text-emerald-400" />
                  <span>+ Comportamiento Continuo</span>
                </Button>
              </div>
            </div>
          ) : (
            behaviors.map((behavior, bIndex) => (
              <SingleBehaviorCard
                key={behavior.id}
                behavior={behavior}
                index={bIndex}
                total={behaviors.length}
                onUpdate={(updated) => updateBehavior(bIndex, updated)}
                onRemove={() => removeBehavior(bIndex)}
                onMoveUp={() => moveBehavior(bIndex, "up")}
                onMoveDown={() => moveBehavior(bIndex, "down")}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Single Behavior Card Component
// =========================================================================
interface SingleBehaviorCardProps {
  behavior: MechanicalBehavior;
  index: number;
  total: number;
  onUpdate: (updated: MechanicalBehavior) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SingleBehaviorCard({
  behavior,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SingleBehaviorCardProps) {
  const mode = behavior.mode;

  const handleModeChange = (newMode: MechanicalBehaviorMode) => {
    let updated: MechanicalBehavior = { ...behavior, mode: newMode };
    if (newMode === "active") {
      updated.activation = behavior.activation || {
        actionType: "action",
        timing: "immediate",
        turns: 0,
        description: "",
      };
      delete updated.trigger;
    } else if (newMode === "reactive") {
      updated.trigger = behavior.trigger || {
        kind: "receive_damage",
        description: "",
        parameters: {},
      };
      delete updated.activation;
    } else if (newMode === "continuous") {
      delete updated.activation;
      delete updated.trigger;
    }
    onUpdate(updated);
  };

  return (
    <div className="border rounded-lg bg-card/60 overflow-hidden shadow-sm transition-all hover:border-border/80">
      {/* Behavior Card Top Header */}
      <div className="p-3 sm:p-4 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              mode === "active"
                ? "default"
                : mode === "reactive"
                ? "secondary"
                : "outline"
            }
            className={`text-xs font-bold uppercase tracking-wider ${
              mode === "active"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : mode === "reactive"
                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}
          >
            {mode === "active" && "⚡ Activo"}
            {mode === "reactive" && "🛡️ Reactivo"}
            {mode === "continuous" && "⏳ Continuo"}
          </Badge>
          <span className="text-xs font-mono font-medium text-muted-foreground">
            #{index + 1}
          </span>
        </div>

        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            value={behavior.name || ""}
            onChange={(e) => onUpdate({ ...behavior, name: e.target.value })}
            placeholder="Nombre del comportamiento (opcional)..."
            className="h-8 text-xs bg-background/80 font-medium"
          />
        </div>

        {/* Controls: Move Up/Down, Delete */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={index === 0}
            onClick={onMoveUp}
            title="Mover arriba"
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={index === total - 1}
            onClick={onMoveDown}
            title="Mover abajo"
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            title="Eliminar comportamiento"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Mode Selector Segmented Bar */}
      <div className="px-4 pt-3 pb-1 border-b bg-card/20 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-muted-foreground">Modo:</Label>
          <div className="inline-flex rounded-md border p-0.5 bg-muted/50 text-xs">
            <button
              type="button"
              className={`px-3 py-1 rounded font-medium transition-all ${
                mode === "active"
                  ? "bg-amber-500 text-black font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleModeChange("active")}
            >
              Activo
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded font-medium transition-all ${
                mode === "reactive"
                  ? "bg-blue-500 text-white font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleModeChange("reactive")}
            >
              Reactivo
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded font-medium transition-all ${
                mode === "continuous"
                  ? "bg-emerald-500 text-white font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleModeChange("continuous")}
            >
              Continuo
            </button>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          {mode === "active" && "Se activa mediante una acción consciente en el turno."}
          {mode === "reactive" && "Se dispara ante un evento o detonante específico."}
          {mode === "continuous" && "Efecto persistente o constante mientras esté disponible."}
        </div>
      </div>

      {/* Dynamic Sections Accordion */}
      <div className="p-4 space-y-4">
        <Accordion type="multiple" defaultValue={["effects"]} className="space-y-2.5">
          {/* 1. ACTIVATION (Only for Active mode) */}
          {mode === "active" && (
            <AccordionItem value="activation" className="border rounded-md px-3 bg-muted/10">
              <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-amber-400">
                <div className="flex items-center gap-2">
                  <Zap className="size-3.5" />
                  <span>Activación</span>
                  <Badge variant="outline" className="text-[10px] font-normal ml-1">
                    {getMechanicalLabel("actionTypes", behavior.activation?.actionType || "action")}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Tipo de Acción</Label>
                    <Select
                      value={behavior.activation?.actionType || "action"}
                      onValueChange={(val: any) => {
                        const current = behavior.activation || {
                          actionType: "action" as const,
                          timing: "immediate" as const,
                          turns: 0,
                          description: "",
                        };
                        onUpdate({
                          ...behavior,
                          activation: {
                            ...current,
                            actionType: val,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="action">Acción Estándar</SelectItem>
                        <SelectItem value="quick_action">Acción Rápida</SelectItem>
                        <SelectItem value="voluntary_reaction">Reacción Voluntaria</SelectItem>
                        <SelectItem value="free_action">Acción Gratuita</SelectItem>
                        <SelectItem value="manual">Manual / Especial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs">Tiempo de Activación</Label>
                    <Select
                      value={behavior.activation?.timing || "immediate"}
                      onValueChange={(val: any) => {
                        const current = behavior.activation || {
                          actionType: "action" as const,
                          timing: "immediate" as const,
                          turns: 0,
                          description: "",
                        };
                        onUpdate({
                          ...behavior,
                          activation: {
                            ...current,
                            timing: val,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Inmediata</SelectItem>
                        <SelectItem value="turns">Turnos de preparación</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {behavior.activation?.timing === "turns" && (
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Cantidad de Turnos</Label>
                      <Input
                        type="number"
                        min={1}
                        value={behavior.activation?.turns || 1}
                        onChange={(e) => {
                          const current = behavior.activation || {
                            actionType: "action" as const,
                            timing: "turns" as const,
                            turns: 1,
                            description: "",
                          };
                          onUpdate({
                            ...behavior,
                            activation: {
                              ...current,
                              turns: Math.max(1, parseInt(e.target.value, 10) || 1),
                            },
                          });
                        }}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Notas de Activación (opcional)</Label>
                  <Input
                    value={behavior.activation?.description || ""}
                    onChange={(e) => {
                      const current = behavior.activation || {
                        actionType: "action" as const,
                        timing: "immediate" as const,
                        turns: 0,
                        description: "",
                      };
                      onUpdate({
                        ...behavior,
                        activation: {
                          ...current,
                          description: e.target.value,
                        },
                      });
                    }}
                    placeholder="Detalles sobre cómo se activa la mecánica..."
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* 2. TRIGGER (Only for Reactive mode) */}
          {mode === "reactive" && (
            <AccordionItem value="trigger" className="border rounded-md px-3 bg-muted/10">
              <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-blue-400">
                <div className="flex items-center gap-2">
                  <Shield className="size-3.5" />
                  <span>Disparador (Trigger)</span>
                  <Badge variant="outline" className="text-[10px] font-normal ml-1">
                    {getMechanicalLabel("triggers", behavior.trigger?.kind || "receive_damage")}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Evento Disparador</Label>
                    <Select
                      value={behavior.trigger?.kind || "receive_damage"}
                      onValueChange={(val) =>
                        onUpdate({
                          ...behavior,
                          trigger: { ...(behavior.trigger || {}), kind: val },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receive_damage">Al recibir daño</SelectItem>
                        <SelectItem value="deal_damage">Al infligir daño</SelectItem>
                        <SelectItem value="receive_healing">Al recibir curación</SelectItem>
                        <SelectItem value="attacked">Al ser atacado</SelectItem>
                        <SelectItem value="attack">Al realizar un ataque</SelectItem>
                        <SelectItem value="use_quirk">Al usar Quirk</SelectItem>
                        <SelectItem value="use_technique">Al usar Técnica</SelectItem>
                        <SelectItem value="roll">Al realizar una tirada</SelectItem>
                        <SelectItem value="roll_success">Éxito en tirada</SelectItem>
                        <SelectItem value="roll_failure">Fallo en tirada</SelectItem>
                        <SelectItem value="critical">Al obtener crítico</SelectItem>
                        <SelectItem value="spend_resource">Al gastar recurso</SelectItem>
                        <SelectItem value="resource_threshold_crossed">Al cruzar umbral de recurso</SelectItem>
                        <SelectItem value="turn_start">Al inicio de turno</SelectItem>
                        <SelectItem value="turn_end">Al final de turno</SelectItem>
                        <SelectItem value="combat_start">Al iniciar combate</SelectItem>
                        <SelectItem value="combat_end">Al finalizar combate</SelectItem>
                        <SelectItem value="consume_item">Al consumir objeto</SelectItem>
                        <SelectItem value="manual">Manual / Detonante narrativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {behavior.trigger?.kind === "resource_threshold_crossed" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Recurso</Label>
                        <Select
                          value={behavior.trigger?.resourceId || "ES"}
                          onValueChange={(val) =>
                            onUpdate({
                              ...behavior,
                              trigger: { ...(behavior.trigger || { kind: "resource_threshold_crossed" }), resourceId: val },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ES">ES</SelectItem>
                            <SelectItem value="SA">SA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Umbral</Label>
                        <Input
                          type="number"
                          value={behavior.trigger?.threshold ?? 3}
                          onChange={(e) =>
                            onUpdate({
                              ...behavior,
                              trigger: {
                                ...(behavior.trigger || { kind: "resource_threshold_crossed" }),
                                threshold: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Dirección</Label>
                        <Select
                          value={behavior.trigger?.direction || "cross_down"}
                          onValueChange={(val: any) =>
                            onUpdate({
                              ...behavior,
                              trigger: { ...(behavior.trigger || { kind: "resource_threshold_crossed" }), direction: val },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cross_down">Cae a/por debajo</SelectItem>
                            <SelectItem value="cross_up">Sube a/por encima</SelectItem>
                            <SelectItem value="any">Cualquier cruce</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Descripción del Disparador</Label>
                  <Input
                    value={behavior.trigger?.description || ""}
                    onChange={(e) =>
                      onUpdate({
                        ...behavior,
                        trigger: { ...(behavior.trigger || { kind: "receive_damage" }), description: e.target.value },
                      })
                    }
                    placeholder="Ej: Cuando recibes 3 o más de daño de fuego..."
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* 3. CONDITIONS SECTION */}
          <AccordionItem value="conditions" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sliders className="size-3.5" />
                <span>Condiciones</span>
                <Badge variant="outline" className="text-[10px] font-normal ml-1">
                  {behavior.conditions.length} {behavior.conditions.length === 1 ? "condición" : "condiciones"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <ConditionsEditor
                conditions={behavior.conditions}
                logic={behavior.conditionLogic || "all"}
                onChange={(conditions, conditionLogic) =>
                  onUpdate({ ...behavior, conditions, conditionLogic })
                }
              />
            </AccordionContent>
          </AccordionItem>

          {/* 4. RESOLUTION SECTION */}
          <AccordionItem value="resolution" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5" />
                <span>Resolución</span>
                <Badge variant="outline" className="text-[10px] font-normal ml-1">
                  {getMechanicalLabel("resolutions", behavior.resolution?.type || "automatic")}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <ResolutionEditor
                resolution={behavior.resolution || { type: "automatic", outcomes: [] }}
                onChange={(resolution) => onUpdate({ ...behavior, resolution })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 5. EFFECTS SECTION (REQUIRED 1..N EFFECTS) */}
          <AccordionItem value="effects" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-primary">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-primary" />
                <span>Efectos del Comportamiento</span>
                <Badge variant="default" className="text-[10px] font-bold ml-1">
                  {behavior.effects.length} {behavior.effects.length === 1 ? "efecto" : "efectos"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <EffectsListEditor
                effects={behavior.effects}
                onChange={(effects) => onUpdate({ ...behavior, effects })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 6. TARGET SECTION */}
          <AccordionItem value="target" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <TargetIcon className="size-3.5" />
                <span>Objetivo, Rango y Área</span>
                <Badge variant="outline" className="text-[10px] font-normal ml-1">
                  {getMechanicalLabel("targets", behavior.target?.type || "self")}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <TargetEditor
                target={behavior.target || { type: "self" }}
                onChange={(target) => onUpdate({ ...behavior, target })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 7. TEMPORALITY SECTION */}
          <AccordionItem value="temporality" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="size-3.5" />
                <span>Temporalidad y Duración</span>
                <Badge variant="outline" className="text-[10px] font-normal ml-1">
                  {getMechanicalLabel("durations", behavior.temporality?.duration.type || "instant")}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <TemporalityEditor
                temporality={behavior.temporality || { duration: { type: "instant" } }}
                onChange={(temporality) => onUpdate({ ...behavior, temporality })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 8. LIMITATIONS SECTION */}
          <AccordionItem value="limitations" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-3.5" />
                <span>Limitaciones</span>
                <Badge variant="outline" className="text-[10px] font-normal ml-1">
                  {behavior.limitations.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <LimitationsEditor
                limitations={behavior.limitations}
                onChange={(limitations) => onUpdate({ ...behavior, limitations })}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 9. ADVANCED CONTROL SECTION */}
          <AccordionItem value="control" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sliders className="size-3.5" />
                <span>Control Avanzado (Contadores, Caps, Resets, Excepciones)</span>
                {behavior.control && (
                  <Badge variant="secondary" className="text-[10px] font-normal ml-1">
                    configurado
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3">
              <ControlEditor
                control={behavior.control || {}}
                onChange={(control) => onUpdate({ ...behavior, control })}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

// =========================================================================
// Sub-component: Conditions Editor
// =========================================================================
function ConditionsEditor({
  conditions,
  logic,
  onChange,
}: {
  conditions: MechanicalCondition[];
  logic: "all" | "any";
  onChange: (conditions: MechanicalCondition[], logic: "all" | "any") => void;
}) {
  const addCondition = () => {
    const newCond: MechanicalCondition = {
      type: "resource",
      resourceId: "ES",
      comparison: "<=",
      value: 3,
      negated: false,
    };
    onChange([...conditions, newCond], logic);
  };

  const updateCond = (index: number, updated: MechanicalCondition) => {
    const copy = [...conditions];
    copy[index] = updated;
    onChange(copy, logic);
  };

  const removeCond = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index), logic);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-muted-foreground">Lógica:</span>
          <Select value={logic} onValueChange={(val: any) => onChange(conditions, val)}>
            <SelectTrigger className="h-7 w-32 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas (AND)</SelectItem>
              <SelectItem value="any">Alguna (OR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addCondition}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>Añadir condición</span>
        </Button>
      </div>

      {conditions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Sin condiciones adicionales (se ejecuta siempre que el modo lo permita).
        </p>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <div
              key={i}
              className="p-2.5 border rounded-md bg-background/60 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
            >
              <Select
                value={cond.type}
                onValueChange={(val: any) => {
                  if (val === "percentage") {
                    updateCond(i, { type: "percentage", resourceId: "SA", comparison: "<=", percent: 50, negated: cond.negated });
                  } else if (val === "resource") {
                    updateCond(i, { type: "resource", resourceId: "ES", comparison: "<=", value: 3, negated: cond.negated });
                  } else if (val === "status") {
                    updateCond(i, { type: "status", statusElementId: "core.status.stunned", present: true, negated: cond.negated });
                  } else if (val === "tag") {
                    updateCond(i, { type: "tag", tag: "fire", scope: "attack", negated: cond.negated });
                  } else if (val === "die") {
                    updateCond(i, { type: "die", dieSelection: "both", comparison: "=", value: 10, negated: cond.negated });
                  } else if (val === "manual") {
                    updateCond(i, { type: "manual", signalId: "permiso_master", description: "", negated: cond.negated });
                  } else {
                    updateCond(i, { type: "resource", resourceId: "ES", comparison: "<=", value: 0, negated: cond.negated });
                  }
                }}
              >
                <SelectTrigger className="h-7 w-38 text-xs font-semibold">
                  <SelectValue>{getMechanicalLabel("conditionTypes", cond.type)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resource">Recurso (Valor)</SelectItem>
                  <SelectItem value="percentage">Recurso (Porcentaje)</SelectItem>
                  <SelectItem value="status">Estado Alterado</SelectItem>
                  <SelectItem value="die">Dado Individual</SelectItem>
                  <SelectItem value="tag">Etiqueta (Tag)</SelectItem>
                  <SelectItem value="manual">Manual / Narrativa</SelectItem>
                </SelectContent>
              </Select>

              {/* Dynamic inputs based on condition type */}
              <div className="flex-1 flex flex-wrap items-center gap-2 w-full">
                {cond.type === "resource" && (
                  <>
                    <Select
                      value={cond.resourceId}
                      onValueChange={(val) => updateCond(i, { ...cond, resourceId: val })}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue>{getResourceLabel(cond.resourceId)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ES">ES</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={cond.comparison}
                      onValueChange={(val: any) => updateCond(i, { ...cond, comparison: val })}
                    >
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue>{getMechanicalLabel("comparisonOperators", cond.comparison)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<">&lt;</SelectItem>
                        <SelectItem value="<=">&le;</SelectItem>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value=">=">&ge;</SelectItem>
                        <SelectItem value=">">&gt;</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={cond.value}
                      onChange={(e) => updateCond(i, { ...cond, value: parseInt(e.target.value, 10) || 0 })}
                      className="h-7 w-20 text-xs"
                    />
                  </>
                )}

                {cond.type === "percentage" && (
                  <>
                    <Select
                      value={cond.resourceId}
                      onValueChange={(val) => updateCond(i, { ...cond, resourceId: val })}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue>{getResourceLabel(cond.resourceId)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SA">Salud (SA)</SelectItem>
                        <SelectItem value="ES">Estamina (ES)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={cond.comparison}
                      onValueChange={(val: any) => updateCond(i, { ...cond, comparison: val })}
                    >
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue>{getMechanicalLabel("comparisonOperators", cond.comparison)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<=">&le;</SelectItem>
                        <SelectItem value=">=">&ge;</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={cond.percent}
                        onChange={(e) => updateCond(i, { ...cond, percent: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
                        className="h-7 w-16 text-xs"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </>
                )}

                {cond.type === "status" && (
                  <>
                    <Select
                      value={
                        ["core.status.stunned", "core.status.vulnerable", "core.status.berserker", "core.status.paralyzed", "support_blocked"].includes(cond.statusElementId)
                          ? cond.statusElementId
                          : "custom"
                      }
                      onValueChange={(val) => {
                        if (val !== "custom") {
                          updateCond(i, { ...cond, statusElementId: val });
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <SelectValue placeholder="Seleccionar estado...">
                          {getAlteredStatusLabel(cond.statusElementId)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="core.status.stunned">Aturdido</SelectItem>
                        <SelectItem value="core.status.vulnerable">Vulnerable</SelectItem>
                        <SelectItem value="core.status.berserker">Berserker</SelectItem>
                        <SelectItem value="core.status.paralyzed">Paralizado</SelectItem>
                        <SelectItem value="support_blocked">Soporte Bloqueado</SelectItem>
                        <SelectItem value="custom">Otro (ID manual)...</SelectItem>
                      </SelectContent>
                    </Select>
                    {(!["core.status.stunned", "core.status.vulnerable", "core.status.berserker", "core.status.paralyzed", "support_blocked"].includes(cond.statusElementId)) && (
                      <Input
                        value={cond.statusElementId || ""}
                        onChange={(e) => updateCond(i, { ...cond, statusElementId: e.target.value })}
                        placeholder="ID de estado..."
                        className="h-7 w-32 text-xs font-mono"
                      />
                    )}
                  </>
                )}

                {cond.type === "die" && (
                  <>
                    <Select
                      value={cond.dieSelection}
                      onValueChange={(val: any) => updateCond(i, { ...cond, dieSelection: val })}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue>{getMechanicalLabel("dieSelections", cond.dieSelection)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">{MECHANICAL_LABELS.dieSelections.both}</SelectItem>
                        <SelectItem value="any">{MECHANICAL_LABELS.dieSelections.any}</SelectItem>
                        <SelectItem value="first">{MECHANICAL_LABELS.dieSelections.first}</SelectItem>
                        <SelectItem value="second">{MECHANICAL_LABELS.dieSelections.second}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={cond.comparison}
                      onValueChange={(val: any) => updateCond(i, { ...cond, comparison: val })}
                    >
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue>{getMechanicalLabel("comparisonOperators", cond.comparison)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value=">=">&ge;</SelectItem>
                        <SelectItem value="<=">&le;</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={cond.value}
                      onChange={(e) => updateCond(i, { ...cond, value: parseInt(e.target.value, 10) || 0 })}
                      className="h-7 w-16 text-xs"
                    />
                  </>
                )}

                {cond.type === "tag" && (
                  <>
                    <Input
                      value={cond.tag}
                      onChange={(e) => updateCond(i, { ...cond, tag: e.target.value })}
                      placeholder="Etiqueta (ej: fire, corte...)"
                      className="h-7 w-36 text-xs"
                    />
                    <Select
                      value={cond.scope}
                      onValueChange={(val: any) => updateCond(i, { ...cond, scope: val })}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue>{getMechanicalLabel("tagScopes", cond.scope)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attack">{MECHANICAL_LABELS.tagScopes.attack}</SelectItem>
                        <SelectItem value="source">{MECHANICAL_LABELS.tagScopes.source}</SelectItem>
                        <SelectItem value="target">{MECHANICAL_LABELS.tagScopes.target}</SelectItem>
                        <SelectItem value="any">{MECHANICAL_LABELS.tagScopes.any}</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}

                {cond.type === "manual" && (
                  <Input
                    value={cond.signalId}
                    onChange={(e) => updateCond(i, { ...cond, signalId: e.target.value })}
                    placeholder="ID o señal de condición..."
                    className="h-7 flex-1 text-xs"
                  />
                )}

                {/* Negation Switch */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[10px] text-muted-foreground">NOT:</span>
                  <Switch
                    checked={cond.negated}
                    onCheckedChange={(checked) => updateCond(i, { ...cond, negated: checked })}
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive shrink-0"
                onClick={() => removeCond(i)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Sub-component: Resolution Editor
// =========================================================================
function ResolutionEditor({
  resolution,
  onChange,
}: {
  resolution: {
    type: "automatic" | "roll" | "rd" | "manual";
    difficulty?: number;
    attribute?: string;
    skill?: string;
    description?: string;
    outcomes?: DifferentiatedOutcome[];
  };
  onChange: (res: any) => void;
}) {
  const addOutcome = () => {
    const newOutcome: DifferentiatedOutcome = {
      id: nanoid(6),
      outcome: "failure",
      marginThreshold: 5,
      description: "",
      effects: [],
    };
    onChange({
      ...resolution,
      outcomes: [...(resolution.outcomes || []), newOutcome],
    });
  };

  const removeOutcome = (index: number) => {
    onChange({
      ...resolution,
      outcomes: (resolution.outcomes || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Tipo de Resolución</Label>
          <Select
            value={resolution.type}
            onValueChange={(val: any) => onChange({ ...resolution, type: val })}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue>{getMechanicalLabel("resolutions", resolution.type)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automatic">{MECHANICAL_LABELS.resolutions.automatic}</SelectItem>
              <SelectItem value="rd">{MECHANICAL_LABELS.resolutions.rd}</SelectItem>
              <SelectItem value="roll">{MECHANICAL_LABELS.resolutions.roll}</SelectItem>
              <SelectItem value="manual">{MECHANICAL_LABELS.resolutions.manual}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {resolution.type === "rd" && (
          <>
            <div className="grid gap-1.5">
              <Label className="text-xs">Dificultad (RD)</Label>
              <Input
                type="number"
                value={resolution.difficulty ?? 12}
                onChange={(e) =>
                  onChange({ ...resolution, difficulty: parseInt(e.target.value, 10) || 0 })
                }
                placeholder="Ej: 12, 16..."
                className="h-8 text-xs bg-background font-mono font-bold"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Atributo / Habilidad Exigida</Label>
              <Input
                value={resolution.attribute || ""}
                onChange={(e) => onChange({ ...resolution, attribute: e.target.value })}
                placeholder="Ej: FUE, Presencia, Carisma..."
                className="h-8 text-xs bg-background"
              />
            </div>
          </>
        )}
      </div>

      {/* Differentiated Outcomes for RD */}
      {resolution.type === "rd" && (
        <div className="pt-2 border-t space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Ramas de resultado diferenciadas (Éxito, Fallo, Margen) con efectos mecánicos:
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addOutcome}
              className="h-6 text-[11px] gap-1"
            >
              <Plus className="size-3" />
              <span>Añadir rama de resultado</span>
            </Button>
          </div>

          {(resolution.outcomes || []).length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">
              Sin consecuencias diferenciadas (aplica los efectos base del comportamiento).
            </p>
          ) : (
            (resolution.outcomes || []).map((out, i) => (
              <div key={out.id} className="p-3 border rounded-md bg-background/60 space-y-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Select
                    value={out.outcome}
                    onValueChange={(val: any) => {
                      const copy = [...(resolution.outcomes || [])];
                      copy[i] = { ...copy[i], outcome: val };
                      onChange({ ...resolution, outcomes: copy });
                    }}
                  >
                    <SelectTrigger className="h-7 w-40 text-xs font-semibold">
                      <SelectValue>{getMechanicalLabel("outcomes", out.outcome)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="success">{MECHANICAL_LABELS.outcomes.success}</SelectItem>
                      <SelectItem value="failure">{MECHANICAL_LABELS.outcomes.failure}</SelectItem>
                      <SelectItem value="critical">{MECHANICAL_LABELS.outcomes.critical}</SelectItem>
                      <SelectItem value="failure_margin">{MECHANICAL_LABELS.outcomes.failure_margin}</SelectItem>
                      <SelectItem value="success_margin">{MECHANICAL_LABELS.outcomes.success_margin}</SelectItem>
                    </SelectContent>
                  </Select>

                  {(out.outcome === "failure_margin" || out.outcome === "success_margin") && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">&ge;</span>
                      <Input
                        type="number"
                        value={out.marginThreshold ?? 5}
                        onChange={(e) => {
                          const copy = [...(resolution.outcomes || [])];
                          copy[i] = { ...copy[i], marginThreshold: parseInt(e.target.value, 10) || 0 };
                          onChange({ ...resolution, outcomes: copy });
                        }}
                        className="h-7 w-16 text-xs font-mono"
                      />
                    </div>
                  )}

                  <Input
                    value={out.description || ""}
                    onChange={(e) => {
                      const copy = [...(resolution.outcomes || [])];
                      copy[i] = { ...copy[i], description: e.target.value };
                      onChange({ ...resolution, outcomes: copy });
                    }}
                    placeholder="Descripción narrativa (opcional)..."
                    className="h-7 flex-1 text-xs"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive shrink-0"
                    onClick={() => removeOutcome(i)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>

                {/* Structured Mechanical Effects for this specific Outcome */}
                <div className="pt-2 border-t border-border/50 pl-2">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                    Efectos mecánicos estructurados para este resultado:
                  </span>
                  <EffectsListEditor
                    effects={out.effects || []}
                    onChange={(newEffects) => {
                      const copy = [...(resolution.outcomes || [])];
                      copy[i] = { ...copy[i], effects: newEffects };
                      onChange({ ...resolution, outcomes: copy });
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Sub-component: Effects List Editor (1..N Effects)
// =========================================================================
function EffectsListEditor({
  effects,
  onChange,
}: {
  effects: MechanicalEffectItem[];
  onChange: (effects: MechanicalEffectItem[]) => void;
}) {
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  const toggleOverride = (id: string) => {
    setOpenOverrides((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addEffect = (type: MechanicalEffectItem["type"] = "damage") => {
    const newEff = createDefaultMechanicalEffect(type);
    onChange([...effects, newEff]);
  };

  const changeEffectType = (index: number, newType: MechanicalEffectItem["type"]) => {
    const current = effects[index];
    const newEff = createDefaultMechanicalEffect(
      newType,
      current?.id,
      current?.target,
      current?.temporality
    );
    const updated = [...effects];
    updated[index] = newEff;
    onChange(updated);
  };

  const updateEffect = (index: number, updated: MechanicalEffectItem) => {
    const copy = [...effects];
    copy[index] = updated;
    onChange(copy);
  };

  const removeEffect = (index: number) => {
    onChange(effects.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Añade uno o múltiples efectos ejecutados por este comportamiento.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => addEffect("damage")}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>Añadir efecto</span>
        </Button>
      </div>

      {effects.length === 0 ? (
        <div className="p-4 border border-dashed rounded text-center text-xs text-muted-foreground">
          Sin efectos configurados aún. Haz clic en &quot;Añadir efecto&quot; para definir el impacto mecánico.
        </div>
      ) : (
        <div className="space-y-2.5">
          {effects.map((eff, i) => (
            <div
              key={eff.id}
              className="p-3 border rounded-md bg-background/80 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    #{i + 1}
                  </Badge>
                  <Select
                    value={eff.type}
                    onValueChange={(val: any) => changeEffectType(i, val)}
                  >
                    <SelectTrigger className="h-7 w-52 text-xs font-bold">
                      <SelectValue>{getMechanicalLabel("effectTypes", eff.type)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damage">💥 {MECHANICAL_LABELS.effectTypes.damage}</SelectItem>
                      <SelectItem value="healing">💚 {MECHANICAL_LABELS.effectTypes.healing}</SelectItem>
                      <SelectItem value="barrier">🛡️ {MECHANICAL_LABELS.effectTypes.barrier}</SelectItem>
                      <SelectItem value="attribute_modifier">📊 {MECHANICAL_LABELS.effectTypes.attribute_modifier}</SelectItem>
                      <SelectItem value="cost_modifier">⚡ {MECHANICAL_LABELS.effectTypes.cost_modifier}</SelectItem>
                      <SelectItem value="incoming_damage_modifier">🔥 {MECHANICAL_LABELS.effectTypes.incoming_damage_modifier}</SelectItem>
                      <SelectItem value="outgoing_damage_modifier">⚔️ {MECHANICAL_LABELS.effectTypes.outgoing_damage_modifier}</SelectItem>
                      <SelectItem value="roll_modifier">🎲 {MECHANICAL_LABELS.effectTypes.roll_modifier}</SelectItem>
                      <SelectItem value="status_apply">🌀 {MECHANICAL_LABELS.effectTypes.status_apply}</SelectItem>
                      <SelectItem value="turn_loss">🛑 {MECHANICAL_LABELS.effectTypes.turn_loss}</SelectItem>
                      <SelectItem value="action_block">🔒 {MECHANICAL_LABELS.effectTypes.action_block}</SelectItem>
                      <SelectItem value="counter_modifier">🔢 {MECHANICAL_LABELS.effectTypes.counter_modifier}</SelectItem>
                      <SelectItem value="manual">📝 {MECHANICAL_LABELS.effectTypes.manual}</SelectItem>
                    </SelectContent>
                  </Select>

                  {eff.target && (
                    <Badge variant="secondary" className="text-[10px] gap-1 bg-sky-500/10 text-sky-400 border-sky-500/30">
                      <TargetIcon className="size-2.5" />
                      <span>Obj: {getMechanicalLabel("targets", eff.target.type)}</span>
                    </Badge>
                  )}
                  {eff.temporality && (
                    <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-500/10 text-amber-400 border-amber-500/30">
                      <Clock className="size-2.5" />
                      <span>Dur: {getMechanicalLabel("durations", eff.temporality.duration?.type)}</span>
                    </Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 text-destructive shrink-0"
                  onClick={() => removeEffect(i)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>

              {/* Specific inputs per effect type */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                {eff.type === "damage" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Fórmula de Dados</Label>
                      <Input
                        value={eff.dice}
                        onChange={(e) => updateEffect(i, { ...eff, dice: e.target.value })}
                        placeholder="Ej: 2D6, 4, 1D8+2..."
                        className="h-7 w-28 font-mono text-xs font-bold"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Tipo de Daño (opcional)</Label>
                      <Input
                        value={eff.damageType || ""}
                        onChange={(e) => updateEffect(i, { ...eff, damageType: e.target.value })}
                        placeholder="Ej: fuego, impacto..."
                        className="h-7 w-32 text-xs"
                      />
                    </div>
                  </>
                )}

                {eff.type === "healing" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Recurso</Label>
                      <Select
                        value={eff.resourceId}
                        onValueChange={(val: any) => updateEffect(i, { ...eff, resourceId: val })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue>{getResourceLabel(eff.resourceId)}</SelectValue></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SA">Salud (SA)</SelectItem>
                          <SelectItem value="ES">Estamina (ES)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={eff.amount}
                        onChange={(e) => updateEffect(i, { ...eff, amount: parseInt(e.target.value, 10) || 1 })}
                        className="h-7 w-20 font-mono text-xs"
                      />
                    </div>
                  </>
                )}

                {eff.type === "barrier" && (
                  <div className="grid gap-1">
                    <Label className="text-[11px]">Puntos de Barrera</Label>
                    <Input
                      type="number"
                      min={1}
                      value={eff.amount}
                      onChange={(e) => updateEffect(i, { ...eff, amount: parseInt(e.target.value, 10) || 1 })}
                      className="h-7 w-24 font-mono text-xs"
                    />
                  </div>
                )}

                {eff.type === "attribute_modifier" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Atributo</Label>
                      <Select
                        value={eff.attributeId}
                        onValueChange={(val) => updateEffect(i, { ...eff, attributeId: val })}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs font-medium">
                          <SelectValue>{getAttributeLabel(eff.attributeId)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fue">Fuerza (FUE)</SelectItem>
                          <SelectItem value="res">Resistencia (RES)</SelectItem>
                          <SelectItem value="des">Destreza (DES)</SelectItem>
                          <SelectItem value="int">Inteligencia (INT)</SelectItem>
                          <SelectItem value="vel">Velocidad (VEL)</SelectItem>
                          <SelectItem value="vol">Voluntad (VOL)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Cantidad</Label>
                      <Input
                        type="number"
                        value={eff.amount}
                        onChange={(e) => updateEffect(i, { ...eff, amount: parseInt(e.target.value, 10) || 0 })}
                        className="h-7 w-20 font-mono text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Operación</Label>
                      <Select
                        value={eff.operation || "add"}
                        onValueChange={(val: any) => updateEffect(i, { ...eff, operation: val })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue>{getMechanicalLabel("modifierOperations", eff.operation || "add")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Sumar (+)</SelectItem>
                          <SelectItem value="subtract">Restar (-)</SelectItem>
                          <SelectItem value="multiply">Multiplicar (×)</SelectItem>
                          <SelectItem value="divide">Dividir (/)</SelectItem>
                          <SelectItem value="set">Establecer (=)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {eff.type === "cost_modifier" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Ámbito</Label>
                      <Select
                        value={eff.scopeId || "quirk"}
                        onValueChange={(val) => updateEffect(i, { ...eff, scopeId: val })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue>{getMechanicalLabel("scopeIds", eff.scopeId || "quirk")}</SelectValue></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quirk">Quirk</SelectItem>
                          <SelectItem value="technique">Técnica</SelectItem>
                          <SelectItem value="all">Todas las acciones</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Operación</Label>
                      <Select
                        value={eff.operation || "add"}
                        onValueChange={(val: any) => updateEffect(i, { ...eff, operation: val })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue>{getMechanicalLabel("modifierOperations", eff.operation || "add")}</SelectValue></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Sumar (+)</SelectItem>
                          <SelectItem value="subtract">Restar (-)</SelectItem>
                          <SelectItem value="multiply">Multiplicar (&times;)</SelectItem>
                          <SelectItem value="divide">Dividir (&divide;)</SelectItem>
                          <SelectItem value="set">Fijar valor (=)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Valor</Label>
                      <Input
                        type="number"
                        value={eff.amount}
                        onChange={(e) => updateEffect(i, { ...eff, amount: parseFloat(e.target.value) || 0 })}
                        className="h-7 w-20 font-mono text-xs"
                      />
                    </div>
                  </>
                )}

                {eff.type === "incoming_damage_modifier" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Modificador</Label>
                      <Input
                        type="number"
                        value={eff.amount}
                        onChange={(e) => updateEffect(i, { ...eff, amount: parseInt(e.target.value, 10) || 0 })}
                        className="h-7 w-20 font-mono text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Filtro de Etiqueta</Label>
                      <Input
                        value={eff.tagFilter || ""}
                        onChange={(e) => updateEffect(i, { ...eff, tagFilter: e.target.value })}
                        placeholder="Ej: fire, impact..."
                        className="h-7 w-32 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Operación</Label>
                      <Select
                        value={eff.operation || "add"}
                        onValueChange={(val: any) => updateEffect(i, { ...eff, operation: val })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue>{getMechanicalLabel("modifierOperations", eff.operation || "add")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Sumar (+)</SelectItem>
                          <SelectItem value="subtract">Restar (-)</SelectItem>
                          <SelectItem value="multiply">Multiplicar (×)</SelectItem>
                          <SelectItem value="divide">Dividir (/)</SelectItem>
                          <SelectItem value="set">Establecer (=)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {eff.type === "outgoing_damage_modifier" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Modificador</Label>
                      <Input
                        type="number"
                        value={eff.amount}
                        onChange={(e) => updateEffect(i, { ...eff, amount: parseInt(e.target.value, 10) || 0 })}
                        className="h-7 w-20 font-mono text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Operación</Label>
                      <Select
                        value={eff.operation || "add"}
                        onValueChange={(val: any) => updateEffect(i, { ...eff, operation: val })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue>{getMechanicalLabel("modifierOperations", eff.operation || "add")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Sumar (+)</SelectItem>
                          <SelectItem value="subtract">Restar (-)</SelectItem>
                          <SelectItem value="multiply">Multiplicar (×)</SelectItem>
                          <SelectItem value="divide">Dividir (/)</SelectItem>
                          <SelectItem value="set">Establecer (=)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {eff.type === "roll_modifier" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Tipo de Tirada</Label>
                      <Input
                        value={eff.rollType || "action"}
                        onChange={(e) => updateEffect(i, { ...eff, rollType: e.target.value })}
                        placeholder="action, defense, attack..."
                        className="h-7 w-28 text-xs"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Modificador</Label>
                      <Input
                        type="number"
                        value={eff.amount}
                        onChange={(e) => updateEffect(i, { ...eff, amount: parseInt(e.target.value, 10) || 0 })}
                        className="h-7 w-20 font-mono text-xs"
                      />
                    </div>
                  </>
                )}

                {eff.type === "status_apply" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Estado Alterado</Label>
                      <Select
                        value={
                          ["core.status.stunned", "core.status.vulnerable", "core.status.berserker", "core.status.paralyzed", "support_blocked"].includes(eff.statusElementId)
                            ? eff.statusElementId
                            : "custom"
                        }
                        onValueChange={(val) => {
                          if (val !== "custom") {
                            updateEffect(i, { ...eff, statusElementId: val });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-48 text-xs font-medium">
                          <SelectValue placeholder="Seleccionar estado...">
                            {getAlteredStatusLabel(eff.statusElementId)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="core.status.stunned">Aturdido</SelectItem>
                          <SelectItem value="core.status.vulnerable">Vulnerable</SelectItem>
                          <SelectItem value="core.status.berserker">Berserker</SelectItem>
                          <SelectItem value="core.status.paralyzed">Paralizado</SelectItem>
                          <SelectItem value="support_blocked">Soporte Bloqueado</SelectItem>
                          <SelectItem value="custom">Otro (ID manual)...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(!["core.status.stunned", "core.status.vulnerable", "core.status.berserker", "core.status.paralyzed", "support_blocked"].includes(eff.statusElementId)) && (
                      <div className="grid gap-1">
                        <Label className="text-[11px]">ID técnico de estado</Label>
                        <Input
                          value={eff.statusElementId}
                          onChange={(e) => updateEffect(i, { ...eff, statusElementId: e.target.value })}
                          placeholder="ID de estado..."
                          className="h-7 w-36 text-xs font-mono"
                        />
                      </div>
                    )}
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Duración (Turnos)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={eff.turns || 1}
                        onChange={(e) => updateEffect(i, { ...eff, turns: parseInt(e.target.value, 10) || 1 })}
                        className="h-7 w-20 text-xs"
                      />
                    </div>
                  </>
                )}

                {eff.type === "turn_loss" && (
                  <div className="grid gap-1">
                    <Label className="text-[11px]">Turnos Perdidos</Label>
                    <Input
                      type="number"
                      min={1}
                      value={eff.turns}
                      onChange={(e) => updateEffect(i, { ...eff, turns: parseInt(e.target.value, 10) || 1 })}
                      className="h-7 w-20 text-xs"
                    />
                  </div>
                )}

                {eff.type === "action_block" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Acción Bloqueada</Label>
                      <Select
                        value={eff.blockedAction || "all"}
                        onValueChange={(val) => updateEffect(i, { ...eff, blockedAction: val })}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs font-medium">
                          <SelectValue>{getMechanicalLabel("blockedActions", eff.blockedAction || "all")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las acciones</SelectItem>
                          <SelectItem value="quirk">Quirk</SelectItem>
                          <SelectItem value="technique">Técnicas</SelectItem>
                          <SelectItem value="movement">Movimiento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Duración (Turnos)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={eff.duration || 1}
                        onChange={(e) => updateEffect(i, { ...eff, duration: parseInt(e.target.value, 10) || 1 })}
                        className="h-7 w-20 text-xs"
                      />
                    </div>
                  </>
                )}

                {eff.type === "counter_modifier" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">ID de Contador</Label>
                      <Input
                        value={eff.counterId || ""}
                        onChange={(e) => updateEffect(i, { ...eff, counterId: e.target.value })}
                        placeholder="Ej: combat_counter..."
                        className="h-7 w-32 text-xs font-mono"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Operación</Label>
                      <Select
                        value={eff.operation || "increment"}
                        onValueChange={(val: any) => updateEffect(i, { ...eff, operation: val })}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue>{getMechanicalLabel("counterOperations", eff.operation || "increment")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="increment">Incrementar (+)</SelectItem>
                          <SelectItem value="decrement">Decrementar (-)</SelectItem>
                          <SelectItem value="set">Establecer valor fijo</SelectItem>
                          <SelectItem value="reset">Reiniciar a cero</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Valor</Label>
                      <Input
                        type="number"
                        value={eff.value ?? 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          updateEffect(i, { ...eff, value: val });
                        }}
                        className="h-7 w-20 font-mono text-xs"
                      />
                    </div>
                  </>
                )}

                {eff.type === "manual" && (
                  <div className="grid gap-1 w-full max-w-md">
                    <Label className="text-[11px]">Instrucción / Mensaje Narrativo</Label>
                    <Input
                      value={eff.message || ""}
                      onChange={(e) => updateEffect(i, { ...eff, message: e.target.value })}
                      placeholder="Descripción del efecto manual..."
                      className="h-7 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Overrides for Target and Temporality on this specific effect */}
              <div className="pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => toggleOverride(eff.id)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {openOverrides[eff.id] ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  <span>Sobrescribir Objetivo o Temporalidad para este efecto</span>
                  {(eff.target || eff.temporality) && (
                    <span className="text-primary font-bold">(activo)</span>
                  )}
                </button>

                {openOverrides[eff.id] && (
                  <div className="mt-2.5 p-2.5 rounded bg-muted/20 border space-y-3">
                    {/* Target Override */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold flex items-center gap-1">
                          <TargetIcon className="size-3 text-sky-400" />
                          <span>Objetivo específico del efecto</span>
                        </span>
                        {eff.target ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] text-destructive px-1.5"
                            onClick={() => updateEffect(i, { ...eff, target: undefined })}
                          >
                            Eliminar sobrescritura (heredar)
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-5 text-[10px] px-1.5"
                            onClick={() => updateEffect(i, { ...eff, target: { type: "self" } })}
                          >
                            + Definir objetivo específico
                          </Button>
                        )}
                      </div>
                      {eff.target ? (
                        <div className="p-2 border rounded bg-background/60">
                          <TargetEditor
                            target={eff.target}
                            onChange={(newTarget) => updateEffect(i, { ...eff, target: newTarget })}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                          Hereda el objetivo configurado a nivel de comportamiento.
                        </p>
                      )}
                    </div>

                    {/* Temporality Override */}
                    <div className="space-y-1.5 pt-1.5 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold flex items-center gap-1">
                          <Clock className="size-3 text-amber-400" />
                          <span>Temporalidad específica del efecto</span>
                        </span>
                        {eff.temporality ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] text-destructive px-1.5"
                            onClick={() => updateEffect(i, { ...eff, temporality: undefined })}
                          >
                            Eliminar sobrescritura (heredar)
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-5 text-[10px] px-1.5"
                            onClick={() => updateEffect(i, { ...eff, temporality: { duration: { type: "instant" } } })}
                          >
                            + Definir temporalidad específica
                          </Button>
                        )}
                      </div>
                      {eff.temporality ? (
                        <div className="p-2 border rounded bg-background/60">
                          <TemporalityEditor
                            temporality={eff.temporality}
                            onChange={(newTemp) => updateEffect(i, { ...eff, temporality: newTemp })}
                          />
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                          Hereda la temporalidad configurada a nivel de comportamiento.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Sub-component: Target Editor
// =========================================================================
function TargetEditor({
  target,
  onChange,
}: {
  target: any;
  onChange: (target: any) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
      <div className="grid gap-1.5">
        <Label className="text-xs">Tipo de Objetivo</Label>
        <Select
          value={target.type || "self"}
          onValueChange={(val) => onChange({ ...target, type: val })}
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue>{getMechanicalLabel("targets", target.type || "self")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self">{MECHANICAL_LABELS.targets.self}</SelectItem>
            <SelectItem value="enemy">{MECHANICAL_LABELS.targets.enemy}</SelectItem>
            <SelectItem value="ally">{MECHANICAL_LABELS.targets.ally}</SelectItem>
            <SelectItem value="character">{MECHANICAL_LABELS.targets.character}</SelectItem>
            <SelectItem value="area">{MECHANICAL_LABELS.targets.area}</SelectItem>
            <SelectItem value="roll">{MECHANICAL_LABELS.targets.roll}</SelectItem>
            <SelectItem value="resource">{MECHANICAL_LABELS.targets.resource}</SelectItem>
            <SelectItem value="manual">{MECHANICAL_LABELS.targets.manual}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Rango</Label>
        <Select
          value={target.range?.type || "contact"}
          onValueChange={(val) =>
            onChange({
              ...target,
              range: { ...(target.range || {}), type: val },
            })
          }
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue>{getMechanicalLabel("ranges", target.range?.type || "contact")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self">{MECHANICAL_LABELS.ranges.self}</SelectItem>
            <SelectItem value="contact">{MECHANICAL_LABELS.ranges.contact}</SelectItem>
            <SelectItem value="distance">{MECHANICAL_LABELS.ranges.distance}</SelectItem>
            <SelectItem value="unlimited">{MECHANICAL_LABELS.ranges.unlimited}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {target.range?.type === "distance" && (
        <div className="grid gap-1.5">
          <Label className="text-xs">Distancia (Metros)</Label>
          <Input
            type="number"
            min={1}
            value={target.range?.distanceMeters ?? 10}
            onChange={(e) =>
              onChange({
                ...target,
                range: {
                  ...(target.range || { type: "distance" }),
                  distanceMeters: parseInt(e.target.value, 10) || 0,
                },
              })
            }
            className="h-8 text-xs bg-background"
          />
        </div>
      )}

      {target.type === "area" && (
        <>
          <div className="grid gap-1.5">
            <Label className="text-xs">Forma de Área</Label>
            <Select
              value={target.area?.shape || "radius"}
              onValueChange={(val) =>
                onChange({
                  ...target,
                  area: { ...(target.area || {}), shape: val },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue>{getMechanicalLabel("areaShapes", target.area?.shape || "radius")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radius">{MECHANICAL_LABELS.areaShapes.radius}</SelectItem>
                <SelectItem value="cone">{MECHANICAL_LABELS.areaShapes.cone}</SelectItem>
                <SelectItem value="line">{MECHANICAL_LABELS.areaShapes.line}</SelectItem>
                <SelectItem value="zone">{MECHANICAL_LABELS.areaShapes.zone}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Tamaño de Área (Metros)</Label>
            <Input
              type="number"
              min={1}
              value={target.area?.sizeMeters ?? 5}
              onChange={(e) =>
                onChange({
                  ...target,
                  area: {
                    ...(target.area || { shape: "radius" }),
                    sizeMeters: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
              className="h-8 text-xs bg-background"
            />
          </div>
        </>
      )}

      <div className="grid gap-1.5">
        <Label className="text-xs">Restricción de Selección</Label>
        <Select
          value={target.selectionRestriction || "none"}
          onValueChange={(val) =>
            onChange({ ...target, selectionRestriction: val === "none" ? undefined : val })
          }
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue>{getMechanicalLabel("selectionRestrictions", target.selectionRestriction || "none")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{MECHANICAL_LABELS.selectionRestrictions.none}</SelectItem>
            <SelectItem value="nearest">{MECHANICAL_LABELS.selectionRestrictions.nearest}</SelectItem>
            <SelectItem value="random">{MECHANICAL_LABELS.selectionRestrictions.random}</SelectItem>
            <SelectItem value="specific">{MECHANICAL_LABELS.selectionRestrictions.specific}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// =========================================================================
// Sub-component: Temporality Editor
// =========================================================================
function TemporalityEditor({
  temporality,
  onChange,
}: {
  temporality: any;
  onChange: (temp: any) => void;
}) {
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Duración</Label>
          <Select
            value={temporality.duration?.type || "instant"}
            onValueChange={(val) =>
              onChange({
                ...temporality,
                duration: { ...(temporality.duration || {}), type: val },
              })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue>{getMechanicalLabel("durations", temporality.duration?.type || "instant")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">{MECHANICAL_LABELS.durations.instant}</SelectItem>
              <SelectItem value="turns">{MECHANICAL_LABELS.durations.turns}</SelectItem>
              <SelectItem value="until_turn_end">{MECHANICAL_LABELS.durations.until_turn_end}</SelectItem>
              <SelectItem value="until_next_turn">{MECHANICAL_LABELS.durations.until_next_turn}</SelectItem>
              <SelectItem value="until_next_roll">{MECHANICAL_LABELS.durations.until_next_roll}</SelectItem>
              <SelectItem value="until_next_use">{MECHANICAL_LABELS.durations.until_next_use}</SelectItem>
              <SelectItem value="while_condition">{MECHANICAL_LABELS.durations.while_condition}</SelectItem>
              <SelectItem value="while_owned">{MECHANICAL_LABELS.durations.while_owned}</SelectItem>
              <SelectItem value="permanent">{MECHANICAL_LABELS.durations.permanent}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {temporality.duration?.type === "turns" && (
          <div className="grid gap-1.5">
            <Label className="text-xs">Cantidad de Turnos</Label>
            <Input
              type="number"
              min={1}
              value={temporality.duration?.turns ?? 1}
              onChange={(e) =>
                onChange({
                  ...temporality,
                  duration: {
                    ...(temporality.duration || { type: "turns" }),
                    turns: parseInt(e.target.value, 10) || 1,
                  },
                })
              }
              className="h-8 text-xs bg-background"
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label className="text-xs">Frecuencia de Ejecución</Label>
          <Select
            value={temporality.frequency?.type || "once"}
            onValueChange={(val) =>
              onChange({
                ...temporality,
                frequency: { ...(temporality.frequency || {}), type: val },
              })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue>{getMechanicalLabel("frequencies", temporality.frequency?.type || "once")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">{MECHANICAL_LABELS.frequencies.once}</SelectItem>
              <SelectItem value="each_turn">{MECHANICAL_LABELS.frequencies.each_turn}</SelectItem>
              <SelectItem value="turn_start">{MECHANICAL_LABELS.frequencies.turn_start}</SelectItem>
              <SelectItem value="turn_end">{MECHANICAL_LABELS.frequencies.turn_end}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Maintenance */}
      <div className="p-2.5 border rounded bg-background/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={temporality.maintenance?.enabled || false}
            onCheckedChange={(checked) =>
              onChange({
                ...temporality,
                maintenance: {
                  ...(temporality.maintenance || { resource: "ES", amount: 1 }),
                  enabled: checked,
                },
              })
            }
          />
          <div>
            <p className="font-semibold text-xs">Mantenimiento por Turno</p>
            <p className="text-[10px] text-muted-foreground">
              Consume recursos en cada turno para mantener el efecto activo.
            </p>
          </div>
        </div>

        {temporality.maintenance?.enabled && (
          <div className="flex items-center gap-2">
            <Select
              value={temporality.maintenance?.resource || "ES"}
              onValueChange={(val) =>
                onChange({
                  ...temporality,
                  maintenance: { ...(temporality.maintenance || {}), resource: val },
                })
              }
            >
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ES">ES</SelectItem>
                <SelectItem value="SA">SA</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={temporality.maintenance?.amount ?? 1}
              onChange={(e) =>
                onChange({
                  ...temporality,
                  maintenance: {
                    ...(temporality.maintenance || {}),
                    amount: parseInt(e.target.value, 10) || 1,
                  },
                })
              }
              className="h-7 w-16 text-xs font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Sub-component: Limitations Editor
// =========================================================================
function LimitationsEditor({
  limitations,
  onChange,
}: {
  limitations: MechanicalLimitation[];
  onChange: (lim: MechanicalLimitation[]) => void;
}) {
  const addLimitation = () => {
    const newLim: MechanicalLimitation = {
      id: nanoid(6),
      type: "cooldown",
      turns: 1,
    };
    onChange([...limitations, newLim]);
  };

  const removeLimitation = (index: number) => {
    onChange(limitations.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Restricciones de enfriamiento, usos por combate o requisitos de equipo.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addLimitation}
          className="h-7 text-xs gap-1"
        >
          <Plus className="size-3" />
          <span>Añadir limitación</span>
        </Button>
      </div>

      {limitations.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sin limitaciones registradas.</p>
      ) : (
        <div className="space-y-2">
          {limitations.map((lim, i) => (
            <div key={lim.id} className="p-2.5 border rounded bg-background/60 flex items-center gap-2">
              <Select
                value={lim.type}
                onValueChange={(val: any) => {
                  const copy = [...limitations];
                  if (val === "cooldown") copy[i] = { id: lim.id, type: "cooldown", turns: 1 };
                  else if (val === "usage_limit") copy[i] = { id: lim.id, type: "usage_limit", period: "combat", max: 1 };
                  else if (val === "item_requirement") copy[i] = { id: lim.id, type: "item_requirement", referenceType: "tag", referenceValue: "arma", quantity: 1, mode: "require" };
                  else copy[i] = { id: lim.id, type: "manual", description: "" };
                  onChange(copy);
                }}
              >
                <SelectTrigger className="h-7 w-44 text-xs font-semibold">
                  <SelectValue>{getMechanicalLabel("limitationTypes", lim.type)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cooldown">{MECHANICAL_LABELS.limitationTypes.cooldown}</SelectItem>
                  <SelectItem value="usage_limit">{MECHANICAL_LABELS.limitationTypes.usage_limit}</SelectItem>
                  <SelectItem value="item_requirement">{MECHANICAL_LABELS.limitationTypes.item_requirement}</SelectItem>
                  <SelectItem value="manual">{MECHANICAL_LABELS.limitationTypes.manual}</SelectItem>
                </SelectContent>
              </Select>

              {lim.type === "cooldown" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Turnos:</span>
                  <Input
                    type="number"
                    min={1}
                    value={lim.turns}
                    onChange={(e) => {
                      const copy = [...limitations];
                      copy[i] = { ...lim, turns: parseInt(e.target.value, 10) || 1 };
                      onChange(copy);
                    }}
                    className="h-7 w-16 text-xs font-mono"
                  />
                </div>
              )}

              {lim.type === "usage_limit" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={lim.max}
                    onChange={(e) => {
                      const copy = [...limitations];
                      copy[i] = { ...lim, max: parseInt(e.target.value, 10) || 1 };
                      onChange(copy);
                    }}
                    className="h-7 w-16 text-xs font-mono"
                  />
                  <span className="text-muted-foreground">usos por:</span>
                  <Select
                    value={lim.period}
                    onValueChange={(val) => {
                      const copy = [...limitations];
                      copy[i] = { ...lim, period: val };
                      onChange(copy);
                    }}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue>{getMechanicalLabel("periods", lim.period)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turn">{MECHANICAL_LABELS.periods.turn}</SelectItem>
                      <SelectItem value="combat">{MECHANICAL_LABELS.periods.combat}</SelectItem>
                      <SelectItem value="mission">{MECHANICAL_LABELS.periods.mission}</SelectItem>
                      <SelectItem value="day">{MECHANICAL_LABELS.periods.day}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {lim.type === "item_requirement" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={lim.referenceType}
                    onValueChange={(val: any) => {
                      const copy = [...limitations];
                      copy[i] = { ...lim, referenceType: val };
                      onChange(copy);
                    }}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue>{getMechanicalLabel("itemReferenceTypes", lim.referenceType)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tag">{MECHANICAL_LABELS.itemReferenceTypes.tag}</SelectItem>
                      <SelectItem value="category">{MECHANICAL_LABELS.itemReferenceTypes.category}</SelectItem>
                      <SelectItem value="item">{MECHANICAL_LABELS.itemReferenceTypes.item}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={lim.referenceValue}
                    onChange={(e) => {
                      const copy = [...limitations];
                      copy[i] = { ...lim, referenceValue: e.target.value };
                      onChange(copy);
                    }}
                    placeholder="Valor / Tag..."
                    className="h-7 w-28 text-xs"
                  />
                  <Select
                    value={lim.mode}
                    onValueChange={(val: any) => {
                      const copy = [...limitations];
                      copy[i] = { ...lim, mode: val };
                      onChange(copy);
                    }}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue>{getMechanicalLabel("itemRequirementModes", lim.mode)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="require">{MECHANICAL_LABELS.itemRequirementModes.require}</SelectItem>
                      <SelectItem value="consume">{MECHANICAL_LABELS.itemRequirementModes.consume}</SelectItem>
                      <SelectItem value="equip">{MECHANICAL_LABELS.itemRequirementModes.equip}</SelectItem>
                      <SelectItem value="reserve">{MECHANICAL_LABELS.itemRequirementModes.reserve}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive ml-auto"
                onClick={() => removeLimitation(i)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Sub-component: Advanced Control Editor
// =========================================================================
function ControlEditor({
  control,
  onChange,
}: {
  control: any;
  onChange: (ctrl: any) => void;
}) {
  return (
    <div className="space-y-4 text-xs">
      {/* 1. Counter */}
      <div className="p-3 border rounded-md bg-background/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs">Contador Mecánico</span>
          <Switch
            checked={!!control.counter}
            onCheckedChange={(checked) =>
              onChange({
                ...control,
                counter: checked
                  ? { id: "contador_impacto", name: "Impacto", initialValue: 0, incrementOnTrigger: 1, cap: 3, resetCondition: "when_triggered" }
                  : undefined,
              })
            }
          />
        </div>
        {control.counter && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="grid gap-1">
              <Label className="text-[11px]">Nombre</Label>
              <Input
                value={control.counter.name || ""}
                onChange={(e) =>
                  onChange({ ...control, counter: { ...control.counter, name: e.target.value } })
                }
                placeholder="Impacto, Cargas..."
                className="h-7 text-xs"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Incremento</Label>
              <Input
                type="number"
                value={control.counter.incrementOnTrigger ?? 1}
                onChange={(e) =>
                  onChange({ ...control, counter: { ...control.counter, incrementOnTrigger: parseInt(e.target.value, 10) || 0 } })
                }
                className="h-7 text-xs font-mono"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Límite (Cap)</Label>
              <Input
                type="number"
                value={control.counter.cap ?? 3}
                onChange={(e) =>
                  onChange({ ...control, counter: { ...control.counter, cap: parseInt(e.target.value, 10) || 0 } })
                }
                className="h-7 text-xs font-mono font-bold"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[11px]">Reset</Label>
              <Select
                value={control.counter.resetCondition || "when_triggered"}
                onValueChange={(val) =>
                  onChange({
                    ...control,
                    counter: {
                      ...control.counter,
                      resetCondition: val,
                      resetConditionDetails: val === "condition" ? (control.counter.resetConditionDetails || { id: "rst_cond_1", kind: "state", target: "rested", operator: "eq", value: true }) : undefined,
                    },
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue>{getMechanicalLabel("resetConditions", control.counter.resetCondition || "when_triggered")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="when_triggered">{MECHANICAL_LABELS.resetConditions.when_triggered}</SelectItem>
                  <SelectItem value="turn_end">{MECHANICAL_LABELS.resetConditions.turn_end}</SelectItem>
                  <SelectItem value="combat_end">{MECHANICAL_LABELS.resetConditions.combat_end}</SelectItem>
                  <SelectItem value="condition">{MECHANICAL_LABELS.resetConditions.condition}</SelectItem>
                  <SelectItem value="manual">{MECHANICAL_LABELS.resetConditions.manual}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {control.counter?.resetCondition === "condition" && (
          <div className="p-2 border rounded bg-background/70 space-y-2 mt-2">
            <span className="text-[11px] font-semibold text-muted-foreground block">
              Condición estructurada de reset:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="grid gap-1">
                <Label className="text-[10px]">Tipo</Label>
                <Select
                  value={control.counter.resetConditionDetails?.kind || "state"}
                  onValueChange={(val: any) =>
                    onChange({
                      ...control,
                      counter: {
                        ...control.counter,
                        resetConditionDetails: {
                          ...(control.counter.resetConditionDetails || { id: "rst_1" }),
                          kind: val,
                        },
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue>{getMechanicalLabel("resetConditionKinds", control.counter.resetConditionDetails?.kind || "state")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="state">{MECHANICAL_LABELS.resetConditionKinds.state}</SelectItem>
                    <SelectItem value="resource">{MECHANICAL_LABELS.resetConditionKinds.resource}</SelectItem>
                    <SelectItem value="roll_outcome">{MECHANICAL_LABELS.resetConditionKinds.roll_outcome}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label className="text-[10px]">Objetivo / Clave</Label>
                <Input
                  value={control.counter.resetConditionDetails?.target || ""}
                  onChange={(e) =>
                    onChange({
                      ...control,
                      counter: {
                        ...control.counter,
                        resetConditionDetails: {
                          ...(control.counter.resetConditionDetails || { id: "rst_1", kind: "state" }),
                          target: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="ej: rested, treatment, ES..."
                  className="h-7 text-xs"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[10px]">Operador</Label>
                <Select
                  value={control.counter.resetConditionDetails?.operator || "eq"}
                  onValueChange={(val: any) =>
                    onChange({
                      ...control,
                      counter: {
                        ...control.counter,
                        resetConditionDetails: {
                          ...(control.counter.resetConditionDetails || { id: "rst_1", kind: "state", target: "rested" }),
                          operator: val,
                        },
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue>{getMechanicalLabel("comparisonOperators", control.counter.resetConditionDetails?.operator || "eq")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eq">=</SelectItem>
                    <SelectItem value="gte">&ge;</SelectItem>
                    <SelectItem value="lte">&le;</SelectItem>
                    <SelectItem value="neq">!=</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label className="text-[10px]">Valor</Label>
                <Input
                  value={String(control.counter.resetConditionDetails?.value ?? "")}
                  onChange={(e) =>
                    onChange({
                      ...control,
                      counter: {
                        ...control.counter,
                        resetConditionDetails: {
                          ...(control.counter.resetConditionDetails || { id: "rst_1", kind: "state", target: "rested" }),
                          value: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="true, 10, success..."
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Exception */}
      <div className="p-3 border rounded-md bg-background/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs">Excepción (Ignorar requisito o vincular comportamiento)</span>
          <Switch
            checked={!!control.exception}
            onCheckedChange={(checked) =>
              onChange({
                ...control,
                exception: checked
                  ? { description: "Ignorar requisito pagando 4 ES", allowWhenRequirementFailed: true, costResource: "ES", costAmount: 4, action: "allow" }
                  : undefined,
              })
            }
          />
        </div>
        {control.exception && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px]">Recurso de Coste</Label>
                <Select
                  value={control.exception.costResource || "ES"}
                  onValueChange={(val) =>
                    onChange({ ...control, exception: { ...control.exception, costResource: val } })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue>{getResourceLabel(control.exception.costResource || "ES")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">Estamina (ES)</SelectItem>
                    <SelectItem value="SA">Salud (SA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[11px]">Cantidad de Coste</Label>
                <Input
                  type="number"
                  min={0}
                  value={control.exception.costAmount ?? 4}
                  onChange={(e) =>
                    onChange({ ...control, exception: { ...control.exception, costAmount: parseInt(e.target.value, 10) || 0 } })
                  }
                  className="h-7 text-xs font-mono font-bold"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[11px]">Acción al activar</Label>
                <Select
                  value={control.exception.action || "allow"}
                  onValueChange={(val: any) =>
                    onChange({ ...control, exception: { ...control.exception, action: val } })
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue>{getMechanicalLabel("exceptionActions", control.exception.action || "allow")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">{MECHANICAL_LABELS.exceptionActions.allow}</SelectItem>
                    <SelectItem value="modify">{MECHANICAL_LABELS.exceptionActions.modify}</SelectItem>
                    <SelectItem value="skip">{MECHANICAL_LABELS.exceptionActions.skip}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px]">Comportamiento Vinculado (ID)</Label>
                <Input
                  value={control.exception.targetBehaviorId || ""}
                  onChange={(e) =>
                    onChange({ ...control, exception: { ...control.exception, targetBehaviorId: e.target.value } })
                  }
                  placeholder="ID de comportamiento objetivo..."
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[11px]">Condición Ignorada (ID)</Label>
                <Input
                  value={control.exception.ignoredConditionId || ""}
                  onChange={(e) =>
                    onChange({ ...control, exception: { ...control.exception, ignoredConditionId: e.target.value } })
                  }
                  placeholder="ID de condición..."
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[11px]">Descripción</Label>
                <Input
                  value={control.exception.description || ""}
                  onChange={(e) =>
                    onChange({ ...control, exception: { ...control.exception, description: e.target.value } })
                  }
                  placeholder="Ej: Ignora el requisito pagando 4 ES..."
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
