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
  getDerivedStatLabel,
  getResourceLabel,
  getTagLabel,
  getCounterLabel,
  getConditionLogicLabel,
  MECHANICAL_LABELS,
} from "../../domain/mechanicalLabels.ts";
import {
  deriveEffectiveBehaviorResolution,
  type TechniqueFunctionalCategory,
} from "../../domain/characterTechnique.ts";
import { MechanicalEffectsEditor } from "./MechanicalEffectsEditor.tsx";
import { MechanicalDescriptionPreview } from "./MechanicalDescriptionPreview.tsx";
import type { SystemMechanicsConfig, SupportDifficultyTier } from "../../domain/systemMechanics.ts";
import { getCategoryOptions, findHealingOption, getValidHealingOptions, getBarrierAmount, createCoreCategories, getVisibleOptions } from "../../domain/coreRuleCatalog.ts";

interface MechanicalBehaviorsEditorProps {
  behaviors: MechanicalBehavior[];
  onChange: (behaviors: MechanicalBehavior[]) => void;
  // Optional legacy props for full compatibility
  legacyEffects?: unknown[];
  onLegacyChange?: (effects: unknown[]) => void;
  mechanics?: SystemMechanicsConfig;
  maxLevel?: number;
  structuralCost?: number;
  supportDifficultyTiers?: SupportDifficultyTier[];
  activationAttributeId?: string | null;
  classification?: TechniqueFunctionalCategory | null;
}

export function MechanicalBehaviorsEditor({
  behaviors,
  onChange,
  legacyEffects = [],
  onLegacyChange,
  mechanics = [],
  maxLevel,
  structuralCost,
  supportDifficultyTiers,
  activationAttributeId,
  classification,
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
            <>
              <MechanicalDescriptionPreview behaviors={behaviors} />
              {behaviors.map((behavior, bIndex) => (
                <SingleBehaviorCard
                  key={behavior.id}
                  behavior={behavior}
                  index={bIndex}
                  total={behaviors.length}
                  onUpdate={(updated) => updateBehavior(bIndex, updated)}
                  onRemove={() => removeBehavior(bIndex)}
                  onMoveUp={() => moveBehavior(bIndex, "up")}
                  onMoveDown={() => moveBehavior(bIndex, "down")}
                  mechanics={mechanics}
                  structuralCost={structuralCost}
                  supportDifficultyTiers={supportDifficultyTiers}
                  activationAttributeId={activationAttributeId}
                  classification={classification}
                />
              ))}
            </>
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
  mechanics?: SystemMechanicsConfig;
  structuralCost?: number;
  supportDifficultyTiers?: SupportDifficultyTier[];
  activationAttributeId?: string | null;
  classification?: TechniqueFunctionalCategory | null;
}

function SingleBehaviorCard({
  behavior,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  mechanics = [],
  structuralCost,
  supportDifficultyTiers,
  activationAttributeId,
  classification,
}: SingleBehaviorCardProps) {
  const mode = behavior.mode;
  const activationOptions = getCategoryOptions(mechanics, "activation");
  const triggerOptions = getCategoryOptions(mechanics, "trigger");

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
                        {getVisibleOptions(activationOptions, behavior.activation?.actionType).map((opt) => (
                          <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                            {opt.name || getMechanicalLabel("actionTypes", opt.runtimeKey)}
                            {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                            {opt.isAvailable === false ? " · No disponible" : ""}
                          </SelectItem>
                        ))}
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
                        {getVisibleOptions(triggerOptions, behavior.trigger?.kind).map((opt) => (
                          <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                            {opt.name || getMechanicalLabel("triggers", opt.runtimeKey)}
                            {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                            {opt.isAvailable === false ? " · No disponible" : ""}
                          </SelectItem>
                        ))}
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
                mechanics={mechanics}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 4. RESOLUTION SECTION */}
          {(() => {
            const effRes = deriveEffectiveBehaviorResolution(behavior, {
              structuralCost,
              supportDifficultyTiers,
              activationAttributeId,
              classification,
            });
            return (
              <AccordionItem value="resolution" className="border rounded-md px-3 bg-muted/10">
                <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="size-3.5" />
                    <span>Resolución</span>
                    <Badge variant="outline" className="text-[10px] font-normal ml-1">
                      {effRes.summaryLabel}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3 space-y-3">
                  <ResolutionEditor
                    behavior={behavior}
                    resolution={behavior.resolution || { type: "automatic", outcomes: [] }}
                    onChange={(resolution) => onUpdate({ ...behavior, resolution })}
                    mechanics={mechanics}
                    structuralCost={structuralCost}
                    supportDifficultyTiers={supportDifficultyTiers}
                    activationAttributeId={activationAttributeId}
                    classification={classification}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })()}

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
                mechanics={mechanics}
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
                mechanics={mechanics}
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
                mechanics={mechanics}
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
                mechanics={mechanics}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 9. ADVANCED CONTROL SECTION */}
          <AccordionItem value="control" className="border rounded-md px-3 bg-muted/10">
            <AccordionTrigger className="py-2.5 hover:no-underline text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sliders className="size-3.5" />
                <span>Control Avanzado (Contadores, Caps, Resets, Excepciones)</span>
                {behavior.control?.counter && (
                  <Badge variant="secondary" className="text-[10px] font-normal ml-1">
                    {behavior.control.counter.name || getCounterLabel(behavior.control.counter.id) || "Contador activo"}
                  </Badge>
                )}
                {behavior.control && !behavior.control.counter && (
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
  mechanics = [],
}: {
  conditions: MechanicalCondition[];
  logic: "all" | "any";
  onChange: (conditions: MechanicalCondition[], logic: "all" | "any") => void;
  mechanics?: SystemMechanicsConfig;
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
              <SelectValue>{getConditionLogicLabel(logic)}</SelectValue>
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
                  } else if (val === "counter") {
                    updateCond(i, { type: "counter", counterId: "combat_counter", comparison: ">=", value: 1, negated: cond.negated });
                  } else if (val === "tag") {
                    updateCond(i, { type: "tag", tag: "fire", scope: "attack", negated: cond.negated });
                  } else if (val === "die") {
                    updateCond(i, { type: "die", dieSelection: "both", comparison: "=", value: 10, negated: cond.negated });
                  } else if (val === "manual") {
                    updateCond(i, { type: "manual", signalId: "permiso_master", description: "", negated: cond.negated });
                  } else if (val === "equipped") {
                    updateCond(i, { type: "equipped", negated: cond.negated });
                  } else {
                    updateCond(i, { type: "resource", resourceId: "ES", comparison: "<=", value: 0, negated: cond.negated });
                  }
                }}
              >
                <SelectTrigger className="h-7 w-38 text-xs font-semibold">
                  <SelectValue>{getMechanicalLabel("conditionTypes", cond.type)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipped">Equipado</SelectItem>
                  <SelectItem value="resource">Recurso (Valor)</SelectItem>
                  <SelectItem value="percentage">Recurso (Porcentaje)</SelectItem>
                  <SelectItem value="status">Estado Alterado</SelectItem>
                  <SelectItem value="counter">Contador de combate</SelectItem>
                  <SelectItem value="die">Dado Individual</SelectItem>
                  <SelectItem value="tag">Etiqueta (Tag)</SelectItem>
                  <SelectItem value="manual">Manual / Narrativa</SelectItem>
                </SelectContent>
              </Select>

              {/* Dynamic inputs based on condition type */}
              <div className="flex-1 flex flex-wrap items-center gap-2 w-full">
                {cond.type === "equipped" && (
                  <span className="text-xs text-muted-foreground italic py-0.5">
                    Requiere que el objeto esté equipado.
                  </span>
                )}
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

                {cond.type === "counter" && (
                  <>
                    <Select
                      value={cond.counterId || "combat_counter"}
                      onValueChange={(val: any) => updateCond(i, { ...cond, counterId: val })}
                    >
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <SelectValue>{getCounterLabel(cond.counterId || "combat_counter")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="combat_counter">Contador de combate</SelectItem>
                        <SelectItem value="charges">Cargas</SelectItem>
                        <SelectItem value="combo">Combo</SelectItem>
                        <SelectItem value="uses">Usos</SelectItem>
                        <SelectItem value="focus">Concentración</SelectItem>
                        <SelectItem value="heat">Calor / Tensión</SelectItem>
                        <SelectItem value="impacto">Impacto</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={cond.comparison}
                      onValueChange={(val: any) => updateCond(i, { ...cond, comparison: val })}
                    >
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue>{cond.comparison}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value=">=">&ge;</SelectItem>
                        <SelectItem value="<=">&le;</SelectItem>
                        <SelectItem value=">">&gt;</SelectItem>
                        <SelectItem value="<">&lt;</SelectItem>
                        <SelectItem value="!=">&ne;</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={cond.value}
                      onChange={(e) => updateCond(i, { ...cond, value: parseInt(e.target.value, 10) || 0 })}
                      className="h-7 w-16 text-xs font-mono"
                    />
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

                {cond.type === "manual" && (() => {
                  const manualCondOpts = getCategoryOptions(mechanics, "manual_condition");
                  const addReqOpts = getCategoryOptions(mechanics, "additional_requirement");
                  const allOptions = [...manualCondOpts, ...addReqOpts].filter(
                    (opt) =>
                      opt.runtimeKey === "consumption" ||
                      opt.runtimeKey === "consume_something" ||
                      opt.id.includes("manual_condition") ||
                      opt.id.includes("consumption") ||
                      opt.ruleType === "component"
                  );

                  if (allOptions.length === 0) {
                    const coreCats = createCoreCategories();
                    allOptions.push(
                      ...getCategoryOptions(coreCats, "manual_condition"),
                      ...getCategoryOptions(coreCats, "additional_requirement")
                    );
                  }

                  const isCustom = !allOptions.some(
                    (opt) => opt.id === cond.signalId || opt.runtimeKey === cond.signalId
                  );

                  return (
                    <div className="flex flex-1 flex-wrap gap-2 items-center">
                      <Select
                        value={isCustom ? "custom" : cond.signalId}
                        onValueChange={(val) => {
                          if (val === "custom") {
                            updateCond(i, { ...cond, signalId: "permiso_master" });
                          } else {
                            updateCond(i, { ...cond, signalId: val });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 min-w-[150px] flex-1 text-xs bg-background">
                          <SelectValue placeholder="Seleccionar condición..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allOptions.map((opt) => (
                            <SelectItem key={opt.id || opt.runtimeKey} value={opt.id || opt.runtimeKey}>
                              {opt.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Otro (Personalizado/Legado)...</SelectItem>
                        </SelectContent>
                      </Select>

                      {isCustom ? (
                        <Input
                          value={cond.signalId}
                          onChange={(e) => updateCond(i, { ...cond, signalId: e.target.value })}
                          placeholder="ID o señal de condición..."
                          className="h-7 w-48 text-xs"
                        />
                      ) : (
                        <Input
                          value={cond.description || ""}
                          onChange={(e) => updateCond(i, { ...cond, description: e.target.value })}
                          placeholder="Detalle opcional (ej: sangre del objetivo)..."
                          className="h-7 w-48 text-xs"
                        />
                      )}
                    </div>
                  );
                })()}

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
  behavior,
  resolution,
  onChange,
  mechanics = [],
  structuralCost,
  supportDifficultyTiers,
  activationAttributeId,
  classification,
}: {
  behavior: MechanicalBehavior;
  resolution: {
    type: "automatic" | "roll" | "rd" | "manual";
    difficulty?: number;
    attribute?: string;
    skill?: string;
    attackType?: "physical" | "mental";
    description?: string;
    outcomes?: DifferentiatedOutcome[];
    isExplicit?: boolean;
    explicitOverride?: boolean;
  };
  onChange: (res: any) => void;
  mechanics?: SystemMechanicsConfig;
  structuralCost?: number;
  supportDifficultyTiers?: SupportDifficultyTier[];
  activationAttributeId?: string | null;
  classification?: TechniqueFunctionalCategory | null;
}) {
  const effective = deriveEffectiveBehaviorResolution(behavior, {
    structuralCost,
    supportDifficultyTiers,
    activationAttributeId,
    classification,
  });
  const isExplicit = Boolean(
    resolution?.isExplicit ||
    resolution?.explicitOverride ||
    (resolution?.type &&
      resolution.type !== "automatic" &&
      (resolution.type === "rd" ||
        resolution.type === "manual" ||
        Boolean(resolution.attribute) ||
        Boolean(resolution.skill)))
  );
  const activeType = isExplicit ? resolution.type : effective.type;

  const resolutionOptions = getCategoryOptions(mechanics, "resolution");

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
      {!isExplicit ? (
        <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20 text-xs">
          <span className="text-primary font-medium">
            Resolución derivada automáticamente: <strong>{effective.summaryLabel}</strong>
          </span>
          <span className="text-[10px] text-muted-foreground">
            (Modifica cualquier campo para override manual)
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs">
          <span className="text-amber-400 font-medium">
            Resolución manual (Override activo)
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() =>
              onChange({
                type: "automatic",
                isExplicit: false,
                explicitOverride: false,
                outcomes: resolution.outcomes,
              })
            }
          >
            Restaurar derivación automática
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Tipo de Resolución</Label>
          <Select
            value={activeType}
            onValueChange={(val: any) =>
              onChange({ ...resolution, type: val, isExplicit: true, explicitOverride: true })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue>{getMechanicalLabel("resolutions", activeType)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {getVisibleOptions(resolutionOptions, activeType).map((opt) => (
                <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                  {opt.name || getMechanicalLabel("resolutions", opt.runtimeKey)}
                  {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                  {opt.isAvailable === false ? " · No disponible" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeType === "roll" && (
          <>
            <div className="grid gap-1.5">
              <Label className="text-xs">Tipo de Ataque (Oposición)</Label>
              <Select
                value={resolution.attackType || effective.attackType || "none"}
                onValueChange={(val: string) =>
                  onChange({
                    ...resolution,
                    type: "roll",
                    attackType: val === "none" ? undefined : (val as "physical" | "mental"),
                    isExplicit: true,
                    explicitOverride: true,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background font-medium">
                  <SelectValue placeholder="Selecciona tipo de ataque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin clasificar / Acción general</SelectItem>
                  <SelectItem value="physical">Físico (contra Evasión)</SelectItem>
                  <SelectItem value="mental">Mental (contra Coraje)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Atributo Exigido</Label>
              <Select
                value={resolution.attribute || "none"}
                onValueChange={(val) =>
                  onChange({
                    ...resolution,
                    type: "roll",
                    attribute: val === "none" ? undefined : val,
                    isExplicit: true,
                    explicitOverride: true,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Seleccionar Atributo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin atributo específico</SelectItem>
                  <SelectItem value="FUE">Fuerza (FUE)</SelectItem>
                  <SelectItem value="DES">Destreza (DES)</SelectItem>
                  <SelectItem value="RES">Resistencia (RES)</SelectItem>
                  <SelectItem value="INT">Inteligencia (INT)</SelectItem>
                  <SelectItem value="VOL">Voluntad (VOL)</SelectItem>
                  <SelectItem value="VEL">Velocidad (VEL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Habilidad (Opcional)</Label>
              <Select
                value={resolution.skill || "none"}
                onValueChange={(val) =>
                  onChange({
                    ...resolution,
                    type: "roll",
                    skill: val === "none" ? undefined : val,
                    isExplicit: true,
                    explicitOverride: true,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Seleccionar Habilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin habilidad específica</SelectItem>
                  <SelectItem value="Combate cuerpo a cuerpo">Combate cuerpo a cuerpo</SelectItem>
                  <SelectItem value="Combate con armas">Combate con armas</SelectItem>
                  <SelectItem value="Tirador">Tirador</SelectItem>
                  <SelectItem value="Dominio de Quirk">Dominio de Quirk</SelectItem>
                  <SelectItem value="Atletismo">Atletismo</SelectItem>
                  <SelectItem value="Percepción">Percepción</SelectItem>
                  <SelectItem value="Medicina">Medicina</SelectItem>
                  <SelectItem value="Sigilo">Sigilo</SelectItem>
                  <SelectItem value="Tecnología">Tecnología</SelectItem>
                  <SelectItem value="Acrobacia">Acrobacia</SelectItem>
                  <SelectItem value="Intimidación">Intimidación</SelectItem>
                  <SelectItem value="Estrategia">Estrategia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {activeType === "rd" && (
          <>
            <div className="grid gap-1.5">
              <Label className="text-xs">Dificultad (RD fija)</Label>
              <Input
                type="number"
                value={resolution.difficulty ?? (effective.difficulty ?? "")}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  onChange({
                    ...resolution,
                    type: "rd",
                    difficulty: val === "" ? undefined : parseInt(val, 10) || 0,
                    isExplicit: true,
                    explicitOverride: true,
                  });
                }}
                placeholder="Ej: 12, 16... (vacío = RD sistema)"
                className="h-8 text-xs bg-background font-mono font-bold"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Atributo Exigido</Label>
              <Select
                value={resolution.attribute || "none"}
                onValueChange={(val) =>
                  onChange({
                    ...resolution,
                    type: "rd",
                    attribute: val === "none" ? undefined : val,
                    isExplicit: true,
                    explicitOverride: true,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Seleccionar Atributo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin atributo específico</SelectItem>
                  <SelectItem value="FUE">Fuerza (FUE)</SelectItem>
                  <SelectItem value="DES">Destreza (DES)</SelectItem>
                  <SelectItem value="RES">Resistencia (RES)</SelectItem>
                  <SelectItem value="INT">Inteligencia (INT)</SelectItem>
                  <SelectItem value="VOL">Voluntad (VOL)</SelectItem>
                  <SelectItem value="VEL">Velocidad (VEL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Habilidad (Opcional)</Label>
              <Select
                value={resolution.skill || "none"}
                onValueChange={(val) =>
                  onChange({
                    ...resolution,
                    type: "rd",
                    skill: val === "none" ? undefined : val,
                    isExplicit: true,
                    explicitOverride: true,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Seleccionar Habilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin habilidad específica</SelectItem>
                  <SelectItem value="Combate cuerpo a cuerpo">Combate cuerpo a cuerpo</SelectItem>
                  <SelectItem value="Combate con armas">Combate con armas</SelectItem>
                  <SelectItem value="Tirador">Tirador</SelectItem>
                  <SelectItem value="Dominio de Quirk">Dominio de Quirk</SelectItem>
                  <SelectItem value="Atletismo">Atletismo</SelectItem>
                  <SelectItem value="Percepción">Percepción</SelectItem>
                  <SelectItem value="Medicina">Medicina</SelectItem>
                  <SelectItem value="Sigilo">Sigilo</SelectItem>
                  <SelectItem value="Tecnología">Tecnología</SelectItem>
                  <SelectItem value="Acrobacia">Acrobacia</SelectItem>
                  <SelectItem value="Intimidación">Intimidación</SelectItem>
                  <SelectItem value="Estrategia">Estrategia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {activeType === "manual" && (
          <div className="grid gap-1.5 sm:col-span-2 md:col-span-3">
            <Label className="text-xs">Instrucción / Descripción Narrativa</Label>
            <Input
              value={resolution.description || ""}
              onChange={(e) =>
                onChange({
                  ...resolution,
                  type: "manual",
                  description: e.target.value,
                  isExplicit: true,
                  explicitOverride: true,
                })
              }
              placeholder="Instrucción de resolución o criterio del narrador..."
              className="h-8 text-xs bg-background"
            />
          </div>
        )}
      </div>

      {/* Differentiated Outcomes for RD or Roll */}
      {(activeType === "rd" || activeType === "roll") && (
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
  mechanics = [],
}: {
  effects: MechanicalEffectItem[];
  onChange: (effects: MechanicalEffectItem[]) => void;
  mechanics?: SystemMechanicsConfig;
}) {
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});
  const damageOptions = getCategoryOptions(mechanics, "damage");
  const knownDamageDice = damageOptions.map((opt) => opt.runtimeKey);
  const damageTypeOptions = getCategoryOptions(mechanics, "damage_type");
  const rollTypeOptions = getCategoryOptions(mechanics, "roll_type");

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
                      <SelectItem value="derived_stat_modifier">📈 {MECHANICAL_LABELS.effectTypes.derived_stat_modifier}</SelectItem>
                      <SelectItem value="cost_modifier">⚡ {MECHANICAL_LABELS.effectTypes.cost_modifier}</SelectItem>
                      <SelectItem value="incoming_damage_modifier">🔥 {MECHANICAL_LABELS.effectTypes.incoming_damage_modifier}</SelectItem>
                      <SelectItem value="outgoing_damage_modifier">⚔️ {MECHANICAL_LABELS.effectTypes.outgoing_damage_modifier}</SelectItem>
                      <SelectItem value="roll_modifier">🎲 {MECHANICAL_LABELS.effectTypes.roll_modifier}</SelectItem>
                      <SelectItem value="status_apply">🌀 {MECHANICAL_LABELS.effectTypes.status_apply}</SelectItem>
                      <SelectItem value="turn_loss">🛑 {MECHANICAL_LABELS.effectTypes.turn_loss}</SelectItem>
                      <SelectItem value="action_block">🔒 {MECHANICAL_LABELS.effectTypes.action_block}</SelectItem>
                      <SelectItem value="counter_modifier">🔢 {MECHANICAL_LABELS.effectTypes.counter_modifier}</SelectItem>
                      <SelectItem value="manual">📝 {MECHANICAL_LABELS.effectTypes.manual}</SelectItem>
                      <SelectItem value="transformation">🧬 {MECHANICAL_LABELS.effectTypes.transformation}</SelectItem>
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
                      <Select
                        value={(eff as any).ruleId || (eff as any).runtimeKey || eff.dice || "2D6"}
                        onValueChange={(val) => {
                          const matched = damageOptions.find((opt) => opt.id === val || opt.runtimeKey === val || opt.name === val);
                          const resolvedFormula = matched?.formula || matched?.runtimeKey || matched?.name || val;
                          updateEffect(i, {
                            ...eff,
                            dice: resolvedFormula,
                            formula: resolvedFormula,
                            ruleId: matched?.id,
                            runtimeKey: matched?.runtimeKey,
                          } as any);
                        }}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs font-mono font-bold">
                          <SelectValue placeholder="Seleccionar dado...">
                            {damageOptions.find((opt) => opt.id === ((eff as any).ruleId || eff.dice) || opt.runtimeKey === ((eff as any).runtimeKey || eff.dice) || opt.formula === eff.dice || opt.name === eff.dice)?.name || eff.dice || "Seleccionar..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {getVisibleOptions(damageOptions, (eff as any).ruleId || (eff as any).runtimeKey || eff.dice).map((opt) => (
                            <SelectItem key={opt.id || opt.runtimeKey} value={opt.id || opt.runtimeKey}>
                              {opt.name || opt.formula || opt.runtimeKey}
                              {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                              {opt.isAvailable === false ? " · No disponible" : ""}
                            </SelectItem>
                          ))}
                          {!damageOptions.some((opt) => opt.id === eff.dice || opt.runtimeKey === eff.dice || opt.formula === eff.dice || opt.name === eff.dice) && eff.dice && (
                            <SelectItem key="legacy" value={eff.dice} disabled>
                              {eff.dice} (Personalizado)
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Tipo de Daño</Label>
                      <Select
                        value={eff.damageType || "fisico"}
                        onValueChange={(val) => {
                          const matched = damageTypeOptions.find((opt) => opt.runtimeKey === val);
                          updateEffect(i, {
                            ...eff,
                            damageType: val,
                            ...(matched ? { damageTypeRuleId: matched.id } : {}),
                          } as any);
                        }}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue>
                            {damageTypeOptions.find((opt) => opt.runtimeKey === (eff.damageType || "fisico"))?.name ||
                              getMechanicalLabel("damageTypes", eff.damageType || "fisico")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {getVisibleOptions(damageTypeOptions, eff.damageType || "fisico").map((opt) => (
                            <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                              {opt.name || getMechanicalLabel("damageTypes", opt.runtimeKey)}
                              {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                              {opt.isAvailable === false ? " · No disponible" : ""}
                            </SelectItem>
                          ))}
                          {!damageTypeOptions.some((opt) => opt.runtimeKey === (eff.damageType || "fisico")) && eff.damageType && (
                            <SelectItem key="legacy" value={eff.damageType}>
                              {getMechanicalLabel("damageTypes", eff.damageType) || eff.damageType}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {eff.type === "healing" && (() => {
                  const healingOption = findHealingOption(mechanics, eff as any, eff.resourceId || "SA");
                  const validOptions = getValidHealingOptions(mechanics, eff.resourceId || "SA");
                  const isInvalid = (eff.amount !== undefined || (eff as any).formula !== undefined || (eff as any).dice !== undefined) && !healingOption;
                  const currentSelectedKey = healingOption?.id || (healingOption ? `${healingOption.kind}:${healingOption.kind === 'dice' ? healingOption.formula : healingOption.amount}` : "");

                  return (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Recurso</Label>
                        <Select
                          value={eff.resourceId || "SA"}
                          onValueChange={(val: any) => {
                            const newOpt = findHealingOption(mechanics, eff as any, val);
                            updateEffect(i, {
                              ...eff,
                              resourceId: val,
                              ruleId: newOpt?.id,
                              runtimeKey: newOpt?.runtimeKey,
                            });
                          }}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue>{getResourceLabel(eff.resourceId || "SA")}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SA">Salud (SA)</SelectItem>
                            <SelectItem value="ES">Estamina (ES)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[11px]">Curación</Label>
                          {healingOption && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({healingOption.cost > 0 ? `+${healingOption.cost} CE` : `${healingOption.cost} CE`})
                            </span>
                          )}
                        </div>
                        <Select
                          value={currentSelectedKey || "unconfigured"}
                          onValueChange={(val: string) => {
                            const selected = validOptions.find(o => o.ruleId === val || `${o.kind}:${o.kind === 'dice' ? o.formula : o.amount}` === val);
                            if (selected) {
                              updateEffect(i, {
                                ...eff,
                                kind: selected.kind,
                                amount: selected.kind === "fixed" ? selected.amount : undefined,
                                formula: selected.kind === "dice" ? selected.formula : undefined,
                                dice: selected.kind === "dice" ? selected.formula : undefined,
                                magnitude: selected.magnitude,
                                ruleId: selected.ruleId,
                                runtimeKey: selected.runtimeKey,
                              } as any);
                            }
                          }}
                        >
                          <SelectTrigger className={`h-7 min-w-[140px] font-mono text-xs ${isInvalid ? "border-red-500 focus-visible:ring-red-500 text-red-500" : ""}`}>
                            <SelectValue placeholder="Seleccionar curación">
                              {healingOption ? (
                                `${healingOption.name || (healingOption.kind === "dice" ? healingOption.formula : healingOption.amount)} (${healingOption.cost > 0 ? `+${healingOption.cost} CE` : `${healingOption.cost} CE`})`
                              ) : isInvalid ? (
                                `${(eff as any).formula ?? (eff as any).dice ?? eff.amount ?? "No configurado"}`
                              ) : (
                                "Seleccionar..."
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {getVisibleOptions(validOptions, currentSelectedKey).map((opt) => (
                              <SelectItem key={opt.ruleId} value={opt.ruleId}>
                                {opt.name ? `${opt.name} (${opt.cost > 0 ? `+${opt.cost} CE` : `${opt.cost} CE`})` : opt.label}
                                {opt.isAvailable === false ? " · No disponible" : ""}
                              </SelectItem>
                            ))}
                            {isInvalid && (
                              <SelectItem value="unconfigured" disabled>
                                {(eff as any).formula ?? (eff as any).dice ?? eff.amount} (No configurado)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {isInvalid && (
                        <div className="w-full text-[11px] text-red-500 font-medium">
                          Esta cantidad o fórmula no está configurada en las reglas del sistema.
                        </div>
                      )}
                    </>
                  );
                })()}

                {eff.type === "barrier" && (() => {
                  const barrierOptions = getCategoryOptions(mechanics, "barrier");
                  const rawBarrierList = barrierOptions
                    .map((opt) => ({
                      id: opt.id,
                      runtimeKey: opt.runtimeKey,
                      name: opt.name,
                      cost: opt.cost,
                      amount: getBarrierAmount(opt),
                      isAvailable: opt.isAvailable,
                    }))
                    .filter((b) => b.amount > 0);
                  const barrierList = getVisibleOptions(rawBarrierList, eff.amount)
                    .sort((a, b) => a.amount - b.amount);

                  return (
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Puntos de Barrera</Label>
                      <Select
                        value={eff.amount ? String(eff.amount) : ""}
                        onValueChange={(val) => {
                          const numVal = parseInt(val, 10);
                          const matchedOpt = barrierList.find((b) => b.amount === numVal);
                          updateEffect(i, {
                            ...eff,
                            amount: numVal,
                            ruleId: matchedOpt?.id,
                            runtimeKey: matchedOpt?.runtimeKey,
                          } as any);
                        }}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs font-mono font-bold">
                          <SelectValue placeholder="Seleccionar barrera...">
                            {eff.amount ? `${eff.amount} Puntos` : "Seleccionar barrera..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {barrierList.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.amount)}>
                              {opt.name || `${opt.amount} Puntos`}
                              {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                              {opt.isAvailable === false ? " · No disponible" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

                {eff.type === "attribute_modifier" && (() => {
                  const rawAttrOpts = getCategoryOptions(mechanics, "attribute");
                  const visibleAttrOpts = getVisibleOptions(rawAttrOpts, eff.attributeId);
                  const rawAmountOpts = getCategoryOptions(mechanics, "numeric_modifier");
                  const visibleAmountOpts = getVisibleOptions(rawAmountOpts, eff.amount ?? 0);
                  const currentAttrOpt = rawAttrOpts.find(o => o.runtimeKey === eff.attributeId || o.id === eff.attributeId);
                  const currentAmountOpt = rawAmountOpts.find(o => o.runtimeKey === String(eff.amount ?? 0) || o.id === String(eff.amount ?? 0));

                  return (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Atributo</Label>
                        <Select
                          value={eff.attributeId || "FUE"}
                          onValueChange={(val) => updateEffect(i, { ...eff, attributeId: val })}
                        >
                          <SelectTrigger className="h-7 w-40 text-xs font-medium">
                            <SelectValue>{currentAttrOpt ? `${currentAttrOpt.name}${currentAttrOpt.cost ? ` (+${currentAttrOpt.cost} CE)` : ''}` : `${getAttributeLabel(eff.attributeId)} · Valor histórico sin regla de CE`}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {visibleAttrOpts.map((opt) => (
                              <SelectItem key={opt.id} value={opt.runtimeKey}>
                                {opt.name}{opt.cost ? ` (+${opt.cost} CE)` : ''}{!opt.isAvailable ? ' · No disponible' : ''}
                              </SelectItem>
                            ))}
                            {!currentAttrOpt && eff.attributeId && (
                              <SelectItem value={eff.attributeId}>
                                {getAttributeLabel(eff.attributeId)} · Valor histórico sin regla de CE
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Magnitud / Bono</Label>
                        <Select
                          value={String(eff.amount ?? 1)}
                          onValueChange={(val) => updateEffect(i, { ...eff, amount: parseInt(val, 10) || 0 })}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs font-mono font-medium">
                            <SelectValue>{currentAmountOpt ? `${currentAmountOpt.name}${currentAmountOpt.cost ? ` (+${currentAmountOpt.cost} CE)` : ''}` : `${(eff.amount ?? 0) >= 0 ? '+' : ''}${eff.amount} · Valor histórico sin regla de CE`}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {visibleAmountOpts.map((opt) => (
                              <SelectItem key={opt.id} value={String(opt.amount ?? opt.runtimeKey)}>
                                {opt.name}{opt.cost ? ` (+${opt.cost} CE)` : ''}{!opt.isAvailable ? ' · No disponible' : ''}
                              </SelectItem>
                            ))}
                            {!currentAmountOpt && eff.amount !== undefined && eff.amount !== null && (
                              <SelectItem value={String(eff.amount)}>
                                {eff.amount >= 0 ? `+${eff.amount}` : eff.amount} · Valor histórico sin regla de CE
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
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
                  );
                })()}

                {eff.type === "derived_stat_modifier" && (() => {
                  const rawStatOpts = getCategoryOptions(mechanics, "derived_stat");
                  const visibleStatOpts = getVisibleOptions(rawStatOpts, eff.statId);
                  const rawAmountOpts = getCategoryOptions(mechanics, "numeric_modifier");
                  const visibleAmountOpts = getVisibleOptions(rawAmountOpts, eff.amount ?? 0);
                  const currentStatOpt = rawStatOpts.find(o => o.runtimeKey === eff.statId || o.id === eff.statId);
                  const currentAmountOpt = rawAmountOpts.find(o => o.runtimeKey === String(eff.amount ?? 0) || o.id === String(eff.amount ?? 0));

                  return (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Estadística Derivada</Label>
                        <Select
                          value={eff.statId || "SAL"}
                          onValueChange={(val) => updateEffect(i, { ...eff, statId: val })}
                        >
                          <SelectTrigger className="h-7 w-48 text-xs font-medium">
                            <SelectValue>{currentStatOpt ? `${currentStatOpt.name}${currentStatOpt.cost ? ` (+${currentStatOpt.cost} CE)` : ''}` : `${getDerivedStatLabel(eff.statId || "SAL")} · Valor histórico sin regla de CE`}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {visibleStatOpts.map((opt) => (
                              <SelectItem key={opt.id} value={opt.runtimeKey}>
                                {opt.name}{opt.cost ? ` (+${opt.cost} CE)` : ''}{!opt.isAvailable ? ' · No disponible' : ''}
                              </SelectItem>
                            ))}
                            {!currentStatOpt && eff.statId && (
                              <SelectItem value={eff.statId}>
                                {getDerivedStatLabel(eff.statId)} · Valor histórico sin regla de CE
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Magnitud / Bono</Label>
                        <Select
                          value={String(eff.amount ?? 1)}
                          onValueChange={(val) => updateEffect(i, { ...eff, amount: parseInt(val, 10) || 0 })}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs font-mono font-medium">
                            <SelectValue>{currentAmountOpt ? `${currentAmountOpt.name}${currentAmountOpt.cost ? ` (+${currentAmountOpt.cost} CE)` : ''}` : `${(eff.amount ?? 0) >= 0 ? '+' : ''}${eff.amount} · Valor histórico sin regla de CE`}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {visibleAmountOpts.map((opt) => (
                              <SelectItem key={opt.id} value={String(opt.amount ?? opt.runtimeKey)}>
                                {opt.name}{opt.cost ? ` (+${opt.cost} CE)` : ''}{!opt.isAvailable ? ' · No disponible' : ''}
                              </SelectItem>
                            ))}
                            {!currentAmountOpt && eff.amount !== undefined && eff.amount !== null && (
                              <SelectItem value={String(eff.amount)}>
                                {eff.amount >= 0 ? `+${eff.amount}` : eff.amount} · Valor histórico sin regla de CE
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
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
                  );
                })()}

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
                      <Select
                        value={eff.rollType || "action"}
                        onValueChange={(val) => updateEffect(i, { ...eff, rollType: val })}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue>{getMechanicalLabel("rollTypes", eff.rollType || "action")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {rollTypeOptions.map((opt) => (
                            <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                              {opt.name || getMechanicalLabel("rollTypes", opt.runtimeKey)}
                              {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                {eff.type === "status_apply" && (() => {
                  const statusOptions = getCategoryOptions(mechanics, "status");
                  return (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Estado Alterado</Label>
                        <Select
                          value={eff.statusElementId}
                          onValueChange={(val) => {
                            const matched = statusOptions.find((s) => s.id === val || s.runtimeKey === val);
                            updateEffect(i, {
                              ...eff,
                              statusElementId: val,
                              ruleId: matched?.id,
                              runtimeKey: matched?.runtimeKey,
                            } as any);
                          }}
                        >
                          <SelectTrigger className="h-7 w-48 text-xs font-medium">
                            <SelectValue placeholder="Seleccionar estado...">
                              {statusOptions.find((s) => s.id === eff.statusElementId || s.runtimeKey === eff.statusElementId)?.name ||
                                getAlteredStatusLabel(eff.statusElementId)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {getVisibleOptions(statusOptions, eff.statusElementId).map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                                {s.cost > 0 ? ` (+${s.cost} CE)` : s.cost < 0 ? ` (${s.cost} CE)` : ""}
                                {s.isAvailable === false ? " · No disponible" : ""}
                              </SelectItem>
                            ))}
                            {!statusOptions.some((s) => s.id === eff.statusElementId || s.runtimeKey === eff.statusElementId) &&
                              eff.statusElementId && (
                                <SelectItem key="custom" value={eff.statusElementId}>
                                  {getAlteredStatusLabel(eff.statusElementId)}
                                </SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                      </div>
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
                  );
                })()}

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
                      <Label className="text-[11px]">Contador</Label>
                      <Select
                        value={eff.counterId || "combat_counter"}
                        onValueChange={(val: any) => {
                          if (val === "custom") {
                            updateEffect(i, { ...eff, counterId: "nuevo_contador" });
                          } else {
                            updateEffect(i, { ...eff, counterId: val });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-40 text-xs">
                          <SelectValue>{getCounterLabel(eff.counterId || "combat_counter")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="combat_counter">Contador de combate</SelectItem>
                          <SelectItem value="charges">Cargas</SelectItem>
                          <SelectItem value="combo">Combo</SelectItem>
                          <SelectItem value="uses">Usos</SelectItem>
                          <SelectItem value="focus">Concentración</SelectItem>
                          <SelectItem value="heat">Calor / Tensión</SelectItem>
                          <SelectItem value="impacto">Impacto</SelectItem>
                          <SelectItem value="custom">Otro (personalizado)...</SelectItem>
                        </SelectContent>
                      </Select>
                      {eff.counterId && !["combat_counter", "charges", "combo", "uses", "focus", "heat", "impacto"].includes(eff.counterId) && (
                        <Input
                          value={eff.counterId || ""}
                          onChange={(e) => updateEffect(i, { ...eff, counterId: e.target.value })}
                          placeholder="ID de contador..."
                          className="h-7 w-32 text-xs font-mono"
                        />
                      )}
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

                {eff.type === "transformation" && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Magnitud de Transformación</Label>
                      <Select
                        value={eff.magnitude?.type || "corporal"}
                        onValueChange={(val) => {
                          const costMap: Record<string, number> = {
                            body: 1,
                            corporal: 1,
                            "2m": 2,
                            "5m": 3,
                            "10m": 4,
                            "20m": 6,
                          };
                          const structuralValue = costMap[val] ?? 1;
                          updateEffect(i, {
                            ...eff,
                            magnitude: { type: val, value: structuralValue },
                          });
                        }}
                      >
                        <SelectTrigger className="h-7 w-44 text-xs font-medium">
                          <SelectValue>
                            {getMechanicalLabel("transformationMagnitudes", eff.magnitude?.type || "corporal")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corporal">Corporal (+1 CE)</SelectItem>
                          <SelectItem value="2m">2 metros (+2 CE)</SelectItem>
                          <SelectItem value="5m">5 metros (+3 CE)</SelectItem>
                          <SelectItem value="10m">10 metros (+4 CE)</SelectItem>
                          <SelectItem value="20m">20 metros (+6 CE)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1 w-full max-w-xs">
                      <Label className="text-[11px]">Referencia de Forma / Contexto (Opcional)</Label>
                      <Input
                        value={eff.contextRef || ""}
                        onChange={(e) => updateEffect(i, { ...eff, contextRef: e.target.value })}
                        placeholder="Ej: persona cuya sangre fue consumida"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="grid gap-1 w-full max-w-xs">
                      <Label className="text-[11px]">Notas / Descripción (Opcional)</Label>
                      <Input
                        value={eff.description || ""}
                        onChange={(e) => updateEffect(i, { ...eff, description: e.target.value })}
                        placeholder="Detalles adicionales..."
                        className="h-7 text-xs"
                      />
                    </div>
                  </>
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
  mechanics = [],
}: {
  target: any;
  onChange: (target: any) => void;
  mechanics?: SystemMechanicsConfig;
}) {
  const allTargetOptions = getCategoryOptions(mechanics, "target");
  // For new configurations, filter out area, allies, enemies
  const targetOptions = allTargetOptions.filter((opt) => {
    if (opt.runtimeKey === target.type) return true;
    return !["area", "allies", "enemies"].includes(opt.runtimeKey);
  });
  const currentTargetOpt = allTargetOptions.find((o) => o.runtimeKey === (target.type || "self"));

  const targetCountOptions = getCategoryOptions(mechanics, "target_count");
  const currentCountKey = target.quantity?.mode === "all"
    ? "all"
    : (target.quantity?.count ? String(target.quantity.count) : (target.type === "enemies" || target.type === "allies" ? "all" : "1"));
  const currentCountOpt = targetCountOptions.find((o) => o.runtimeKey === currentCountKey);

  const rangeOptions = getCategoryOptions(mechanics, "range");
  const rangeTypeOptions = rangeOptions.filter((o) => ["self", "contact", "distance", "unlimited", "manual"].includes(o.runtimeKey));
  const currentRangeTypeOpt = rangeTypeOptions.find((o) => o.runtimeKey === (target.range?.type || "contact"));

  const discreteRangeDistances = rangeOptions.filter((o) => !["self", "contact", "distance", "unlimited", "manual"].includes(o.runtimeKey));
  const distanceOptions = discreteRangeDistances.length > 0
    ? discreteRangeDistances
    : [0, 5, 10, 20, 50].map((m) => ({ runtimeKey: String(m), name: `${m} m`, cost: 0, isAvailable: true }));
  const currentDistanceKey = String(target.range?.distanceMeters ?? (target.range?.distance ?? 10));
  const currentDistanceOpt = distanceOptions.find((o) => o.runtimeKey === currentDistanceKey);

  const areaOptions = getCategoryOptions(mechanics, "area");
  const areaShapeOptions = areaOptions.filter((o) => ["radius", "cone", "line", "zone"].includes(o.runtimeKey));
  const discreteAreaSizes = areaOptions.filter((o) => !["radius", "cone", "line", "zone"].includes(o.runtimeKey));
  const sizeOptions = discreteAreaSizes.length > 0
    ? discreteAreaSizes
    : [5, 10, 15, 20, 50].map((m) => ({ runtimeKey: String(m), name: `${m} m`, cost: 0, isAvailable: true }));
  const currentAreaShape = target.area?.shape;
  const currentSizeKey = String(target.area?.sizeMeters ?? (target.area?.radius ?? 5));
  const currentSizeOpt = sizeOptions.find((o) => o.runtimeKey === currentSizeKey);

  const selectionOptions = getCategoryOptions(mechanics, "selection_restriction");
  const currentSelMode = target.selectionMode || (target.selectionRestriction ? (target.selectionRestriction === "random" ? "random" : target.selectionRestriction === "manual" ? "manual" : "standard_priority") : "standard_priority");
  const currentSelOpt = selectionOptions.find((o) => o.runtimeKey === currentSelMode);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
      {/* 1. Tipo de Objetivo */}
      <div className="grid gap-1.5">
        <Label className="text-xs">Tipo de Objetivo</Label>
        <Select
          value={target.type || "self"}
          onValueChange={(val) => onChange({ ...target, type: val })}
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue>
              {currentTargetOpt
                ? `${currentTargetOpt.name || getMechanicalLabel("targets", currentTargetOpt.runtimeKey)}${currentTargetOpt.cost ? ` (+${currentTargetOpt.cost} CE)` : ""}`
                : `${getMechanicalLabel("targets", target.type) || target.type} · Valor histórico sin regla de CE`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getVisibleOptions(targetOptions, target.type || "self").map((opt) => (
              <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                {opt.name || getMechanicalLabel("targets", opt.runtimeKey)}
                {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                {opt.isAvailable === false ? " · No disponible" : ""}
              </SelectItem>
            ))}
            {!currentTargetOpt && target.type && (
              <SelectItem value={target.type} disabled>
                {getMechanicalLabel("targets", target.type) || target.type} · Valor histórico sin regla de CE
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Cantidad de Objetivos (target_count) */}
      <div className="grid gap-1.5">
        <Label className="text-xs">Cantidad de Objetivos</Label>
        <Select
          value={currentCountKey}
          onValueChange={(val) => {
            if (val === "all") {
              onChange({ ...target, quantity: { mode: "all" } });
            } else {
              onChange({ ...target, quantity: { mode: "up_to", count: parseInt(val, 10) || 1 } });
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue>
              {currentCountOpt
                ? `${currentCountOpt.name}${currentCountOpt.cost ? ` (+${currentCountOpt.cost} CE)` : ""}`
                : `${currentCountKey === "all" ? "Todos" : `Hasta ${currentCountKey}`} · Valor histórico sin regla de CE`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getVisibleOptions(targetCountOptions, currentCountKey).map((opt) => (
              <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                {opt.name}
                {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                {opt.isAvailable === false ? " · No disponible" : ""}
              </SelectItem>
            ))}
            {!currentCountOpt && currentCountKey && (
              <SelectItem value={currentCountKey} disabled>
                {currentCountKey === "all" ? "Todos los objetivos" : `Hasta ${currentCountKey}`} · Valor histórico sin regla de CE
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Rango */}
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
            <SelectValue>
              {currentRangeTypeOpt
                ? `${currentRangeTypeOpt.name || getMechanicalLabel("ranges", currentRangeTypeOpt.runtimeKey)}${currentRangeTypeOpt.cost ? ` (+${currentRangeTypeOpt.cost} CE)` : ""}`
                : `${getMechanicalLabel("ranges", target.range?.type) || target.range?.type} · Valor histórico sin regla de CE`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getVisibleOptions(rangeTypeOptions, target.range?.type || "contact").map((opt) => (
              <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                {opt.name || getMechanicalLabel("ranges", opt.runtimeKey)}
                {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                {opt.isAvailable === false ? " · No disponible" : ""}
              </SelectItem>
            ))}
            {!currentRangeTypeOpt && target.range?.type && (
              <SelectItem value={target.range.type} disabled>
                {getMechanicalLabel("ranges", target.range.type) || target.range.type} · Valor histórico sin regla de CE
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 4. Distancia Discreta (Metros) */}
      {target.range?.type === "distance" && (
        <div className="grid gap-1.5">
          <Label className="text-xs">Distancia de Rango</Label>
          <Select
            value={currentDistanceKey}
            onValueChange={(val) =>
              onChange({
                ...target,
                range: {
                  ...(target.range || { type: "distance" }),
                  distanceMeters: parseInt(val, 10) || 0,
                },
              })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue>
                {currentDistanceOpt
                  ? `${currentDistanceOpt.name}${currentDistanceOpt.cost ? ` (+${currentDistanceOpt.cost} CE)` : ""}`
                  : `${currentDistanceKey} m · Valor histórico sin regla de CE`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {getVisibleOptions(distanceOptions, currentDistanceKey).map((opt) => (
                <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                  {opt.name}
                  {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                  {opt.isAvailable === false ? " · No disponible" : ""}
                </SelectItem>
              ))}
              {!currentDistanceOpt && (
                <SelectItem value={currentDistanceKey} disabled>
                  {currentDistanceKey} m · Valor histórico sin regla de CE
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 5. Área de Efecto (Independiente del tipo de objetivo) */}
      <div className="grid gap-1.5">
        <Label className="text-xs">Área de Efecto</Label>
        <Select
          value={currentAreaShape || "none"}
          onValueChange={(val) => {
            if (val === "none") {
              onChange({ ...target, area: undefined });
            } else {
              onChange({
                ...target,
                area: {
                  shape: val,
                  sizeMeters: target.area?.sizeMeters ?? 5,
                },
              });
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue>
              {currentAreaShape
                ? getMechanicalLabel("areaShapes", currentAreaShape)
                : "Sin área (Objetivos directos)"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin área (Objetivos directos)</SelectItem>
            {getVisibleOptions(areaShapeOptions, currentAreaShape).map((opt) => (
              <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                {opt.name || getMechanicalLabel("areaShapes", opt.runtimeKey)}
                {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                {opt.isAvailable === false ? " · No disponible" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 6. Tamaño Discreto de Área (Metros) */}
      {currentAreaShape && (
        <div className="grid gap-1.5">
          <Label className="text-xs">Tamaño de Área</Label>
          <Select
            value={currentSizeKey}
            onValueChange={(val) =>
              onChange({
                ...target,
                area: {
                  ...(target.area || { shape: "radius" }),
                  sizeMeters: parseInt(val, 10) || 0,
                },
              })
            }
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue>
                {currentSizeOpt
                  ? `${currentSizeOpt.name}${currentSizeOpt.cost ? ` (+${currentSizeOpt.cost} CE)` : ""}`
                  : `${currentSizeKey} m · Valor histórico sin regla de CE`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {getVisibleOptions(sizeOptions, currentSizeKey).map((opt) => (
                <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                  {opt.name}
                  {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                  {opt.isAvailable === false ? " · No disponible" : ""}
                </SelectItem>
              ))}
              {!currentSizeOpt && (
                <SelectItem value={currentSizeKey} disabled>
                  {currentSizeKey} m · Valor histórico sin regla de CE
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 7. Modo de Selección */}
      <div className="grid gap-1.5">
        <Label className="text-xs">Modo de Selección</Label>
        <Select
          value={currentSelMode}
          onValueChange={(val) =>
            onChange({ ...target, selectionMode: val, selectionRestriction: undefined })
          }
        >
          <SelectTrigger className="h-8 text-xs bg-background">
            <SelectValue>
              {currentSelOpt
                ? `${currentSelOpt.name || getMechanicalLabel("selectionModes", currentSelOpt.runtimeKey)}${currentSelOpt.cost ? ` (+${currentSelOpt.cost} CE)` : ""}`
                : `${getMechanicalLabel("selectionModes", currentSelMode) || currentSelMode} · Valor histórico sin regla de CE`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {getVisibleOptions(selectionOptions, currentSelMode).map((opt) => (
              <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                {opt.name || getMechanicalLabel("selectionModes", opt.runtimeKey) || getMechanicalLabel("selectionRestrictions", opt.runtimeKey)}
                {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                {opt.isAvailable === false ? " · No disponible" : ""}
              </SelectItem>
            ))}
            {!currentSelOpt && currentSelMode && (
              <SelectItem value={currentSelMode} disabled>
                {getMechanicalLabel("selectionModes", currentSelMode) || currentSelMode} · Valor histórico sin regla de CE
              </SelectItem>
            )}
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
  mechanics = [],
}: {
  temporality: any;
  onChange: (temp: any) => void;
  mechanics?: SystemMechanicsConfig;
}) {
  const durationOptions = getCategoryOptions(mechanics, "duration");
  const frequencyOptions = getCategoryOptions(mechanics, "frequency");

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Duración</Label>
          <Select
            value={
              temporality.duration?.type === "turns" && temporality.duration?.turns
                ? String(temporality.duration.turns)
                : temporality.duration?.type || "instant"
            }
            onValueChange={(val) => {
              if (!isNaN(Number(val)) && Number(val) > 0) {
                onChange({
                  ...temporality,
                  duration: {
                    ...(temporality.duration || {}),
                    type: "turns",
                    turns: Number(val),
                  },
                });
              } else if (val === "sustained") {
                onChange({
                  ...temporality,
                  duration: {
                    ...(temporality.duration || {}),
                    type: "until_deactivated",
                  },
                });
              } else {
                onChange({
                  ...temporality,
                  duration: { ...(temporality.duration || {}), type: val },
                });
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue>{getMechanicalLabel("durations", temporality.duration?.type || "instant")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {getVisibleOptions(
                durationOptions,
                temporality.duration?.type === "turns" && temporality.duration?.turns
                  ? String(temporality.duration.turns)
                  : temporality.duration?.type || "instant"
              ).map((opt) => (
                <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                  {opt.name || getMechanicalLabel("durations", opt.runtimeKey)}
                  {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                  {opt.isAvailable === false ? " · No disponible" : ""}
                </SelectItem>
              ))}
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
              {getVisibleOptions(frequencyOptions, temporality.frequency?.type || "once").map((opt) => (
                <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                  {opt.name || getMechanicalLabel("frequencies", opt.runtimeKey)}
                  {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                  {opt.isAvailable === false ? " · No disponible" : ""}
                </SelectItem>
              ))}
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
  mechanics = [],
}: {
  limitations: MechanicalLimitation[];
  onChange: (lim: MechanicalLimitation[]) => void;
  mechanics?: SystemMechanicsConfig;
}) {
  const usageOptions = getCategoryOptions(mechanics, "usage");
  const cooldownOptions = getCategoryOptions(mechanics, "cooldown");

  const addLimitation = () => {
    const defaultTurn = cooldownOptions.length > 0 ? (parseInt(cooldownOptions[0].runtimeKey, 10) || 1) : 1;
    const newLim: MechanicalLimitation = {
      id: nanoid(6),
      type: "cooldown",
      turns: defaultTurn,
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

              {lim.type === "cooldown" && (() => {
                const matchedOption = cooldownOptions.find(
                  (opt) => opt.runtimeKey === String(lim.turns) || opt.id.endsWith(`.${lim.turns}`)
                );
                return (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Turnos:</span>
                    <Select
                      value={String(lim.turns)}
                      onValueChange={(val) => {
                        const copy = [...limitations];
                        copy[i] = { ...lim, turns: parseInt(val, 10) || 1 };
                        onChange(copy);
                      }}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs font-mono">
                        <SelectValue>{matchedOption ? matchedOption.name : `${lim.turns} turnos`}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {getVisibleOptions(cooldownOptions, String(lim.turns)).map((opt) => (
                          <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                            {opt.name}
                            {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                            {opt.isAvailable === false ? " · No disponible" : ""}
                          </SelectItem>
                        ))}
                        {!cooldownOptions.some((opt) => opt.runtimeKey === String(lim.turns)) && (
                          <SelectItem key="unconfigured" value={String(lim.turns)} disabled>
                            {lim.turns} turnos (No configurado)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

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
                      {getVisibleOptions(usageOptions, lim.period).map((opt) => (
                        <SelectItem key={opt.runtimeKey} value={opt.runtimeKey}>
                          {opt.name || getMechanicalLabel("periods", opt.runtimeKey)}
                          {opt.cost > 0 ? ` (+${opt.cost} CE)` : opt.cost < 0 ? ` (${opt.cost} CE)` : ""}
                          {opt.isAvailable === false ? " · No disponible" : ""}
                        </SelectItem>
                      ))}
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
