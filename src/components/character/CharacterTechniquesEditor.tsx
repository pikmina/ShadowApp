import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import {
  Zap,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Shield,
  Swords,
  Heart,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Dices,
  Flame,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch, fetcher } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { MechanicalBehaviorsEditor } from '@/components/mechanics/MechanicalBehaviorsEditor';
import { MechanicalDescriptionPreview } from '@/components/mechanics/MechanicalDescriptionPreview';
import {
  TECHNIQUE_MIN_LEVEL,
  TECHNIQUE_MAX_LEVEL,
  TECHNIQUE_SOURCE_TYPES,
  TECHNIQUE_FUNCTIONAL_CATEGORIES,
  type CharacterTechnique,
  type TechniqueSourceType,
  type TechniqueFunctionalCategory,
  deriveTechniqueFunctionalCategories,
  deriveTechniqueRollContract,
  deriveTechniqueLevelFromCost,
} from '@/domain/characterTechnique';
import {
  calculateTechniqueStructuralCost,
  getComplexityAdjustmentCost,
  findHealingOption,
  type SystemMechanicsConfig,
} from '@/domain/systemMechanics';
import { createCoreCategories } from '@/domain/coreRuleCatalog';
import { type MechanicalBehavior } from '@/domain/mechanicalBehavior';
import { getAttributeLabel } from '@/domain/mechanicalLabels';

// ==========================================
// CANONICAL LABELS & VISUAL FORMATTERS
// ==========================================

export const SOURCE_TYPE_LABELS: Record<TechniqueSourceType, string> = {
  quirk: 'Don',
  physical: 'Física',
  weapon: 'Arma',
};

export const SOURCE_TYPE_BADGES: Record<
  TechniqueSourceType,
  { label: string; bg: string; text: string; border: string }
> = {
  quirk: {
    label: 'Don',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  physical: {
    label: 'Física',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  weapon: {
    label: 'Arma',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
};

export const FUNCTIONAL_CATEGORY_CONFIG: Record<
  TechniqueFunctionalCategory,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    border: string;
  }
> = {
  offensive: {
    label: 'Ofensiva',
    icon: Flame,
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  support: {
    label: 'Soporte',
    icon: Heart,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  defensive: {
    label: 'Defensiva',
    icon: Shield,
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  control: {
    label: 'Control',
    icon: Lock,
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
};

// ==========================================
// COMPONENT INTERFACES
// ==========================================

export interface TechniqueFormData {
  id?: string;
  name: string;
  description: string;
  level: number;
  sourceType: TechniqueSourceType;
  classification?: TechniqueFunctionalCategory | null;
  activationAttributeId?: string | null;
  mechanicalBehaviors: MechanicalBehavior[];
  revision?: number;
}

const initialFormState: TechniqueFormData = {
  name: '',
  description: '',
  level: 1,
  sourceType: 'quirk',
  classification: 'offensive',
  activationAttributeId: null,
  mechanicalBehaviors: [],
};

export interface CharacterTechniqueDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: number;
  characterName?: string | null;
  technique?: CharacterTechnique | null;
  onSaved?: (technique: CharacterTechnique) => void;
  mechanics?: SystemMechanicsConfig;
}

export function CharacterTechniqueDialog({
  isOpen,
  onOpenChange,
  characterId,
  characterName,
  technique,
  onSaved,
  mechanics = [],
}: CharacterTechniqueDialogProps) {
  const { user } = useAuth();
  const [editingTechnique, setEditingTechnique] = useState<TechniqueFormData>(() => ({
    ...initialFormState,
  }));
  const [isSaving, setIsSaving] = useState(false);

  const { data: rawRules } = useSWR<Array<{ key: string; value: any }>>(
    user ? '/api/rules' : null,
    fetcher
  );

  const staminaCosts = useMemo(() => {
    return rawRules?.find((r) => r.key === 'stamina_execution_costs')?.value;
  }, [rawRules]);

  const baseAttributes = useMemo(() => {
    const ruleAttrs = rawRules?.find((r) => r.key === 'system_attributes')?.value;
    if (Array.isArray(ruleAttrs) && ruleAttrs.length > 0) {
      return ruleAttrs.map((a: any) => {
        const code = (a.abbrev || a.id || '').toUpperCase();
        const label =
          a.name && a.abbrev
            ? `${a.name} (${a.abbrev.toUpperCase()})`
            : a.name || getAttributeLabel(code) || code;
        return { id: code, name: a.name, abbrev: code, label };
      });
    }
    return [
      { id: 'FUE', name: 'Fuerza', abbrev: 'FUE', label: 'Fuerza (FUE)' },
      { id: 'DES', name: 'Destreza', abbrev: 'DES', label: 'Destreza (DES)' },
      { id: 'RES', name: 'Resistencia', abbrev: 'RES', label: 'Resistencia (RES)' },
      { id: 'INT', name: 'Inteligencia', abbrev: 'INT', label: 'Inteligencia (INT)' },
      { id: 'VOL', name: 'Voluntad', abbrev: 'VOL', label: 'Voluntad (VOL)' },
      { id: 'VEL', name: 'Velocidad', abbrev: 'VEL', label: 'Velocidad (VEL)' },
    ];
  }, [rawRules]);

  const effectiveMechanics: SystemMechanicsConfig = useMemo(() => {
    if (mechanics && mechanics.length > 0) return mechanics;
    const ruleMechanics = rawRules?.find((r) => r.key === 'system_mechanics')?.value;
    if (ruleMechanics && Array.isArray(ruleMechanics) && ruleMechanics.length > 0) {
      return ruleMechanics;
    }
    return createCoreCategories();
  }, [mechanics, rawRules]);

  useEffect(() => {
    if (isOpen) {
      if (technique) {
        setEditingTechnique({
          id: technique.id,
          name: technique.name,
          description: technique.description || '',
          level: technique.level,
          sourceType: technique.sourceType,
          classification: technique.classification ?? (deriveTechniqueFunctionalCategories(technique.mechanicalBehaviors)[0] || 'offensive'),
          activationAttributeId: technique.activationAttributeId ?? null,
          mechanicalBehaviors: Array.isArray(technique.mechanicalBehaviors)
            ? JSON.parse(JSON.stringify(technique.mechanicalBehaviors))
            : [],
          revision: technique.revision,
        });
      } else {
        setEditingTechnique({ ...initialFormState });
      }
    }
  }, [isOpen, technique]);

  // Derived in-dialog previews
  const dialogStructuralCost = calculateTechniqueStructuralCost(
    editingTechnique.mechanicalBehaviors,
    effectiveMechanics,
    staminaCosts
  );

  const dialogCategories = editingTechnique.classification
    ? [editingTechnique.classification]
    : deriveTechniqueFunctionalCategories(editingTechnique.mechanicalBehaviors);

  const dialogRollContract = deriveTechniqueRollContract(
    editingTechnique.mechanicalBehaviors,
    {
      structuralCost: dialogStructuralCost,
      supportDifficultyTiers: staminaCosts?.supportDifficulty,
      activationAttributeId: editingTechnique.activationAttributeId,
      classification: editingTechnique.classification,
    }
  );

  const handleSave = async () => {
    if (!characterId) return;
    if (!editingTechnique.name.trim()) {
      toast.error('El nombre de la técnica es obligatorio');
      return;
    }

    // Validate behaviors before save
    for (const behavior of editingTechnique.mechanicalBehaviors) {
      if (Array.isArray(behavior.effects)) {
        for (const eff of behavior.effects) {
          if (eff.type === 'attribute_modifier') {
            if (!eff.attributeId || typeof eff.attributeId !== 'string' || !eff.attributeId.trim()) {
              toast.error('Cada modificador de atributo debe especificar un atributo válido.');
              return;
            }
          }
          if (eff.type === 'healing') {
            const healingOpt = findHealingOption(
              effectiveMechanics,
              eff as any,
              eff.resourceId || 'SA'
            );
            if (!healingOpt) {
              toast.error(
                'Esta opción de curación no está configurada en las reglas del sistema.'
              );
              return;
            }
          }
        }
      }
      if (Array.isArray(behavior.limitations)) {
        for (const lim of behavior.limitations) {
          if (lim.type === 'self_damage' && lim.frequency === 'each_active_turn') {
            const durTurns = behavior.temporality?.duration?.turns ?? behavior.temporality?.duration?.value ?? behavior.effects?.find((e: any) => e.temporality?.duration?.turns)?.temporality?.duration?.turns;
            if (typeof durTurns !== 'number' || durTurns <= 0) {
              toast.error('La limitante de Daño autoinfligido por cada turno activo requiere que la técnica defina una duración en turnos.');
              return;
            }
          }
        }
      }
    }

    const structCost = calculateTechniqueStructuralCost(
      editingTechnique.mechanicalBehaviors,
      effectiveMechanics,
      staminaCosts
    );
    const derivedLevel = deriveTechniqueLevelFromCost(structCost).level;

    setIsSaving(true);
    try {
      let savedData: CharacterTechnique;

      if (editingTechnique.id) {
        // UPDATE
        const payload = {
          name: editingTechnique.name.trim(),
          description: editingTechnique.description.trim(),
          level: derivedLevel,
          sourceType: editingTechnique.sourceType,
          classification: editingTechnique.classification || 'offensive',
          activationAttributeId: editingTechnique.activationAttributeId || null,
          mechanicalBehaviors: editingTechnique.mechanicalBehaviors,
          expectedRevision: editingTechnique.revision,
        };

        const res = await apiFetch(`/api/character-techniques/${editingTechnique.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al actualizar la técnica');
        }

        savedData = await res.json();
        toast.success(`Técnica "${editingTechnique.name}" actualizada con éxito`);
      } else {
        // CREATE
        const payload = {
          name: editingTechnique.name.trim(),
          description: editingTechnique.description.trim(),
          level: derivedLevel,
          sourceType: editingTechnique.sourceType,
          classification: editingTechnique.classification || 'offensive',
          activationAttributeId: editingTechnique.activationAttributeId || null,
          mechanicalBehaviors: editingTechnique.mechanicalBehaviors,
        };

        const res = await apiFetch(`/api/characters/${characterId}/techniques`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al crear la técnica');
        }

        savedData = await res.json();
        toast.success(`Técnica "${editingTechnique.name}" creada con éxito`);
      }

      onOpenChange(false);
      onSaved?.(savedData);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al guardar la técnica');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="font-oxanium text-lg uppercase tracking-wider text-primary flex items-center gap-2">
            <Zap className="size-5" />
            {editingTechnique?.id ? 'Editar Técnica' : 'Nueva Técnica'}
          </DialogTitle>
          <DialogDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span>
              Configura los atributos descriptivos, el origen y los comportamientos mecánicos de la técnica.
            </span>
            {characterName && (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                Personaje: {characterName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-12 space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold">
                Nombre de la Técnica <span className="text-red-400">*</span>
              </Label>
              <Input
                value={editingTechnique.name}
                onChange={(e) =>
                  setEditingTechnique({ ...editingTechnique, name: e.target.value })
                }
                placeholder="Ej. Impacto Devastador, Ráfaga Cortante..."
                className="font-medium"
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold">
                Tipo de Origen
              </Label>
              <Select
                value={editingTechnique.sourceType}
                onValueChange={(val) =>
                  setEditingTechnique({
                    ...editingTechnique,
                    sourceType: val as TechniqueSourceType,
                  })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  {TECHNIQUE_SOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SOURCE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold">
                Clasificación
              </Label>
              <Select
                value={editingTechnique.classification || 'offensive'}
                onValueChange={(val) =>
                  setEditingTechnique({
                    ...editingTechnique,
                    classification: val as TechniqueFunctionalCategory,
                  })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Clasificación" />
                </SelectTrigger>
                <SelectContent>
                  {TECHNIQUE_FUNCTIONAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {FUNCTIONAL_CATEGORY_CONFIG[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold">
                Atributo de Activación
              </Label>
              <Select
                value={editingTechnique.activationAttributeId || 'none'}
                onValueChange={(val) =>
                  setEditingTechnique({
                    ...editingTechnique,
                    activationAttributeId: val === 'none' ? null : val,
                  })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground italic">Sin especificar</span>
                  </SelectItem>
                  {baseAttributes.map((attr) => (
                    <SelectItem key={attr.id} value={attr.id}>
                      {attr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                Nivel (Coste ES)
              </Label>
              {(() => {
                const structCost = calculateTechniqueStructuralCost(
                  editingTechnique.mechanicalBehaviors,
                  effectiveMechanics,
                  staminaCosts
                );
                const lvlInfo = deriveTechniqueLevelFromCost(structCost);
                const compAdj = getComplexityAdjustmentCost(
                  editingTechnique.mechanicalBehaviors?.length || 0,
                  effectiveMechanics
                );
                return (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border text-xs font-medium h-10 flex-wrap">
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/30 font-semibold"
                    >
                      {lvlInfo.label}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      ({structCost} ES)
                    </span>
                    {compAdj.cost > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 font-mono"
                        title={`Ajuste por Complejidad: +${compAdj.cost} CE (${editingTechnique.mechanicalBehaviors.length} comportamientos)`}
                      >
                        +{compAdj.cost} CE comp.
                      </Badge>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="md:col-span-12 space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold">
                Descripción Narrativa
              </Label>
              <Textarea
                value={editingTechnique.description}
                onChange={(e) =>
                  setEditingTechnique({
                    ...editingTechnique,
                    description: e.target.value,
                  })
                }
                placeholder="Describe los efectos visuales y la ejecución narrativa de la técnica..."
                rows={2}
              />
            </div>
          </div>

          {/* Real-time Semantic Previews */}
          <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> Clasificación y Tirada (Derivadas en tiempo real)
              </span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              {/* Derived Categories */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground">Categorías:</span>
                {dialogCategories.length > 0 ? (
                  dialogCategories.map((cat) => {
                    const config = FUNCTIONAL_CATEGORY_CONFIG[cat];
                    const Icon = config.icon;
                    return (
                      <span
                        key={cat}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${config.bg} ${config.text} border ${config.border}`}
                      >
                        <Icon className="size-3" />
                        {config.label}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Ninguna (Sin efectos activos de daño, curación, barrera o control)
                  </span>
                )}
              </div>

              {/* Roll Contract State */}
              <div className="flex items-center gap-1.5">
                {dialogRollContract.behaviors.some((b) => b.requiresRoll) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="size-3" />
                    {dialogRollContract.behaviors
                      .filter((b) => b.requiresRoll)
                      .map((b) => {
                        const oppLabel =
                          b.opposition?.label ||
                          (b.attackType === 'mental' ? 'Coraje' : 'Evasión');
                        return `Acción (ACC) vs ${oppLabel}`;
                      })
                      .join(' / ')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-muted-foreground">
                    Automática (Sin tirada)
                  </span>
                )}
              </div>
            </div>

            {dialogRollContract.warnings.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-border/40">
                {dialogRollContract.warnings.map((warn, i) => (
                  <p
                    key={i}
                    className="text-[11px] text-amber-400/90 flex items-center gap-1"
                  >
                    <AlertTriangle className="size-3 shrink-0" /> {warn}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Mechanical Behaviors Editor */}
          <div className="space-y-3 border-t border-border pt-4">
            <MechanicalBehaviorsEditor
              behaviors={editingTechnique.mechanicalBehaviors}
              onChange={(updatedBehaviors) =>
                setEditingTechnique({
                  ...editingTechnique,
                  mechanicalBehaviors: updatedBehaviors,
                })
              }
              mechanics={effectiveMechanics}
              maxLevel={TECHNIQUE_MAX_LEVEL}
              structuralCost={dialogStructuralCost}
              supportDifficultyTiers={staminaCosts?.supportDifficulty}
              activationAttributeId={editingTechnique.activationAttributeId}
              classification={editingTechnique.classification}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? 'Guardando...'
              : editingTechnique?.id
              ? 'Guardar Cambios'
              : 'Crear Técnica'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// CHARACTER TAB INTEGRATION
// ==========================================

export interface CharacterTechniquesEditorProps {
  characterId?: number | null;
  mechanics?: SystemMechanicsConfig;
}

export function CharacterTechniquesEditor({
  characterId,
  mechanics = [],
}: CharacterTechniquesEditorProps) {
  const { user } = useAuth();

  // SWR for fetching relational character techniques
  const shouldFetch = Boolean(user && characterId);
  const {
    data: rawTechniques,
    isLoading,
    mutate,
  } = useSWR<CharacterTechnique[]>(
    shouldFetch ? `/api/characters/${characterId}/techniques` : null,
    fetcher
  );

  const { data: rawRules } = useSWR<Array<{ key: string; value: any }>>(
    user ? '/api/rules' : null,
    fetcher
  );
  const staminaCosts = useMemo(() => {
    return rawRules?.find((r) => r.key === 'stamina_execution_costs')?.value;
  }, [rawRules]);

  const baseAttributes = useMemo(() => {
    const ruleAttrs = rawRules?.find((r) => r.key === 'system_attributes')?.value;
    if (Array.isArray(ruleAttrs) && ruleAttrs.length > 0) {
      return ruleAttrs.map((a: any) => {
        const code = (a.abbrev || a.id || '').toUpperCase();
        const label =
          a.name && a.abbrev
            ? `${a.name} (${a.abbrev.toUpperCase()})`
            : a.name || getAttributeLabel(code) || code;
        return { id: code, name: a.name, abbrev: code, label };
      });
    }
    return [
      { id: 'FUE', name: 'Fuerza', abbrev: 'FUE', label: 'Fuerza (FUE)' },
      { id: 'DES', name: 'Destreza', abbrev: 'DES', label: 'Destreza (DES)' },
      { id: 'RES', name: 'Resistencia', abbrev: 'RES', label: 'Resistencia (RES)' },
      { id: 'INT', name: 'Inteligencia', abbrev: 'INT', label: 'Inteligencia (INT)' },
      { id: 'VOL', name: 'Voluntad', abbrev: 'VOL', label: 'Voluntad (VOL)' },
      { id: 'VEL', name: 'Velocidad', abbrev: 'VEL', label: 'Velocidad (VEL)' },
    ];
  }, [rawRules]);

  const getAttrDisplay = (id?: string | null) => {
    if (!id) return null;
    const found = baseAttributes.find((a) => a.id === id);
    return found ? found.label : getAttributeLabel(id);
  };

  const effectiveMechanics: SystemMechanicsConfig = useMemo(() => {
    if (mechanics && mechanics.length > 0) return mechanics;
    const ruleMechanics = rawRules?.find((r) => r.key === 'system_mechanics')?.value;
    if (ruleMechanics && Array.isArray(ruleMechanics) && ruleMechanics.length > 0) {
      return ruleMechanics;
    }
    return createCoreCategories();
  }, [mechanics, rawRules]);

  const techniques = Array.isArray(rawTechniques) ? rawTechniques : [];

  // Dialog & Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<CharacterTechnique | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedTechniqueId, setExpandedTechniqueId] = useState<string | null>(null);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setSelectedTechnique(null);
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (technique: CharacterTechnique) => {
    setSelectedTechnique(technique);
    setIsDialogOpen(true);
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/character-techniques/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al eliminar la técnica');
      }

      toast.success('Técnica eliminada con éxito');
      setDeleteConfirmId(null);
      mutate();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al eliminar la técnica');
    }
  };

  // If character has not been persisted yet
  if (!characterId) {
    return (
      <Card className="border-border">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <CardTitle className="text-base uppercase tracking-wider text-primary flex items-center gap-2">
            <Zap className="size-5" /> Técnicas del Personaje
          </CardTitle>
          <CardDescription>
            Técnicas activas y especiales propias del personaje con comportamientos mecánicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Zap className="size-6 opacity-60" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Guarda el personaje primero
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Para crear y gestionar técnicas relacionales asociadas a este registro, debes guardar
            la ficha al menos una vez para generar su identificador.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="border-b bg-muted/30 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base uppercase tracking-wider text-primary flex items-center gap-2">
              <Zap className="size-5" /> Técnicas del Personaje
            </CardTitle>
            <CardDescription className="mt-1">
              Habilidades activas y técnicas especiales configuradas con el motor de comportamientos mecánicos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {techniques.length} {techniques.length === 1 ? 'técnica' : 'técnicas'}
            </Badge>
            <Button size="sm" onClick={handleOpenCreate} className="h-8">
              <Plus className="size-4 mr-1" /> Nueva Técnica
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Cargando técnicas del personaje...
            </div>
          ) : techniques.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/80 rounded-lg bg-muted/10 space-y-3">
              <Zap className="size-10 text-muted-foreground/40 mx-auto" />
              <h4 className="text-sm font-semibold text-foreground">
                Sin técnicas configuradas
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Este personaje aún no tiene técnicas propias asignadas. Haz clic en "Nueva Técnica" para
                configurar su origen, nivel y comportamientos de combate.
              </p>
              <Button size="sm" variant="outline" onClick={handleOpenCreate} className="mt-2">
                <Plus className="size-4 mr-1" /> Añadir primera técnica
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {techniques.map((tech) => {
                const structuralCost = calculateTechniqueStructuralCost(
                  tech,
                  effectiveMechanics,
                  staminaCosts
                );
                const categories = tech.classification
                  ? [tech.classification]
                  : deriveTechniqueFunctionalCategories(tech.mechanicalBehaviors);
                const rollContract = deriveTechniqueRollContract(tech.mechanicalBehaviors, {
                  structuralCost,
                  supportDifficultyTiers: staminaCosts?.supportDifficulty,
                  activationAttributeId: tech.activationAttributeId,
                  classification: tech.classification,
                });
                const sourceMeta = SOURCE_TYPE_BADGES[tech.sourceType] || SOURCE_TYPE_BADGES.quirk;
                const isExpanded = expandedTechniqueId === tech.id;

                return (
                  <div
                    key={tech.id}
                    className="p-4 rounded-lg border border-border bg-card/80 hover:border-primary/40 transition-colors flex flex-col gap-3"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-oxanium font-bold text-base text-foreground">
                            {tech.name}
                          </h4>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs text-primary border-primary/30 bg-primary/5"
                          >
                            Nivel {tech.level}
                          </Badge>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${sourceMeta.bg} ${sourceMeta.text} border ${sourceMeta.border}`}
                          >
                            Origen: {sourceMeta.label}
                          </span>
                          {tech.activationAttributeId && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-muted/40 text-muted-foreground border border-border">
                              Atributo: {getAttrDisplay(tech.activationAttributeId)}
                            </span>
                          )}
                        </div>

                        {tech.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                            {tech.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() =>
                            setExpandedTechniqueId(isExpanded ? null : tech.id)
                          }
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="size-3.5 mr-1" /> Ocultar
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-3.5 mr-1" /> Detalles
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => handleOpenEdit(tech)}
                        >
                          <Edit2 className="size-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteConfirmId(tech.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Derived Classification & Roll Badges */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40 text-xs">
                      {/* Derived Categories */}
                      {categories.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {categories.map((cat) => {
                            const config = FUNCTIONAL_CATEGORY_CONFIG[cat];
                            const Icon = config.icon;
                            return (
                              <span
                                key={cat}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${config.bg} ${config.text} border ${config.border}`}
                              >
                                <Icon className="size-3" />
                                {config.label}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">
                          Sin clasificación
                        </span>
                      )}

                      {/* Roll Contract Indicator */}
                      <div className="ml-auto flex items-center gap-1.5">
                        {rollContract.behaviors.some((b) => b.requiresRoll) ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono">
                            <Dices className="size-3.5 text-amber-400" />
                            <span className="text-amber-400 font-semibold">
                              {rollContract.behaviors
                                .filter((b) => b.requiresRoll)
                                .map((b) => {
                                  const oppLabel =
                                    b.opposition?.label ||
                                    (b.attackType === 'mental' ? 'Coraje' : 'Evasión');
                                  return `Acción (ACC) vs ${oppLabel}`;
                                })
                                .join(' / ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Resolución Automática
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Mechanical Breakdown */}
                    {isExpanded && (
                      <div className="mt-2 pt-3 border-t border-border/60 space-y-3 bg-muted/20 -mx-4 -mb-4 p-4 rounded-b-lg">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Layers className="size-3.5 text-primary" />
                            Comportamientos Mecánicos ({tech.mechanicalBehaviors.length})
                          </span>
                        </div>

                        <MechanicalDescriptionPreview behaviors={tech.mechanicalBehaviors} context={{ staminaCost: structuralCost }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CANONICAL CREATE / EDIT DIALOG */}
      {characterId && (
        <CharacterTechniqueDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          characterId={characterId}
          technique={selectedTechnique}
          onSaved={() => {
            mutate();
          }}
          mechanics={effectiveMechanics}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> Eliminar Técnica
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar permanentemente esta técnica? Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Eliminar Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
