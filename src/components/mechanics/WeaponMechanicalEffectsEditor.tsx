import React, { useMemo } from "react";
import { nanoid } from "nanoid";
import { Zap, Plus, Trash2, Info, Sparkles, Shield, AlertTriangle, Clock, Swords, Disc } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
  createDefaultMechanicalBehavior,
  type MechanicalBehavior,
  type MechanicalEffectItem,
  type MechanicalLimitation,
} from "../../domain/mechanicalBehavior.ts";
import type { SystemMechanicsConfig } from "../../domain/systemMechanics.ts";
import { createCoreCategories, getCategoryOptions, getVisibleOptions } from "../../domain/coreRuleCatalog.ts";
import { CANONICAL_SINGLE_STATUSES, CANONICAL_STATUS_FAMILIES, getCanonicalStatusDefaultTurns } from "../../domain/canonicalAlteredStatuses.ts";
import { getAlteredStatusLabel } from "../../domain/mechanicalLabels.ts";
import { buildWeaponMechanicalDescription, filterDamageOptionsByBaseDice } from "../../domain/weaponMechanics.ts";

interface WeaponMechanicalEffectsEditorProps {
  behaviors: MechanicalBehavior[];
  onChange: (behaviors: MechanicalBehavior[]) => void;
  weaponTypeId?: string;
  baseDice?: string;
  damageModifier?: string;
  usesAmmo?: boolean;
  weaponName?: string;
  caliberName?: string;
  magazineCapacity?: number;
  ammoElementId?: string;
  ammoElements?: any[];
  weaponTypeOptions?: any[];
  onMetadataChange?: (patch: Partial<{
    weaponTypeId: string;
    baseDice: string;
    damageModifier: string;
    usesAmmo: boolean;
    ammoElementId: string;
    caliberName: string;
    magazineCapacity: number;
  }>) => void;
  mechanics?: SystemMechanicsConfig;
  catalogStatuses?: Array<{ id: string; name: string; status?: string; metadata?: any }>;
}

export function WeaponMechanicalEffectsEditor({
  behaviors,
  onChange,
  weaponTypeId = "firearm",
  baseDice = "D10",
  damageModifier = "NONE",
  usesAmmo = true,
  weaponName = "",
  caliberName = "",
  magazineCapacity = 12,
  ammoElementId = "",
  ammoElements = [],
  weaponTypeOptions,
  onMetadataChange,
  mechanics = [],
  catalogStatuses = [],
}: WeaponMechanicalEffectsEditorProps) {
  // 1. Core Rule Categories Options
  const damageTypeOptions = useMemo(() => {
    const opts = getCategoryOptions(mechanics, "damage_type");
    if (opts.length > 0) return opts;
    return [
      { id: "fisico", runtimeKey: "fisico", name: "Físico" },
      { id: "cortante", runtimeKey: "cortante", name: "Cortante" },
      { id: "perforante", runtimeKey: "perforante", name: "Perforante" },
      { id: "contundente", runtimeKey: "contundente", name: "Contundente" },
      { id: "cinetico", runtimeKey: "cinetico", name: "Cinético" },
      { id: "fuego", runtimeKey: "fuego", name: "Fuego" },
      { id: "electrico", runtimeKey: "electrico", name: "Eléctrico" },
      { id: "acido", runtimeKey: "acido", name: "Ácido" },
    ];
  }, [mechanics]);

  const numericModifierOptions = useMemo(() => {
    const opts = getCategoryOptions(mechanics, "numeric_modifier");
    if (opts.length > 0) return opts;
    return [
      { id: "1", runtimeKey: "1", name: "+1" },
      { id: "2", runtimeKey: "2", name: "+2" },
      { id: "3", runtimeKey: "3", name: "+3" },
      { id: "4", runtimeKey: "4", name: "+4" },
      { id: "-1", runtimeKey: "-1", name: "-1" },
      { id: "-2", runtimeKey: "-2", name: "-2" },
      { id: "-3", runtimeKey: "-3", name: "-3" },
      { id: "-4", runtimeKey: "-4", name: "-4" },
      { id: "-5", runtimeKey: "-5", name: "-5" },
    ];
  }, [mechanics]);

  const attributeOptions = useMemo(() => {
    const opts = getCategoryOptions(mechanics, "attribute");
    if (opts.length > 0) return opts;
    return [
      { id: "FUE", runtimeKey: "FUE", name: "Fuerza (FUE)" },
      { id: "DES", runtimeKey: "DES", name: "Destreza (DES)" },
      { id: "INT", runtimeKey: "INT", name: "Inteligencia (INT)" },
      { id: "RES", runtimeKey: "RES", name: "Resistencia (RES)" },
      { id: "VEL", runtimeKey: "VEL", name: "Velocidad (VEL)" },
      { id: "VOL", runtimeKey: "VOL", name: "Voluntad (VOL)" },
    ];
  }, [mechanics]);

  const derivedStatOptions = useMemo(() => {
    const opts = getCategoryOptions(mechanics, "derived_stat");
    if (opts.length > 0) return opts;
    return [
      { id: "EVA", runtimeKey: "EVA", name: "Evasión (EVA)" },
      { id: "RD", runtimeKey: "RD", name: "Reducción de Daño (RD)" },
      { id: "INI", runtimeKey: "INI", name: "Iniciativa (INI)" },
      { id: "DB", runtimeKey: "DB", name: "Daño Base (DB)" },
      { id: "COR", runtimeKey: "COR", name: "Coraje (COR)" },
      { id: "SAL", runtimeKey: "SAL", name: "Salud (SA)" },
      { id: "EST", runtimeKey: "EST", name: "Estamina (ES)" },
    ];
  }, [mechanics]);

  // Damage Options filtered strictly by baseDice using structured properties (effect.dice / formula)
  const filteredDamageOptions = useMemo(() => {
    const allDamage = getCategoryOptions(mechanics, "damage");
    return filterDamageOptionsByBaseDice(allDamage, baseDice);
  }, [mechanics, baseDice]);

  // Weapon Type Options & Availability
  const availableWeaponTypeOptions = useMemo(() => {
    if (Array.isArray(weaponTypeOptions) && weaponTypeOptions.length > 0) {
      return weaponTypeOptions;
    }
    const opts = getCategoryOptions(mechanics, "weapon_type");
    if (opts.length > 0) return opts;
    const defaults = createCoreCategories().find(c => c.coreKey === "weapon_type");
    return defaults ? defaults.rules : [];
  }, [weaponTypeOptions, mechanics]);

  const visibleWeaponTypes = useMemo(() => {
    return getVisibleOptions(availableWeaponTypeOptions, weaponTypeId);
  }, [availableWeaponTypeOptions, weaponTypeId]);

  // Limitation categories from mechanics
  const limitationCategories = useMemo(() => {
    const list = mechanics.filter(c =>
      c.logicalType === "limitation" ||
      ["cooldown", "usage", "maintenance", "health_cost", "self_damage", "resource_threshold"].includes(c.coreKey || "")
    );
    if (list.length > 0) return list;
    return [
      { id: "cooldown", coreKey: "cooldown", name: "Cooldown / Enfriamiento" },
      { id: "usage", coreKey: "usage", name: "Límites de Uso" },
      { id: "self_damage", coreKey: "self_damage", name: "Daño autoinfligido / Retroceso" },
    ];
  }, [mechanics]);

  // Status Options from mechanics and catalog, including Leve, Moderado, Grave tiers
  const statusOptions = useMemo(() => {
    const opts = getCategoryOptions(mechanics, "status", undefined, catalogStatuses);
    if (opts.length > 0) {
      return opts.filter(o => !o.name.includes("(Familia)"));
    }
    const fallbackList: Array<{ id: string; runtimeKey: string; name: string; cost?: number }> = [];
    for (const single of CANONICAL_SINGLE_STATUSES) {
      fallbackList.push({ id: single.id, runtimeKey: single.key, name: single.name });
    }
    for (const fam of CANONICAL_STATUS_FAMILIES) {
      for (const tier of fam.tiers) {
        fallbackList.push({
          id: tier.statusId,
          runtimeKey: `${fam.key}_${tier.id}`,
          name: `${fam.name} ${tier.label}`
        });
      }
    }
    return fallbackList;
  }, [mechanics, catalogStatuses]);

  // Cooldown Options from mechanics
  const cooldownOptions = useMemo(() => {
    const opts = getCategoryOptions(mechanics, "cooldown");
    if (opts.length > 0) return opts;
    return [1, 2, 3, 4, 5].map(n => ({
      id: `core.cooldown.${n}`,
      runtimeKey: String(n),
      name: `${n} ${n === 1 ? 'turno' : 'turnos'}`,
      cost: n === 2 ? -2 : 0,
      component: { kind: 'cooldown', turns: n }
    }));
  }, [mechanics]);

  // Usage Options from mechanics
  const usageOptions = useMemo(() => {
    const opts = getCategoryOptions(mechanics, "usage");
    if (opts.length > 0) return opts;
    return [
      { id: "core.usage.turn", runtimeKey: "turn", name: "1 por turno" },
      { id: "core.usage.combat", runtimeKey: "combat", name: "1 por combate" },
      { id: "core.usage.mission", runtimeKey: "mission", name: "1 por misión" },
      { id: "core.usage.day", runtimeKey: "day", name: "1 por día" },
    ];
  }, [mechanics]);

  // 2. Identify Primary Active Behavior (Attack) and Passive Continuous Behavior (Equipped modifiers)
  const primaryBehavior = useMemo(() => {
    return behaviors.find(b => b.mode === "active") || behaviors[0] || null;
  }, [behaviors]);

  const equippedBehavior = useMemo(() => {
    return behaviors.find(b => b.mode === "continuous" && b.conditions?.some(c => c.type === "equipped")) || null;
  }, [behaviors]);

  // Primary Damage Effect
  const primaryDamageEffect = useMemo(() => {
    if (!primaryBehavior) return null;
    return primaryBehavior.effects.find(e => e.type === "damage") || null;
  }, [primaryBehavior]);

  // Secondary Effects against enemy (Status, Target Penalties)
  const secondaryEffects = useMemo(() => {
    if (!primaryBehavior) return [];
    return primaryBehavior.effects.filter(e => e.type !== "damage");
  }, [primaryBehavior]);

  // Limitations on primary behavior
  const currentLimitations = useMemo(() => {
    return primaryBehavior?.limitations || [];
  }, [primaryBehavior]);

  // Passive equip modifiers on equippedBehavior
  const equippedModifiers = useMemo(() => {
    return equippedBehavior?.effects || [];
  }, [equippedBehavior]);

  // 3. Update Sync Helpers
  const commitChanges = (
    newPrimaryDamage?: { dice?: string; damageType?: string },
    newSecondary?: MechanicalEffectItem[],
    newLimitations?: MechanicalLimitation[],
    newEquippedModifiers?: MechanicalEffectItem[]
  ) => {
    const activeId = primaryBehavior?.id || nanoid(8);
    const firstOptionVal = filteredDamageOptions.length > 0
      ? (filteredDamageOptions[0].effect?.dice || filteredDamageOptions[0].formula || filteredDamageOptions[0].runtimeKey || filteredDamageOptions[0].name)
      : "";
    const existingDice = (primaryDamageEffect as any)?.dice || firstOptionVal;
    const existingDamageType = (primaryDamageEffect as any)?.damageType || "fisico";

    const finalDamageEffect: MechanicalEffectItem = {
      id: primaryDamageEffect?.id || nanoid(8),
      type: "damage",
      dice: newPrimaryDamage?.dice !== undefined ? (newPrimaryDamage as any).dice : existingDice,
      damageType: newPrimaryDamage?.damageType !== undefined ? newPrimaryDamage.damageType : existingDamageType,
      target: { type: "enemy" },
    };

    const finalSecondary = newSecondary !== undefined ? newSecondary : secondaryEffects;
    const finalLimitations = newLimitations !== undefined ? newLimitations : currentLimitations;
    const finalEquipped = newEquippedModifiers !== undefined ? newEquippedModifiers : equippedModifiers;

    // Active Attack Behavior
    const defaultActive = createDefaultMechanicalBehavior(activeId, "active", primaryBehavior?.name || "Disparo / Ataque");
    const activeBehavior: MechanicalBehavior = {
      ...defaultActive,
      ...(primaryBehavior || {}),
      id: activeId,
      name: primaryBehavior?.name || "Disparo / Ataque",
      mode: "active",
      activation: {
        actionType: "action",
        timing: "immediate",
        turns: 0,
        description: "Ataque instantáneo con arma",
      },
      target: { type: "enemy" },
      resolution: {
        type: "automatic",
        attackType: "physical",
        description: "Resolución de ataque con arma",
      },
      limitations: finalLimitations,
      effects: [finalDamageEffect, ...finalSecondary],
    };

    const resultBehaviors: MechanicalBehavior[] = [activeBehavior];

    // Continuous Equip Behavior (only if modifiers exist)
    if (finalEquipped.length > 0) {
      const passiveId = equippedBehavior?.id || `${activeId}_equipped`;
      const defaultPassive = createDefaultMechanicalBehavior(passiveId, "continuous", "Modificadores al Equipar");
      const continuousBehavior: MechanicalBehavior = {
        ...defaultPassive,
        ...(equippedBehavior || {}),
        id: passiveId,
        name: "Modificadores al Equipar",
        mode: "continuous",
        conditions: [{ type: "equipped" }],
        target: { type: "self" },
        effects: finalEquipped,
      };
      resultBehaviors.push(continuousBehavior);
    }

    onChange(resultBehaviors);
  };

  // Handlers for Damage
  const rawDice = (primaryDamageEffect as any)?.dice;
  const isCurrentDiceValid = filteredDamageOptions.some((d: any) => {
    const diceVal = d.effect?.dice || d.formula || d.runtimeKey || d.name;
    return diceVal === rawDice;
  });
  const currentDice = isCurrentDiceValid
    ? rawDice
    : (filteredDamageOptions.length > 0
        ? (filteredDamageOptions[0].effect?.dice || filteredDamageOptions[0].formula || filteredDamageOptions[0].runtimeKey || filteredDamageOptions[0].name)
        : "");
  const currentDamageType = (primaryDamageEffect as any)?.damageType || "fisico";

  const handleDiceChange = (newDice: string) => {
    commitChanges({ dice: newDice });
  };

  const handleDamageTypeChange = (newDamageType: string) => {
    commitChanges({ damageType: newDamageType });
  };

  // Handlers for Limitations
  const handleAddLimitation = (categoryCoreKey: string, ruleRuntimeKey?: string, ruleName?: string) => {
    let newLim: MechanicalLimitation;
    const id = nanoid(8);

    if (categoryCoreKey === "cooldown") {
      const turns = parseInt(ruleRuntimeKey || ruleName || "1", 10) || 1;
      newLim = { id, type: "cooldown", turns };
    } else if (categoryCoreKey === "usage") {
      newLim = { id, type: "usage_limit", max: 1, period: "combat" };
    } else if (categoryCoreKey === "self_damage") {
      const amt = parseInt(ruleRuntimeKey || ruleName || "1", 10) || 1;
      newLim = { id, type: "self_damage", amount: amt, frequency: "on_activation" };
    } else if (categoryCoreKey === "resource_threshold") {
      newLim = { id, type: "resource_threshold", resourceId: "ES", minReserve: 1 };
    } else {
      newLim = { id, type: "manual", description: `${ruleName || categoryCoreKey}` };
    }

    commitChanges(undefined, undefined, [...currentLimitations, newLim]);
  };

  const handleRemoveLimitation = (idx: number) => {
    commitChanges(undefined, undefined, currentLimitations.filter((_, i) => i !== idx));
  };

  // Handlers for Equip Modifiers (Passive while equipped)
  const handleAddEquipModifier = () => {
    const newMod: MechanicalEffectItem = {
      id: nanoid(8),
      type: "penalty",
      targetStat: "EVA",
      amount: 1,
      operation: "subtract",
      target: { type: "self" },
    };
    commitChanges(undefined, undefined, undefined, [...equippedModifiers, newMod]);
  };

  const handleUpdateEquipModifier = (idx: number, patch: Partial<MechanicalEffectItem>) => {
    const updated = equippedModifiers.map((item, i) => (i === idx ? { ...item, ...patch } : item)) as MechanicalEffectItem[];
    commitChanges(undefined, undefined, undefined, updated);
  };

  const handleRemoveEquipModifier = (idx: number) => {
    commitChanges(undefined, undefined, undefined, equippedModifiers.filter((_, i) => i !== idx));
  };

  // Handlers for On-Hit Secondary Effects (against enemy)
  const handleAddSecondaryStatus = () => {
    const defaultStatus = "stunned";
    const defaultTurns = getCanonicalStatusDefaultTurns(defaultStatus) || 2;
    const newStatusEffect: MechanicalEffectItem = {
      id: nanoid(8),
      type: "status_apply",
      statusElementId: defaultStatus,
      turns: defaultTurns,
      target: { type: "enemy" },
    };
    commitChanges(undefined, [...secondaryEffects, newStatusEffect]);
  };

  const handleAddSecondaryPenalty = () => {
    const newPenalty: MechanicalEffectItem = {
      id: nanoid(8),
      type: "penalty",
      targetStat: "EVA",
      amount: 1,
      operation: "subtract",
      target: { type: "enemy" },
      temporality: {
        duration: { type: "turns", turns: 2, value: 2 },
        periodicity: { mode: "once" },
      },
    };
    commitChanges(undefined, [...secondaryEffects, newPenalty]);
  };

  const handleUpdateSecondaryEffect = (idx: number, patch: Partial<MechanicalEffectItem>) => {
    const updated = secondaryEffects.map((item, i) => (i === idx ? { ...item, ...patch } : item)) as MechanicalEffectItem[];
    commitChanges(undefined, updated);
  };

  const handleRemoveSecondaryEffect = (idx: number) => {
    commitChanges(undefined, secondaryEffects.filter((_, i) => i !== idx));
  };

  // Damage modifier short label (without redundant text)
  const modLabel = useMemo(() => {
    switch (damageModifier) {
      case "FUE":
        return "+ Mod. Fuerza";
      case "DES":
        return "+ Mod. Destreza";
      case "AVG_FUE_DES":
        return "+ Promedio FUE y DES";
      case "NONE":
      default:
        return "Sin Modificador (Fijo por Calibre)";
    }
  }, [damageModifier]);
  const weaponSummary = useMemo(() => {
    return buildWeaponMechanicalDescription({
      name: weaponName,
      usesAmmo,
      caliberName,
      magazineCapacity,
      dice: currentDice,
      damageType: currentDamageType,
      damageModifier,
      equippedModifiers,
      limitations: currentLimitations,
      secondaryEffects,
      statusOptions,
    });
  }, [
    weaponName,
    usesAmmo,
    caliberName,
    magazineCapacity,
    currentDice,
    currentDamageType,
    damageModifier,
    equippedModifiers,
    currentLimitations,
    secondaryEffects,
    statusOptions,
  ]);

  const handleWeaponTypeSelect = (newTypeId: string) => {
    const opt = availableWeaponTypeOptions.find((o: any) => o.runtimeKey === newTypeId || o.id === newTypeId);
    const comp = (opt as any)?.component || {};
    const newBaseDice = comp.baseDice || "D10";
    const newDamageMod = comp.damageModifier || "NONE";
    const newUsesAmmo = comp.usesAmmo === true;

    onMetadataChange?.({
      weaponTypeId: newTypeId,
      baseDice: newBaseDice,
      damageModifier: newDamageMod,
      usesAmmo: newUsesAmmo,
    });

    const newFilteredDamage = filterDamageOptionsByBaseDice(getCategoryOptions(mechanics, "damage"), newBaseDice);
    const isStillValid = newFilteredDamage.some((d: any) => {
      const val = d.effect?.dice || d.formula || d.runtimeKey || d.name;
      return val === (primaryDamageEffect as any)?.dice;
    });

    if (!isStillValid && newFilteredDamage.length > 0) {
      const firstVal = newFilteredDamage[0].effect?.dice || newFilteredDamage[0].formula || newFilteredDamage[0].runtimeKey || newFilteredDamage[0].name;
      commitChanges({ dice: firstVal });
    }
  };

  const handleAmmoSelect = (ammoId: string) => {
    if (ammoId === "none") {
      onMetadataChange?.({
        ammoElementId: "",
      });
    } else {
      const selectedAmmo = ammoElements?.find((a: any) => a.id === ammoId);
      onMetadataChange?.({
        ammoElementId: ammoId,
        caliberName: selectedAmmo?.metadata?.caliberName || selectedAmmo?.name || caliberName || "",
      });
    }
  };

  const handleCaliberChange = (val: string) => {
    onMetadataChange?.({ caliberName: val });
  };

  const handleMagazineCapacityChange = (val: number) => {
    onMetadataChange?.({ magazineCapacity: Math.max(1, val || 1) });
  };

  return (
    <div className="space-y-4">
      {/* 1. Parámetros del Tipo de Arma y Munición */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-red-400">
            <Swords className="size-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Parámetros del Arma (Tipo y Munición)
            </h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">
              Reglas de Tipo y Munición
            </Badge>
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              Activo (Ataque Instantáneo)
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Tipo Mecánico de Arma */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-foreground font-medium">Tipo Mecánico de Arma</Label>
            {onMetadataChange ? (
              <Select value={weaponTypeId} onValueChange={handleWeaponTypeSelect}>
                <SelectTrigger className="h-8 text-xs bg-background/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibleWeaponTypes.map((wt: any) => (
                    <SelectItem key={wt.runtimeKey || wt.id} value={wt.runtimeKey || wt.id}>
                      {wt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center px-3 rounded-md bg-background/50 border h-8 text-xs font-mono text-foreground">
                {visibleWeaponTypes.find((wt: any) => (wt.runtimeKey || wt.id) === weaponTypeId)?.name || weaponTypeId}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground">
              Define el dado base (<strong className="text-foreground">{baseDice || "D10"}</strong>) y si requiere munición.
            </span>
          </div>

          {/* Munición Requerida */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-foreground font-medium">Munición Requerida</Label>
            <div className="flex items-center px-3 rounded-md bg-background/50 border h-8 text-xs font-mono text-muted-foreground">
              {usesAmmo ? "SÍ (Heredado de Tipo de Arma)" : "NO (Sin munición)"}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Heredado automáticamente según las reglas del tipo de arma.
            </span>
          </div>

          {/* Munición compatible del catálogo */}
          {usesAmmo && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-foreground font-medium">Munición Compatible (Catálogo)</Label>
              {onMetadataChange ? (
                <Select value={ammoElementId || "none"} onValueChange={handleAmmoSelect}>
                  <SelectTrigger className="h-8 text-xs bg-background/80">
                    <SelectValue placeholder="Seleccionar munición..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin munición vinculada / Calibre libre</SelectItem>
                    {(ammoElements || []).map((ammo: any) => (
                      <SelectItem key={ammo.id} value={ammo.id}>
                        {ammo.name} {ammo.metadata?.caliberName ? `(${ammo.metadata.caliberName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center px-3 rounded-md bg-background/50 border h-8 text-xs font-mono text-foreground">
                  {ammoElementId || "Sin munición vinculada"}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground">
                Elemento consumible de tipo munición en el Catálogo.
              </span>
            </div>
          )}

          {/* Calibre de Munición (Texto / Nombre) */}
          {usesAmmo && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-foreground font-medium">Calibre de Munición</Label>
              {onMetadataChange ? (
                <Input
                  value={caliberName || ""}
                  onChange={(e) => handleCaliberChange(e.target.value)}
                  className="h-8 text-xs bg-background/80"
                  placeholder="Ej: 9mm, .45 ACP, 5.56mm..."
                />
              ) : (
                <div className="flex items-center px-3 rounded-md bg-background/50 border h-8 text-xs font-mono text-foreground">
                  {caliberName || "Sin calibre especificado"}
                </div>
              )}
            </div>
          )}

          {/* Capacidad por Cargador */}
          {usesAmmo && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-foreground font-medium">Capacidad de Cargador (Balas)</Label>
              {onMetadataChange ? (
                <Input
                  type="number"
                  min={1}
                  value={magazineCapacity ?? 12}
                  onChange={(e) => handleMagazineCapacityChange(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs font-mono bg-background/80"
                  placeholder="Ej. 6, 12, 30..."
                />
              ) : (
                <div className="flex items-center px-3 rounded-md bg-background/50 border h-8 text-xs font-mono text-foreground">
                  {magazineCapacity ?? 12} balas
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Primary Mandatory Effect: DAMAGE */}
      <div className="rounded-lg border bg-card/60 p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wide">Efecto Primario: Daño</span>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-mono text-xs">
            {modLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Damage Dice Select (Filtered by baseDice) */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-foreground font-medium">Dado de Daño ({baseDice || "D10"})</Label>
              {filteredDamageOptions.length === 0 && (
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400 bg-amber-500/10">
                  Sin opciones
                </Badge>
              )}
            </div>

            {filteredDamageOptions.length > 0 ? (
              <Select value={currentDice} onValueChange={handleDiceChange}>
                <SelectTrigger className="h-8 text-xs font-mono font-bold bg-background/80">
                  <SelectValue placeholder="Seleccionar dado..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredDamageOptions.map((opt: any) => {
                    const val = opt.effect?.dice || opt.formula || opt.runtimeKey || opt.name;
                    return (
                      <SelectItem key={opt.id || opt.runtimeKey || val} value={val}>
                        {opt.name || val}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <div
                role="status"
                aria-live="polite"
                className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300 space-y-0.5"
              >
                <p className="font-semibold">No hay opciones de daño compatibles</p>
                <p className="text-[11px] text-amber-300/80">
                  No existen reglas configuradas para el dado {baseDice || "D10"}. Debes configurarlas en Reglas del Sistema antes de seleccionarlas aquí.
                </p>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground">
              Opciones de Categoría Daño compatibles con <span className="font-bold text-foreground">{baseDice || "D10"}</span>.
            </span>
          </div>

          {/* Damage Type */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-foreground font-medium">Tipo de Daño</Label>
            <Select value={currentDamageType} onValueChange={handleDamageTypeChange}>
              <SelectTrigger className="h-8 text-xs bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {damageTypeOptions.map((opt: any) => (
                  <SelectItem key={opt.runtimeKey || opt.id} value={opt.runtimeKey || opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">
              Categoría Mecánica Tipo de Daño.
            </span>
          </div>

          {/* Target Info */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-foreground font-medium">Objetivo del Ataque</Label>
            <div className="flex items-center h-8 px-3 rounded border bg-background/50 text-xs text-muted-foreground font-mono">
              Enemigo (1 Objetivo)
            </div>
          </div>
        </div>
      </div>

      {/* 3. Equip Modifiers for Bearer (While equipped) */}
      <div className="rounded-lg border bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Modificadores para el Portador (Mientras esté equipada)
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Bonos o penalizadores pasivos que afectan al usuario mientras tenga el arma empuñada (ej: Arma pesada, -1 Evasión).
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAddEquipModifier}
            className="h-7 text-xs gap-1 border-amber-500/40 hover:bg-amber-500/10 text-amber-400"
          >
            <Plus className="size-3" />
            <span>Añadir Modificador al Equipar</span>
          </Button>
        </div>

        {equippedModifiers.length === 0 ? (
          <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground bg-background/30">
            Sin modificadores al portador. El arma no altera estadísticas pasivas al equiparse.
          </div>
        ) : (
          <div className="space-y-2">
            {equippedModifiers.map((mod: any, idx) => {
              const isAttr = mod.type === "attribute_modifier";
              const targetCategory = isAttr ? "attribute" : "derived_stat";
              const currentTargetKey = isAttr ? (mod.attributeId || "FUE") : (mod.targetStat || "EVA");
              const isBonus = mod.type === "bonus" || (isAttr && (mod.amount || 0) > 0);
              const numVal = Math.abs(mod.amount || 1);

              return (
                <div
                  key={mod.id || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border bg-background/60"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1">
                    {/* Bono / Penalización */}
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Efecto</Label>
                      <Select
                        value={isBonus ? "bonus" : "penalty"}
                        onValueChange={kind => {
                          if (isAttr) {
                            handleUpdateEquipModifier(idx, {
                              amount: kind === "bonus" ? numVal : -numVal,
                            });
                          } else {
                            handleUpdateEquipModifier(idx, {
                              type: kind === "bonus" ? "bonus" : "penalty",
                              operation: kind === "bonus" ? "add" : "subtract",
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="penalty">Penalización (-)</SelectItem>
                          <SelectItem value="bonus">Bono (+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Modificador Numérico (Valor) */}
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Modificador Numérico</Label>
                      <Select
                        value={String(isBonus ? numVal : -numVal)}
                        onValueChange={v => {
                          const parsed = parseInt(v, 10) || 1;
                          if (isAttr) {
                            handleUpdateEquipModifier(idx, { amount: parsed });
                          } else {
                            handleUpdateEquipModifier(idx, { amount: Math.abs(parsed) });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs font-mono bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {numericModifierOptions.map((opt: any) => (
                            <SelectItem key={opt.id} value={opt.runtimeKey || opt.name}>
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Atributo vs Estadística Derivada */}
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Tipo de Destino</Label>
                      <Select
                        value={targetCategory}
                        onValueChange={cat => {
                          if (cat === "attribute") {
                            handleUpdateEquipModifier(idx, {
                              type: "attribute_modifier",
                              attributeId: "FUE",
                              amount: isBonus ? numVal : -numVal,
                              targetStat: undefined,
                            } as any);
                          } else {
                            handleUpdateEquipModifier(idx, {
                              type: isBonus ? "bonus" : "penalty",
                              targetStat: "EVA",
                              amount: numVal,
                              operation: isBonus ? "add" : "subtract",
                              attributeId: undefined,
                            } as any);
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="derived_stat">Estadística Derivada</SelectItem>
                          <SelectItem value="attribute">Atributo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selección específica de Atributo o Estadística Derivada */}
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">
                        {isAttr ? "Atributo" : "Estadística Derivada"}
                      </Label>
                      <Select
                        value={currentTargetKey}
                        onValueChange={val => {
                          if (isAttr) {
                            handleUpdateEquipModifier(idx, { attributeId: val });
                          } else {
                            handleUpdateEquipModifier(idx, { targetStat: val });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isAttr
                            ? attributeOptions.map((opt: any) => (
                                <SelectItem key={opt.id} value={opt.runtimeKey || opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))
                            : derivedStatOptions.map((opt: any) => (
                                <SelectItem key={opt.id} value={opt.runtimeKey || opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEquipModifier(idx)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Limitations from System Mechanics */}
      <div className="rounded-lg border bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Limitaciones del Arma
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Enfriamiento, límites de uso, mantenimiento o retroceso según las Categorías de Limitación de las Reglas del Sistema.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select onValueChange={catKey => handleAddLimitation(catKey)}>
              <SelectTrigger className="h-7 text-xs border-cyan-500/40 text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10">
                <Plus className="size-3 mr-1" />
                <span>+ Añadir Limitación</span>
              </SelectTrigger>
              <SelectContent>
                {limitationCategories.map((c: any) => (
                  <SelectItem key={c.coreKey || c.id} value={c.coreKey || c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentLimitations.length === 0 ? (
          <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground bg-background/30">
            Sin limitaciones mecánicas. El arma puede accionarse cada turno normalmente.
          </div>
        ) : (
          <div className="space-y-2">
            {currentLimitations.map((lim: any, idx) => (
              <div
                key={lim.id || idx}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-background/60"
              >
                <div className="flex-1 flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                    {lim.type}
                  </Badge>

                  {lim.type === "cooldown" && (
                    <div className="flex items-center gap-2 text-xs">
                      <Label className="text-muted-foreground">Enfriamiento:</Label>
                      <Select
                        value={String(lim.turns || 1)}
                        onValueChange={v => {
                          const val = parseInt(v, 10) || 1;
                          const updated = currentLimitations.map((l, i) => (i === idx ? { ...l, turns: val } : l));
                          commitChanges(undefined, undefined, updated);
                        }}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs bg-background font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {cooldownOptions.map((opt: any) => {
                            const turnsVal = (opt.component as any)?.turns || parseInt(opt.runtimeKey || opt.name, 10) || 1;
                            return (
                              <SelectItem key={opt.id} value={String(turnsVal)}>
                                {opt.name} {opt.cost ? `(${opt.cost > 0 ? `+${opt.cost}` : opt.cost} CE)` : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {lim.type === "usage_limit" && (
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <Label className="text-muted-foreground">Límite de Uso:</Label>
                      <Select
                        value={lim.period || "combat"}
                        onValueChange={v => {
                          const updated = currentLimitations.map((l, i) => (i === idx ? { ...l, period: v, max: 1 } : l));
                          commitChanges(undefined, undefined, updated);
                        }}
                      >
                        <SelectTrigger className="h-7 w-44 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {usageOptions.map((opt: any) => (
                            <SelectItem key={opt.id} value={opt.runtimeKey || opt.id}>
                              {opt.name} {opt.cost ? `(${opt.cost > 0 ? `+${opt.cost}` : opt.cost} CE)` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {lim.type === "self_damage" && (
                    <div className="flex items-center gap-2 text-xs">
                      <Label className="text-muted-foreground">Daño al Usuario (HP):</Label>
                      <Input
                        type="number"
                        min={1}
                        value={lim.amount || 1}
                        onChange={e => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          const updated = currentLimitations.map((l, i) => (i === idx ? { ...l, amount: val } : l));
                          commitChanges(undefined, undefined, updated);
                        }}
                        className="h-7 w-20 text-xs font-mono bg-background"
                      />
                    </div>
                  )}

                  {lim.type === "manual" && (
                    <div className="flex items-center gap-2 text-xs flex-1">
                      <Label className="text-muted-foreground">Regla:</Label>
                      <Input
                        value={lim.description || ""}
                        onChange={e => {
                          const updated = currentLimitations.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l));
                          commitChanges(undefined, undefined, updated);
                        }}
                        className="h-7 text-xs bg-background flex-1"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveLimitation(idx)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Secondary On-Hit Effects (Against Enemy) */}
      <div className="rounded-lg border bg-card/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Efectos Secundarios al Impacto (Contra el Objetivo)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Aplica estados alterados o penalizadores con duración en turnos al acertar el disparo/ataque.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddSecondaryPenalty}
              className="h-7 text-xs gap-1 border-primary/40 hover:bg-primary/10"
            >
              <Plus className="size-3 text-primary" />
              <span>Añadir Penalizador</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddSecondaryStatus}
              className="h-7 text-xs gap-1 border-primary/40 hover:bg-primary/10"
            >
              <Plus className="size-3 text-primary" />
              <span>Añadir Estado Alterado</span>
            </Button>
          </div>
        </div>

        {secondaryEffects.length === 0 ? (
          <div className="text-center py-4 border border-dashed rounded-lg text-xs text-muted-foreground bg-background/30">
            Sin efectos secundarios al impacto. El arma únicamente inflige su daño principal.
          </div>
        ) : (
          <div className="space-y-2">
            {secondaryEffects.map((sec: any, idx) => {
              const isStatus = sec.type === "status_apply" || sec.type === "status";
              const isPenalty = sec.type === "penalty" || sec.type === "attribute_modifier";
              const currentTurns = sec.turns ?? sec.temporality?.duration?.turns ?? 2;

              return (
                <div
                  key={sec.id || idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border bg-background/60"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1">
                    {/* Indicador de Tipo */}
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Efecto</Label>
                      <div className="flex items-center h-7 px-2 rounded border bg-background text-[11px] font-mono">
                        {isStatus ? "Estado Alterado" : "Penalizador"}
                      </div>
                    </div>

                    {/* Configuración específica */}
                    {isStatus ? (
                      <div className="grid gap-1 sm:col-span-2">
                        <Label className="text-[11px] text-muted-foreground">Estado Alterado</Label>
                        <Select
                          value={sec.statusElementId || (statusOptions[0]?.id || "core.status.stunned")}
                          onValueChange={v => {
                            const defaultT = getCanonicalStatusDefaultTurns(v) || 2;
                            handleUpdateSecondaryEffect(idx, {
                              statusElementId: v,
                              turns: defaultT,
                            });
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((st: any) => {
                              const itemVal = st.id || st.runtimeKey;
                              return (
                                <SelectItem key={itemVal} value={itemVal}>
                                  {st.name} {typeof st.cost === 'number' && st.cost !== 0 ? `(${st.cost > 0 ? `+${st.cost}` : st.cost} CE)` : ''}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-1">
                          <Label className="text-[11px] text-muted-foreground">Valor Penalización</Label>
                          <Select
                            value={String(sec.amount ? -Math.abs(sec.amount) : -1)}
                            onValueChange={v => {
                              const val = Math.abs(parseInt(v, 10) || 1);
                              handleUpdateSecondaryEffect(idx, { amount: val });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs font-mono bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {numericModifierOptions.filter((o: any) => o.runtimeKey?.startsWith("-") || parseInt(o.runtimeKey, 10) < 0).map((opt: any) => (
                                <SelectItem key={opt.id} value={opt.runtimeKey || opt.name}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1">
                          <Label className="text-[11px] text-muted-foreground">Estadística / Atributo</Label>
                          <Select
                            value={sec.targetStat || sec.attributeId || "EVA"}
                            onValueChange={st => {
                              handleUpdateSecondaryEffect(idx, { targetStat: st });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {derivedStatOptions.map((opt: any) => (
                                <SelectItem key={opt.id} value={opt.runtimeKey || opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                              {attributeOptions.map((opt: any) => (
                                <SelectItem key={opt.id} value={opt.runtimeKey || opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Duración en Turnos */}
                    <div className="grid gap-1">
                      <Label className="text-[11px] text-muted-foreground">Duración (Turnos)</Label>
                      {isStatus ? (
                        <div className="flex items-center h-7 px-2.5 rounded border bg-background/50 text-xs font-mono text-muted-foreground">
                          {getCanonicalStatusDefaultTurns(sec.statusElementId)} {getCanonicalStatusDefaultTurns(sec.statusElementId) === 1 ? "turno" : "turnos"}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={currentTurns}
                          onChange={e => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            handleUpdateSecondaryEffect(idx, {
                              temporality: {
                                duration: { type: "turns", turns: val, value: val },
                                periodicity: { mode: "once" },
                              },
                            });
                          }}
                          className="h-7 text-xs font-mono bg-background"
                        />
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSecondaryEffect(idx)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Real-time Summary Banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary shrink-0" />
          <span className="font-semibold text-xs text-primary uppercase tracking-wider">
            Resumen de Resolución / Descripción Mecánica del Arma:
          </span>
        </div>
        <div className="text-foreground leading-relaxed text-xs font-mono bg-background/80 p-3 rounded-md border border-primary/20 shadow-sm select-all">
          {weaponSummary}
        </div>
      </div>
    </div>
  );
}
