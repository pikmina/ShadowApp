import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  Swords,
  Plus,
  Edit2,
  Trash2,
  Search,
  Zap,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  User,
  Sparkles,
  Dices,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, fetcher } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { SectionHeader } from '../components/common/SectionHeader';
import {
  CharacterTechniqueDialog,
  SOURCE_TYPE_BADGES,
  FUNCTIONAL_CATEGORY_CONFIG,
} from '../components/character/CharacterTechniquesEditor';
import { MechanicalDescriptionPreview } from '../components/mechanics/MechanicalDescriptionPreview';
import {
  type CharacterTechnique,
  type TechniqueSourceType,
  type TechniqueFunctionalCategory,
  deriveTechniqueFunctionalCategories,
  deriveTechniqueRollContract,
} from '../domain/characterTechnique';
import {
  calculateTechniqueStructuralCost,
  type SystemMechanicsConfig,
} from '../domain/systemMechanics';
import { createCoreCategories } from '../domain/coreRuleCatalog';
import { resolveCharacterDisplayName } from '../domain/coreProfileFields';
import { getAttributeLabel, getSourceTypeLabel } from '../domain/mechanicalLabels';

export default function TechniquesAdmin() {
  const { user } = useAuth();

  // 1. Fetch all techniques globally (with character owner info)
  const {
    data: rawTechniques,
    isLoading,
    mutate,
  } = useSWR<Array<CharacterTechnique & { characterName: string }>>(
    user ? '/api/admin/character-techniques' : null,
    fetcher
  );

  // 2. Fetch all characters for the character picker
  const { data: charactersList } = useSWR<Array<{ id: number; name?: string; profileData?: Record<string, any> }>>(
    user ? '/api/admin/characters' : null,
    fetcher
  );

  // 3. Fetch rules for mechanics and stamina costs
  const { data: rawRules } = useSWR<Array<{ key: string; value: any }>>(
    user ? '/api/rules' : null,
    fetcher
  );

  const staminaCosts = useMemo(() => {
    return rawRules?.find((r) => r.key === 'stamina_execution_costs')?.value;
  }, [rawRules]);

  const effectiveMechanics: SystemMechanicsConfig = useMemo(() => {
    const ruleMechanics = rawRules?.find((r) => r.key === 'system_mechanics')?.value;
    if (ruleMechanics && Array.isArray(ruleMechanics) && ruleMechanics.length > 0) {
      return ruleMechanics;
    }
    return createCoreCategories();
  }, [rawRules]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharacterFilter, setSelectedCharacterFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expandedTechniqueId, setExpandedTechniqueId] = useState<string | null>(null);

  // Character Picker Modal State (for "+ Crear Técnica")
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [pickerSelectedCharId, setPickerSelectedCharId] = useState<string>('');
  const [charSearchQuery, setCharSearchQuery] = useState('');

  // Canonical Editor Dialog State
  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);
  const [activeTargetCharacter, setActiveTargetCharacter] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [activeEditingTechnique, setActiveEditingTechnique] = useState<CharacterTechnique | null>(
    null
  );

  // Delete Confirmation Dialog State
  const [deleteConfirmTech, setDeleteConfirmTech] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle Open Create Flow (prompts for character selection)
  const handleStartCreate = () => {
    setPickerSelectedCharId('');
    setCharSearchQuery('');
    setIsCharacterPickerOpen(true);
  };

  const handleConfirmCharacterSelection = () => {
    if (!pickerSelectedCharId) return;
    const charIdNum = parseInt(pickerSelectedCharId, 10);
    const char = charactersList?.find((c) => c.id === charIdNum);
    if (!char) return;

    setActiveTargetCharacter({ id: char.id, name: resolveCharacterDisplayName(char) });
    setActiveEditingTechnique(null);
    setIsCharacterPickerOpen(false);
    setIsEditorDialogOpen(true);
  };

  // Handle Edit
  const handleOpenEdit = (tech: CharacterTechnique & { characterName: string }) => {
    setActiveTargetCharacter({ id: tech.characterId, name: tech.characterName || 'Personaje sin nombre' });
    setActiveEditingTechnique(tech);
    setIsEditorDialogOpen(true);
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteConfirmTech) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/character-techniques/${deleteConfirmTech.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al eliminar la técnica');
      }

      toast.success(`Técnica "${deleteConfirmTech.name}" eliminada`);
      setDeleteConfirmTech(null);
      mutate();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al eliminar la técnica');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Character List for Picker Dialog
  const filteredPickerCharacters = useMemo(() => {
    if (!Array.isArray(charactersList)) return [];
    if (!charSearchQuery.trim()) return charactersList;
    const query = charSearchQuery.toLowerCase();
    return charactersList.filter((c) =>
      resolveCharacterDisplayName(c).toLowerCase().includes(query)
    );
  }, [charactersList, charSearchQuery]);

  // Filtered Techniques Table
  const allTechniques = Array.isArray(rawTechniques) ? rawTechniques : [];
  const filteredTechniques = useMemo(() => {
    return allTechniques.filter((tech) => {
      // Search query (name, description, character name)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = tech.name.toLowerCase().includes(q);
        const matchesDesc = (tech.description || '').toLowerCase().includes(q);
        const matchesChar = (tech.characterName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesChar) return false;
      }

      // Filter by character
      if (selectedCharacterFilter !== 'all') {
        if (String(tech.characterId) !== selectedCharacterFilter) return false;
      }

      // Filter by origin source
      if (selectedSourceFilter !== 'all') {
        if (tech.sourceType !== selectedSourceFilter) return false;
      }

      // Filter by functional category
      if (selectedCategoryFilter !== 'all') {
        const cats = tech.classification
          ? [tech.classification]
          : deriveTechniqueFunctionalCategories(tech.mechanicalBehaviors);
        if (!cats.includes(selectedCategoryFilter as TechniqueFunctionalCategory)) return false;
      }

      return true;
    });
  }, [
    allTechniques,
    searchTerm,
    selectedCharacterFilter,
    selectedSourceFilter,
    selectedCategoryFilter,
  ]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <SectionHeader
        title="Catálogo de Técnicas"
        description="Administración global de habilidades activas y técnicas de combate de todos los personajes."
        icon={Swords}
        actions={
          <Button onClick={handleStartCreate} className="gap-2">
            <Plus className="size-4" /> Crear Técnica
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 bg-card/60 border border-border/80 rounded-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por técnica, personaje o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full bg-background/70"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Character Filter */}
          <Select
            value={selectedCharacterFilter}
            onValueChange={setSelectedCharacterFilter}
          >
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Todos los personajes">
                {selectedCharacterFilter === 'all'
                  ? 'Todos los personajes'
                  : resolveCharacterDisplayName(
                      charactersList?.find((c) => String(c.id) === selectedCharacterFilter)
                    )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los personajes</SelectItem>
              {Array.isArray(charactersList) &&
                charactersList.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {resolveCharacterDisplayName(c)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Source Type Filter */}
          <Select value={selectedSourceFilter} onValueChange={setSelectedSourceFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Todos los orígenes">
                {selectedSourceFilter === 'all'
                  ? 'Todos los orígenes'
                  : getSourceTypeLabel(selectedSourceFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              <SelectItem value="quirk">Don</SelectItem>
              <SelectItem value="physical">Física</SelectItem>
              <SelectItem value="weapon">Arma</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Todas las categorías">
                {selectedCategoryFilter === 'all'
                  ? 'Todas las categorías'
                  : FUNCTIONAL_CATEGORY_CONFIG[selectedCategoryFilter as TechniqueFunctionalCategory]?.label ||
                    selectedCategoryFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="offensive">Ofensiva</SelectItem>
              <SelectItem value="support">Soporte</SelectItem>
              <SelectItem value="defensive">Defensiva</SelectItem>
              <SelectItem value="control">Control</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm ||
            selectedCharacterFilter !== 'all' ||
            selectedSourceFilter !== 'all' ||
            selectedCategoryFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCharacterFilter('all');
                setSelectedSourceFilter('all');
                setSelectedCategoryFilter('all');
              }}
              className="text-xs h-9 px-2"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Global Techniques Table */}
      <div className="border border-border/80 rounded-lg overflow-hidden bg-card/40">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-[28%]">Técnica</TableHead>
              <TableHead className="w-[18%]">Personaje</TableHead>
              <TableHead className="w-[12%]">Origen</TableHead>
              <TableHead className="w-[14%]">Nivel (Coste ES)</TableHead>
              <TableHead className="w-[16%]">Clasificación</TableHead>
              <TableHead className="w-[12%] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                  Cargando catálogo global de técnicas...
                </TableCell>
              </TableRow>
            ) : filteredTechniques.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 space-y-2">
                  <Swords className="size-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">
                    No se encontraron técnicas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {allTechniques.length === 0
                      ? 'No hay ninguna técnica creada en el sistema.'
                      : 'Ninguna técnica coincide con los filtros seleccionados.'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTechniques.map((tech) => {
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
                const sourceMeta =
                  SOURCE_TYPE_BADGES[tech.sourceType] || SOURCE_TYPE_BADGES.quirk;
                const isExpanded = expandedTechniqueId === tech.id;

                return (
                  <React.Fragment key={tech.id}>
                    <TableRow className="hover:bg-muted/30 transition-colors">
                      {/* Name and Description */}
                      <TableCell className="align-top py-3 whitespace-normal">
                        <div className="space-y-1 min-w-0">
                          <span className="font-oxanium font-bold text-sm text-foreground block truncate">
                            {tech.name}
                          </span>
                          {tech.description ? (
                            <p
                              className="text-xs text-muted-foreground line-clamp-2 break-words"
                              title={tech.description}
                            >
                              {tech.description}
                            </p>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              Sin descripción
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Character Owner */}
                      <TableCell className="align-top py-3 whitespace-normal">
                        <div className="flex items-center gap-1.5 text-xs font-medium min-w-0">
                          <User className="size-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground truncate">
                            {tech.characterName || 'Personaje sin nombre'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Origin Source */}
                      <TableCell className="align-top py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${sourceMeta.bg} ${sourceMeta.text} border ${sourceMeta.border}`}
                        >
                          {sourceMeta.label}
                        </span>
                      </TableCell>

                      {/* Level and Structural Cost */}
                      <TableCell className="align-top py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs text-primary border-primary/30 bg-primary/5"
                          >
                            Nivel {tech.level}
                          </Badge>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            ({structuralCost} ES)
                          </span>
                        </div>
                      </TableCell>

                      {/* Functional Categories & Roll */}
                      <TableCell className="align-top py-3">
                        <div className="space-y-1.5">
                          {categories.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {categories.map((cat) => {
                                const config = FUNCTIONAL_CATEGORY_CONFIG[cat];
                                const Icon = config.icon;
                                return (
                                  <span
                                    key={cat}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${config.bg} ${config.text} border ${config.border}`}
                                  >
                                    <Icon className="size-2.5" />
                                    {config.label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">
                              Sin clasificar
                            </span>
                          )}

                          {/* Roll summary */}
                          {rollContract.behaviors.some((b) => b.requiresRoll) ? (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
                              <Dices className="size-3 shrink-0" />
                              <span>
                                {rollContract.behaviors
                                  .filter((b) => b.requiresRoll)
                                  .map((b) => {
                                    const oppLabel =
                                      b.opposition?.label ||
                                      (b.attackType === 'mental' ? 'Coraje' : 'Evasión');
                                    return `ACC vs ${oppLabel}`;
                                  })
                                  .join(' / ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground block">
                              Automática
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right align-top py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() =>
                              setExpandedTechniqueId(isExpanded ? null : tech.id)
                            }
                            title="Ver detalles mecánicos"
                          >
                            {isExpanded ? (
                              <ChevronUp className="size-3.5" />
                            ) : (
                              <ChevronDown className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs gap-1"
                            onClick={() => handleOpenEdit(tech)}
                          >
                            <Edit2 className="size-3.5" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() =>
                              setDeleteConfirmTech({ id: tech.id, name: tech.name })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Breakdown Row */}
                    {isExpanded && (
                      <TableRow className="bg-muted/15">
                        <TableCell colSpan={6} className="p-4 border-b whitespace-normal">
                          <div className="space-y-3 bg-card/70 border border-border/60 p-4 rounded-lg">
                            <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider border-b border-border/40 pb-2">
                              <span className="flex items-center gap-1.5">
                                <Layers className="size-3.5 text-primary" />
                                Comportamientos Mecánicos ({tech.mechanicalBehaviors.length})
                              </span>
                              {tech.activationAttributeId && (
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  Atributo de Activación: {getAttributeLabel(tech.activationAttributeId)}
                                </span>
                              )}
                            </div>
                            <MechanicalDescriptionPreview behaviors={tech.mechanicalBehaviors} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* CHARACTER PICKER DIALOG (Prompt when clicking "+ Crear Técnica") */}
      <Dialog open={isCharacterPickerOpen} onOpenChange={setIsCharacterPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-oxanium text-lg uppercase tracking-wider text-primary flex items-center gap-2">
              <Zap className="size-5" /> Crear Técnica
            </DialogTitle>
            <DialogDescription>
              ¿Para qué personaje deseas crear la técnica? Selecciona un personaje de la lista.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold">
                Personaje <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="Buscar o filtrar personaje..."
                value={charSearchQuery}
                onChange={(e) => setCharSearchQuery(e.target.value)}
                className="mb-2 text-xs"
              />
              <Select
                value={pickerSelectedCharId}
                onValueChange={setPickerSelectedCharId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar personaje...">
                    {pickerSelectedCharId
                      ? resolveCharacterDisplayName(
                          charactersList?.find((c) => String(c.id) === pickerSelectedCharId)
                        )
                      : "Seleccionar personaje..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredPickerCharacters.length > 0 ? (
                    filteredPickerCharacters.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {resolveCharacterDisplayName(c)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No se encontraron personajes
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCharacterPickerOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCharacterSelection}
              disabled={!pickerSelectedCharId}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANONICAL TECHNIQUE CREATE / EDIT DIALOG */}
      {activeTargetCharacter && (
        <CharacterTechniqueDialog
          isOpen={isEditorDialogOpen}
          onOpenChange={setIsEditorDialogOpen}
          characterId={activeTargetCharacter.id}
          characterName={activeTargetCharacter.name}
          technique={activeEditingTechnique}
          onSaved={() => {
            mutate();
          }}
          mechanics={effectiveMechanics}
        />
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={Boolean(deleteConfirmTech)}
        onOpenChange={() => setDeleteConfirmTech(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> Eliminar Técnica
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar permanentemente la técnica "
              {deleteConfirmTech?.name}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmTech(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
