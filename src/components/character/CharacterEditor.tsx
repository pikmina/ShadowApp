import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { apiFetch, fetcher } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, AlertTriangle, CheckCircle, AlertCircle, Activity, Heart, Shield, ShieldCheck, Swords, Zap, Brain, BrainCircuit, HeartCrack, Flame, Wind, Sparkles, Package, Coins, Plus, Trash2, Minus, HeartPulse, BatteryPlus, FileText, User, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { validateCharacter, calculateDerivedStats, calculateTraitAttributeBonus, calculatePurchasedAttributeBonuses, calculateEquipmentBonuses } from "@/lib/characterValidation";
import { ModifierBadgeGroup, ModifierNotesLegend } from "@/components/character/ModifierBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CharacterEmployments, CharacterEnrollments } from "./CharacterRelations";
import { CharacterTechniquesEditor } from "./CharacterTechniquesEditor";
import { profileValue, type CoreProfileKey } from "@/domain/coreProfileFields";

const profileWithRelationalElements = (character?: any) => {
  const profile = { ...(character?.profileData || {}) };
  const rows = Array.isArray(character?.possessions) ? character.possessions : [];
  const sheetRows = rows.filter((row: any) => ['trait', 'weakness'].includes(row?.element?.kind || row?.kind));
  if (sheetRows.length > 0) {
    profile.traits = sheetRows.filter((row: any) => (row.element?.kind || row.kind) === 'trait').map((row: any) => row.element?.id || row.possession?.elementId || row.elementId);
    profile.weaknesses = sheetRows.filter((row: any) => (row.element?.kind || row.kind) === 'weakness').map((row: any) => row.element?.id || row.possession?.elementId || row.elementId);
  }
  return profile;
};

export default function CharacterEditor({ character, initialCanonId, onSaved, onCancel }: { character?: any, initialCanonId?: string | null, onSaved: () => void, onCancel?: () => void }) {
  const navigate = useNavigate();
  const { user, dbUser } = useAuth();
  const isAdmin = dbUser?.role === 'superadmin' || dbUser?.role === 'moderator';
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>(() => profileWithRelationalElements(character));
  const [canonId, setCanonId] = useState<string | null>(character?.canonCharacterId || initialCanonId || null);
  const [playerId, setPlayerId] = useState<number | null>(character?.playerId ?? null);
  const [isActive, setIsActive] = useState<boolean>(character?.active !== false);

  // Experience and Yen progression state
  const [exp, setExp] = useState<number>(() => Number(character?.exp ?? 0));
  const [yen, setYen] = useState<number>(() => Number(character?.yen ?? 0));

  // Inventory items state
  const [inventoryItems, setInventoryItems] = useState<Array<{ elementId: string; quantity: number; notes?: string | null; equipped?: boolean; element?: any }>>(() => {
    const rows = Array.isArray(character?.possessions) ? character.possessions : [];
    return rows
      .filter((row: any) => [
        'equipment', 'weapon', 'consumable', 'ammunition', 
        'crafting_material', 'ingredient', 'vehicle', 'real_estate'
      ].includes(row?.element?.kind || row?.kind))
      .map((row: any) => ({
        elementId: row?.element?.id || row?.possession?.elementId || row?.elementId || row?.id,
        quantity: row?.possession?.quantity || row?.quantity || 1,
        equipped: row?.possession?.equipped ?? row?.equipped ?? false,
        notes: row?.possession?.notes ?? row?.notes ?? null,
        element: row?.element
      }));
  });

  // Credential items state
  const [credentialItems, setCredentialItems] = useState<Array<{ elementId: string; element?: any }>>(() => {
    const rows = Array.isArray(character?.possessions) ? character.possessions : [];
    return rows
      .filter((row: any) => [
        'license', 'permission', 'certification', 
        'character_resource', 'background', 'clandestine_asset'
      ].includes(row?.element?.kind || row?.kind))
      .map((row: any) => ({
        elementId: row?.element?.id || row?.possession?.elementId,
        element: row?.element
      }));
  });

  // Skills state
  const [skillItems, setSkillItems] = useState<Array<{ elementId: string; level: number; element?: any }>>(() => {
    const rows = Array.isArray(character?.possessions) ? character.possessions : [];
    const fromPossessions = rows
      .filter((row: any) => (row?.element?.kind || row?.kind) === 'skill')
      .map((row: any) => ({
        elementId: row?.element?.id || row?.possession?.elementId || row?.elementId,
        level: Number(row?.possession?.quantity || row?.quantity || 1),
        element: row?.element
      }));
    if (fromPossessions.length > 0) return fromPossessions;
    if (Array.isArray(character?.profileData?.skills)) {
      return character.profileData.skills.map((s: any) => typeof s === 'string' ? { elementId: s, level: 1 } : { elementId: s.id || s.elementId, level: Number(s.level || 1) });
    }
    if (Array.isArray(character?.profileData?.habilidades)) {
      return character.profileData.habilidades.map((s: any) => typeof s === 'string' ? { elementId: s, level: 1 } : { elementId: s.id || s.elementId, level: Number(s.level || 1) });
    }
    return [];
  });

  // Controls for adding elements
  const [selectedInvElementId, setSelectedInvElementId] = useState<string>('');
  const [invQuantity, setInvQuantity] = useState<number>(1);
  const [selectedCredElementId, setSelectedCredElementId] = useState<string>('');
  const [selectedSkillElementId, setSelectedSkillElementId] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState<number>(1);

  const { data: fields, error: fieldsError } = useSWR(user ? "/api/sheet-fields" : null, fetcher);
  const { data: settings, error: settingsError } = useSWR(user ? "/api/settings" : null, fetcher);
  const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);
  const stagesList = Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_stages')?.value || [] : [];
  const mechanicsList = Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_mechanics')?.value || [] : [];
  const { data: canonList } = useSWR('/api/public/canon-characters', fetcher);
  const { data: playersList } = useSWR<any[]>(isAdmin ? "/api/admin/players" : null, fetcher);
  const { data: rawElements } = useSWR(user ? "/api/elements" : null, fetcher);
  const elements = useMemo(() => Array.isArray(rawElements) ? rawElements.filter(el => el.status === 'published') : [], [rawElements]);
  
  const credentialKindLabel = (kind: string) => ({
    license: 'Licencia',
    permission: 'Permiso',
    certification: 'Certificación',
    character_resource: 'Recurso de Personaje',
    background: 'Trasfondo',
    clandestine_asset: 'Activo Clandestino'
  } as Record<string, string>)[kind] ?? kind;
  const elementKindMap: Record<string, string> = {
    license: 'Licencia', permission: 'Permiso', certification: 'Certificación', trait: 'Rasgo', weakness: 'Debilidad',
    skill: 'Habilidad', equipment: 'Equipamiento', weapon: 'Arma', ammunition: 'Munición', consumable: 'Consumible',
    character_resource: 'Recurso de Personaje', attribute_upgrade: 'Mejora', technique_entitlement: 'Técnica',
    altered_status: 'Estado Alterado', plus_ultra_effect: 'Plus Ultra', crafting_material: 'Material de Fabricación',
    ingredient: 'Ingrediente', background: 'Trasfondo', vehicle: 'Vehículo', real_estate: 'Inmueble',
    clandestine_asset: 'Activo Clandestino'
  };

  const publishedInventoryElements = useMemo(() => {
    return elements.filter(el => [
      'equipment', 'weapon', 'consumable', 'ammunition', 
      'crafting_material', 'ingredient', 'vehicle', 'real_estate'
    ].includes(el.kind));
  }, [elements]);

  const publishedCredentialElements = useMemo(() => {
    return elements.filter(el => [
      'license', 'permission', 'certification', 
      'character_resource', 'background', 'clandestine_asset'
    ].includes(el.kind));
  }, [elements]);

  const publishedSkillElements = useMemo(() => {
    return elements.filter(el => el.kind === 'skill');
  }, [elements]);

  const handleAddSkill = () => {
    if (!selectedSkillElementId) {
      toast.error("Selecciona una habilidad del catálogo");
      return;
    }
    const el = elements.find(e => e.id === selectedSkillElementId);
    if (!el) return;
    if (skillItems.some(s => s.elementId === selectedSkillElementId)) {
      toast.error("El personaje ya posee esta habilidad. Modifica su nivel en la lista.");
      return;
    }
    setSkillItems(prev => [...prev, { elementId: selectedSkillElementId, level: Math.max(1, Math.min(5, skillLevel)), element: el }]);
    setIsDirty(true);
    setSelectedSkillElementId('');
    setSkillLevel(1);
    toast.success(`Habilidad añadida: ${el.name}`);
  };

  const handleUpdateSkillLevel = (elementId: string, delta: number) => {
    setSkillItems(prev => prev.map(item => {
      if (item.elementId === elementId) {
        const next = Math.max(1, Math.min(5, item.level + delta));
        return { ...item, level: next };
      }
      return item;
    }));
    setIsDirty(true);
  };

  const handleRemoveSkill = (elementId: string) => {
    setSkillItems(prev => prev.filter(item => item.elementId !== elementId));
    setIsDirty(true);
  };

  // Add the "Facción / Grupo" field virtually to basic data if groups exist
  let processedFields: any[] = [];
  if (fields) {
    processedFields = [...fields];
    if (settings?.groups && settings.groups.length > 0) {
      // Check if a group field already exists (avoiding "Grupo Sanguíneo")
      const hasGroupField = processedFields.some((f: any) => {
        const name = f.name.toLowerCase();
        return (name.includes('grupo') && !name.includes('sangu')) || name.includes('facción') || name.includes('faccion');
      });
      if (!hasGroupField) {
        processedFields.push({
          id: 'faction_group',
          name: 'Facción / Grupo',
          category: 'Datos Administrativos',
          type: 'select',
          order: -100, // Put it near the top
          options: settings.groups.map((g: any) => g.name)
        });
      }
    }
  }

  // Group fields by category
  const groupedFields = processedFields.reduce((acc: any, field: any) => {
    let category = field.category;
    if (category === 'Datos Básicos' || category === 'Datos Administrativos') {
      category = 'Datos';
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(field);
    return acc;
  }, {});

  const [isDirty, setIsDirty] = useState(false);
  const [birthDateEdited, setBirthDateEdited] = useState(false);

  useEffect(() => {
    if (!fields || isDirty) return;
    if (character) {
      setCanonId(character.canonCharacterId || null);
      setPlayerId(character.playerId ?? null);
      setIsActive(character.active !== false);
      const profile = profileWithRelationalElements(character);
      for (const field of fields) if (field.coreKey && profile[field.id] === undefined) {
        const value = profileValue(profile, field.coreKey as CoreProfileKey);
        if (value !== undefined) profile[field.id] = value;
      }
      setFormData(profile);
      setExp(Number(character.exp ?? 0));
      setYen(Number(character.yen ?? 0));
      const rows = Array.isArray(character.possessions) ? character.possessions : [];
      setInventoryItems(
        rows
          .filter((row: any) => [
            'equipment', 'weapon', 'consumable', 'ammunition', 
            'crafting_material', 'ingredient', 'vehicle', 'real_estate'
          ].includes(row?.element?.kind || row?.kind))
          .map((row: any) => ({
            elementId: row?.element?.id || row?.possession?.elementId || row?.elementId || row?.id,
            quantity: row?.possession?.quantity || row?.quantity || 1,
            equipped: row?.possession?.equipped ?? row?.equipped ?? false,
            notes: row?.possession?.notes ?? row?.notes ?? null,
            element: row?.element
          }))
      );
      setCredentialItems(
        rows
          .filter((row: any) => [
            'license', 'permission', 'certification', 
            'character_resource', 'background', 'clandestine_asset'
          ].includes(row?.element?.kind || row?.kind))
          .map((row: any) => ({
            elementId: row?.element?.id || row?.possession?.elementId,
            element: row?.element
          }))
      );
      const skillRows = rows.filter((row: any) => (row?.element?.kind || row?.kind) === 'skill');
      if (skillRows.length > 0) {
        setSkillItems(
          skillRows.map((row: any) => ({
            elementId: row?.element?.id || row?.possession?.elementId || row?.elementId,
            level: Number(row?.possession?.quantity || row?.quantity || 1),
            element: row?.element
          }))
        );
      } else if (Array.isArray(profile.skills)) {
        setSkillItems(profile.skills.map((s: any) => typeof s === 'string' ? { elementId: s, level: 1 } : { elementId: s.id || s.elementId, level: Number(s.level || 1) }));
      } else if (Array.isArray(profile.habilidades)) {
        setSkillItems(profile.habilidades.map((s: any) => typeof s === 'string' ? { elementId: s, level: 1 } : { elementId: s.id || s.elementId, level: Number(s.level || 1) }));
      }
    } else if (initialCanonId) {
      const canon = canonList?.find((item: any) => item.id === initialCanonId);
      if (!canon) return;
      const source: Record<string, unknown> = {
        ...(canon.profileData ?? {}), basic_name: canon.firstName ?? canon.name,
        last_name: canon.lastName, alias: canon.aliases?.[0], avatar_url: canon.imageUrl,
      };
      setFormData(current => {
        const next = { ...current };
        for (const field of fields) if (field.coreKey && next[field.id] === undefined) {
          const value = profileValue(source, field.coreKey as CoreProfileKey);
          if (value !== undefined) next[field.id] = value;
        }
        return next;
      });
    }
  }, [character, fields, canonList, initialCanonId, isDirty]);

  const handleExpChange = (newExp: number) => {
    setExp(Math.max(0, Math.floor(newExp)));
    setIsDirty(true);
  };

  const handleYenChange = (newYen: number) => {
    setYen(Math.max(0, Math.floor(newYen)));
    setIsDirty(true);
  };

  const handleAddInventoryItem = () => {
    if (!selectedInvElementId) {
      toast.error("Selecciona un objeto del catálogo");
      return;
    }
    const el = elements.find(e => e.id === selectedInvElementId);
    if (!el) return;
    const qty = Math.max(1, Math.floor(Number(invQuantity) || 1));
    
    setInventoryItems(prev => {
      const existingIndex = prev.findIndex(item => item.elementId === selectedInvElementId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty,
          element: el
        };
        return updated;
      }
      return [...prev, { elementId: selectedInvElementId, quantity: qty, element: el }];
    });
    setIsDirty(true);
    setSelectedInvElementId('');
    setInvQuantity(1);
    toast.success(`Añadido al inventario: ${el.name} (x${qty})`);
  };

  const handleRemoveInventoryItem = (elementId: string) => {
    setInventoryItems(prev => prev.filter(item => item.elementId !== elementId));
    setIsDirty(true);
  };

  const handleUpdateInventoryQuantity = (elementId: string, deltaOrValue: number, isAbsolute: boolean = false) => {
    setInventoryItems(prev => prev.map(item => {
      if (item.elementId === elementId) {
        const newQty = isAbsolute ? Math.max(1, deltaOrValue) : Math.max(1, item.quantity + deltaOrValue);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
    setIsDirty(true);
  };

  const handleToggleInventoryEquipped = (elementId: string) => {
    setInventoryItems(prev => prev.map(item => {
      if (item.elementId === elementId) {
        const next = !item.equipped;
        toast.info(next ? "Objeto equipado" : "Objeto desequipado");
        return { ...item, equipped: next };
      }
      return item;
    }));
    setIsDirty(true);
  };

  const handleAddCredential = () => {
    if (!selectedCredElementId) {
      toast.error("Selecciona una credencial del catálogo");
      return;
    }
    const el = elements.find(e => e.id === selectedCredElementId);
    if (!el) return;
    if (credentialItems.some(c => c.elementId === selectedCredElementId)) {
      toast.error("El personaje ya posee esta credencial");
      return;
    }
    setCredentialItems(prev => [...prev, { elementId: selectedCredElementId, element: el }]);
    setIsDirty(true);
    setSelectedCredElementId('');
    toast.success(`Credencial añadida: ${el.name}`);
  };

  const handleRemoveCredential = (elementId: string) => {
    setCredentialItems(prev => prev.filter(item => item.elementId !== elementId));
    setIsDirty(true);
  };

  // Derive current age and auto-assign stage based on birth date
  const dateField = processedFields?.find((f: any) => f.coreKey === 'birth_date') ?? processedFields?.find((f: any) => f.type === 'date' && (f.name.toLowerCase().includes('nacimiento') || f.name.toLowerCase().includes('birth')));
  const birthDateValue = dateField ? formData[dateField.id] : undefined;
  
  useEffect(() => {
    if (birthDateEdited && birthDateValue && settings?.gameDate && stagesList.length > 0) {
      const birth = new Date(birthDateValue);
      const game = new Date(settings.gameDate.year, settings.gameDate.month - 1, settings.gameDate.day);
      let age = game.getFullYear() - birth.getFullYear();
      const m = game.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && game.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 0) {
        const matchingStage = stagesList.find((s: any) => age >= (s.minAge || 0) && age <= (s.maxAge || 999));
        if (matchingStage && formData['basic_stage'] !== matchingStage.name) {
          setFormData(prev => ({ ...prev, basic_stage: matchingStage.name, basic_age: age }));
        } else if (!matchingStage && formData['basic_age'] !== age) {
          setFormData(prev => ({ ...prev, basic_age: age }));
        }
      }
    }
  }, [birthDateEdited, birthDateValue, settings?.gameDate, stagesList.length, formData['basic_stage']]);

  useEffect(() => {
    if (processedFields.length > 0 && !activeTab) {
      setActiveTab('Datos');
    }
  }, [processedFields.length, activeTab, Object.keys(groupedFields).join(',')]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const derived = calculateDerivedStats(formData, stagesList, elements, mechanicsList);
      const pu = Math.max(0, parseInt(String(formData['plus_ultra'] ?? formData['plusUltra'] ?? 0), 10) || 0);
      const finalProfileData: Record<string, any> = {
        ...formData,
        plus_ultra: pu,
        plusUltra: pu,
        salud_actual: derived.salud,
        estamina_actual: derived.estamina,
        salud_maxima: derived.salud,
        estamina_maxima: derived.estamina,
        evasion: derived.evasion,
        coraje: derived.coraje,
        mod_fue: derived.modFue,
        mod_des: derived.modDes,
        iniciativa: derived.iniciativa,
        daño_fisico: derived.dañoFisico,
        daño_rango: derived.dañoRango,
        reduccion_dano: derived.reduccionDano,
      };

      // Ensure semantic mapping for fields to make sure readProfile in other components works
      if (fields) {
        fields.forEach((f: any) => {
          const val = formData[f.id];
          const nName = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
          
          if (val !== undefined && val !== null) {
            finalProfileData[nName] = val;
            
            // Explicit common mappings for the hardcoded readProfile arrays
            if (nName.includes('nombre') && !nName.includes('apodo') && !nName.includes('heroe')) finalProfileData['basic_name'] = val;
            if (nName.includes('apellido')) finalProfileData['last_name'] = val;
            if (nName.includes('apodo') || nName.includes('alias') || nName.includes('heroe')) finalProfileData['alias'] = val;
            if (nName.includes('edad')) finalProfileData['basic_age'] = val;
            if (nName.includes('alineacion') || nName.includes('alineamiento')) finalProfileData['basic_alignment'] = val;
            if (nName.includes('sangre') || nName.includes('sanguineo')) finalProfileData['basic_blood_type'] = val;
            if (nName.includes('faccion') || (nName.includes('grupo') && !nName.includes('sangre') && !nName.includes('sanguineo'))) finalProfileData['faction_group'] = val;
            if (nName.includes('estatus') || nName.includes('estado')) finalProfileData['status'] = val;
            if (['imagen', 'avatar', 'enlace_al_avatar', 'url_de_avatar', 'avatar_url'].includes(nName)) finalProfileData['avatar_url'] = val;
            if (nName.includes('faceclaim')) finalProfileData['faceclaim'] = val;
            if (f.coreKey) finalProfileData[f.coreKey] = val;
            if (f.coreKey === 'quirk_level' || (nName.includes('nivel') && nName.includes('quirk'))) {
              finalProfileData['quirk_level'] = val;
              finalProfileData['quirk_evolution'] = val;
              finalProfileData['quirkEvolution'] = val;
            }
          }

          // Handle Quirk specific mappings
          if (f.type === 'quirk') {
            if (formData[`${f.id}_name`]) finalProfileData['quirk_name'] = formData[`${f.id}_name`];
            if (formData[`${f.id}_desc`]) finalProfileData['quirk_description'] = formData[`${f.id}_desc`];
            if (formData[`${f.id}_lvl1`]) finalProfileData['quirk_lvl1'] = formData[`${f.id}_lvl1`];
            if (formData[`${f.id}_lvl2`]) finalProfileData['quirk_lvl2'] = formData[`${f.id}_lvl2`];
            if (formData[`${f.id}_lvl3`]) finalProfileData['quirk_lvl3'] = formData[`${f.id}_lvl3`];
          }
          
          // Handle specific standard types
          if (f.type === 'image' && val && f.coreKey === 'avatar_url') {
            finalProfileData['avatar_url'] = val;
          }
          
          if (f.id === dateField?.id && val && settings?.gameDate && (!character || birthDateEdited)) {
             const birth = new Date(val);
             const game = new Date(settings.gameDate.year, settings.gameDate.month - 1, settings.gameDate.day);
             let age = game.getFullYear() - birth.getFullYear();
             const m = game.getMonth() - birth.getMonth();
             if (m < 0 || (m === 0 && game.getDate() < birth.getDate())) {
               age--;
             }
             if (age >= 0) {
               finalProfileData['basic_age'] = age;
             }
          }
        });
        for (const field of fields) if (field.coreKey && formData[field.id] !== undefined) {
          finalProfileData[field.coreKey] = formData[field.id];
        }
      }

      const token = await user.getIdToken();
      const res = await apiFetch('/api/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          characterId: character?.id,
          playerId: playerId,
          active: isActive,
          name: (() => {
            return finalProfileData['basic_name'] || finalProfileData['nombre'] || character?.name || "Unnamed";
          })(),
          expectedUpdatedAt: character?.updatedAt,
          profileData: finalProfileData,
          canonCharacterId: canonId,
          exp: Number(exp) || 0,
          yen: Number(yen) || 0,
          elementIds: [
            ...(Array.isArray(finalProfileData.traits) ? finalProfileData.traits : []),
            ...(Array.isArray(finalProfileData.weaknesses) ? finalProfileData.weaknesses : []),
          ],
          inventoryPossessions: inventoryItems.map(item => ({
            elementId: item.elementId,
            quantity: Number(item.quantity) || 1,
            equipped: item.equipped === true,
            notes: item.notes ?? null,
          })),
          credentialPossessions: credentialItems.map(item => ({
            elementId: item.elementId,
            quantity: 1
          })),
          skillPossessions: skillItems.map(item => ({
            elementId: item.elementId,
            quantity: Number(item.level) || 1
          }))
        })
      });
      if (res.status === 409) {
        throw new Error("Conflicto: El personaje ha sido modificado por otro usuario. Copia tus cambios y recarga.");
      }
      if (!res.ok) throw new Error("Error saving");
      toast.success("Ficha guardada exitosamente");
      onSaved();
    } catch (err: any) {
      if (err.message?.includes("409")) {
        toast.error("Conflicto: El personaje ha sido modificado. Copia tus cambios y recarga.");
      } else {
        toast.error(err.message || "Error al guardar");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (id: string, value: any) => {
    setIsDirty(true);
    if (id === dateField?.id) setBirthDateEdited(true);
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (!fields || !settings) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const renderField = (field: any) => {
    // (rest of renderField...)
    const value = formData[field.id] ?? "";

    switch (field.type) {
      case 'text':
        return <Input value={value} onChange={e => updateField(field.id, e.target.value)} />;
      case 'textarea':
        return <Textarea value={value} onChange={e => updateField(field.id, e.target.value)} />;
      case 'number':
        return <Input type="number" value={value} onChange={e => updateField(field.id, Number(e.target.value))} />;
      case 'date':
        let extraInfo = null;
        if (value && settings?.gameDate) {
          const birth = new Date(value);
          const game = new Date(settings.gameDate.year, settings.gameDate.month - 1, settings.gameDate.day);
          
          let age = game.getFullYear() - birth.getFullYear();
          const m = game.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && game.getDate() < birth.getDate())) {
            age--;
          }
          if (age >= 0) {
            extraInfo = <span className="text-xs text-muted-foreground ml-2">({age} años en in-game)</span>;
          }
        }
        return (
          <div className="flex items-center">
            <Input type="date" value={value} onChange={e => updateField(field.id, e.target.value)} className="flex-1" />
            {extraInfo}
          </div>
        );
      case 'image':
        return (
          <div className="space-y-2">
            <Input placeholder="URL de la imagen (Ej. https://...)" value={value} onChange={e => updateField(field.id, e.target.value)} />
            {value && (
              <div className="h-32 w-32 rounded-md overflow-hidden border border-border mt-2">
                <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
              </div>
            )}
          </div>
        );
      case 'select':
        return (
          <Select value={value} onValueChange={v => updateField(field.id, v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
            <SelectContent>
              {field.options?.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'multiselect':
        const selectedArr = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-col gap-2 p-2 border border-border rounded-md bg-background w-full">
            {field.options?.map((opt: string) => (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedArr.includes(opt)} 
                  onCheckedChange={(c) => {
                    if (c) {
                      updateField(field.id, [...selectedArr, opt]);
                    } else {
                      updateField(field.id, selectedArr.filter((v: string) => v !== opt));
                    }
                  }} 
                />
                <span className="text-sm">{opt}</span>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox checked={!!value} onCheckedChange={c => updateField(field.id, c)} />
            <span className="text-sm">Activar</span>
          </div>
        );
      case 'switch':
        return <Switch checked={!!value} onCheckedChange={c => updateField(field.id, c)} />;
      case 'quirk':
        return (
          <div className="space-y-4 p-4 border border-border rounded-md bg-muted/20">
            <div>
              <Label className="text-xs mb-1 block">Descripción General</Label>
              <Textarea value={formData[`${field.id}_desc`] || ''} onChange={e => updateField(`${field.id}_desc`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-foreground uppercase tracking-widest">Nivel 1</Label>
              <Textarea value={formData[`${field.id}_lvl1`] || ''} onChange={e => updateField(`${field.id}_lvl1`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-foreground uppercase tracking-widest">Nivel 2</Label>
              <Textarea value={formData[`${field.id}_lvl2`] || ''} onChange={e => updateField(`${field.id}_lvl2`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-foreground uppercase tracking-widest">Nivel 3</Label>
              <Textarea value={formData[`${field.id}_lvl3`] || ''} onChange={e => updateField(`${field.id}_lvl3`, e.target.value)} />
            </div>
          </div>
        );
      default:
        return <Input value={value} onChange={e => updateField(field.id, e.target.value)} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-muted/50 border border-border rounded-md flex items-center justify-center text-xl font-bold uppercase text-foreground">
            {(() => {
              const nf = fields?.find((f: any) => f.id === 'basic_name' || f.name.toLowerCase().includes('nombre') && !f.name.toLowerCase().includes('apodo'));
              const n = (nf ? formData[nf.id] : null) || formData['basic_name'] || character?.name || 'P';
              return typeof n === 'string' && n.length > 0 ? n.charAt(0).toUpperCase() : 'P';
            })()}
          </div>
          <div>
            <h2 className="text-2xl font-bold font-oxanium text-foreground flex items-center gap-3">
              Editar Registro: {(() => {
                const nf = fields?.find((f: any) => f.id === 'basic_name' || f.name.toLowerCase().includes('nombre') && !f.name.toLowerCase().includes('apodo'));
                return (nf ? formData[nf.id] : null) || formData['basic_name'] || character?.name || "Sin Nombre";
              })()}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mt-1">
              SISTEMA 4.1.2 — GESTIÓN AUTOMATIZADA DE ATRIBUTOS, DONES Y REGLAS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Volver
            </Button>
          )}
          {character?.id && (
            <Button
              variant="outline"
              onClick={() => navigate(`/sheet/${character.id}`)}
              disabled={isSaving}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Ver Ficha
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Sparkles className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Puntos de Experiencia (EXP)</span>
                <p className="text-[11px] text-muted-foreground">Progreso y desarrollo de habilidades</p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">
              {exp.toLocaleString('es-ES')} EXP
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input 
                type="number" 
                min={0}
                value={exp} 
                onChange={(e) => handleExpChange(parseInt(e.target.value, 10) || 0)}
                className="font-mono font-bold text-sm bg-background/80 border-amber-500/30 focus:border-amber-400"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-9 px-2 text-xs font-mono bg-background/60 hover:bg-amber-500/20 hover:text-amber-400 border-amber-500/20"
                onClick={() => handleExpChange(exp + 50)}
              >
                +50
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-9 px-2 text-xs font-mono bg-background/60 hover:bg-amber-500/20 hover:text-amber-400 border-amber-500/20"
                onClick={() => handleExpChange(exp + 100)}
              >
                +100
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-9 px-2 text-xs font-mono bg-background/60 hover:bg-amber-500/20 hover:text-amber-400 border-amber-500/20"
                onClick={() => handleExpChange(exp + 500)}
              >
                +500
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Coins className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Fondos Monetarios (Yenes)</span>
                <p className="text-[11px] text-muted-foreground">Moneda para comercio y equipamiento</p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              ¥ {yen.toLocaleString('es-ES')}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input 
                type="number" 
                min={0}
                value={yen} 
                onChange={(e) => handleYenChange(parseInt(e.target.value, 10) || 0)}
                className="font-mono font-bold text-sm bg-background/80 border-emerald-500/30 focus:border-emerald-400"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-9 px-2 text-xs font-mono bg-background/60 hover:bg-emerald-500/20 hover:text-emerald-400 border-emerald-500/20"
                onClick={() => handleYenChange(yen + 1000)}
              >
                +1k
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-9 px-2 text-xs font-mono bg-background/60 hover:bg-emerald-500/20 hover:text-emerald-400 border-emerald-500/20"
                onClick={() => handleYenChange(yen + 10000)}
              >
                +10k
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-9 px-2 text-xs font-mono bg-background/60 hover:bg-emerald-500/20 hover:text-emerald-400 border-emerald-500/20"
                onClick={() => handleYenChange(yen + 50000)}
              >
                +50k
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <div className="bg-muted/20 border-b border-border/50 p-2 overflow-x-auto no-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="inline-flex w-max min-w-full sm:min-w-0 sm:w-auto">
              {(() => {
                const allCats = Object.keys(groupedFields).sort((a, b) => {
                  const minA = Math.min(...groupedFields[a].map((f: any) => f.order));
                  const minB = Math.min(...groupedFields[b].map((f: any) => f.order));
                  return minA - minB;
                });
                
                // Reordenar las pestañas estándar y personalizadas ('Datos', 'Quirk', 'Atributos', 'Rasgos y Debilidades', 'Habilidades', 'Técnicas', 'Inventario', 'Licencias y Permisos'...)
                const customTabs = ['Atributos', 'Rasgos y Debilidades', 'Habilidades', 'Técnicas', 'Inventario', 'Licencias y Permisos'];
                let sortedCats = [...new Set([...allCats, ...customTabs])].sort((a, b) => {
                  const getOrder = (cat: string) => {
                    if (cat === 'Datos') return 1;
                    if (cat.toLowerCase().includes('quirk')) return 2;
                    if (cat === 'Atributos') return 3;
                    if (cat === 'Rasgos y Debilidades' || cat === 'Rasgos' || cat.toLowerCase().includes('rasgo')) return 4;
                    if (cat === 'Habilidades' || cat.toLowerCase().includes('habilidad')) return 5;
                    if (cat === 'Técnicas' || cat === 'Tecnicas' || cat.toLowerCase().includes('técnica') || cat.toLowerCase().includes('tecnica')) return 6;
                    if (cat === 'Inventario') return 7;
                    if (cat === 'Licencias y Permisos' || cat.toLowerCase().includes('licencia')) return 8;
                    const minOrder = groupedFields[cat] ? Math.min(...groupedFields[cat].map((f: any) => f.order)) : 999;
                    return 100 + minOrder;
                  };
                  return getOrder(a) - getOrder(b);
                });
                
                return sortedCats.map(category => (
                  <TabsTrigger
                    key={category}
                    value={category}
                  >
                    {category}
                  </TabsTrigger>
                ));
              })()}
            </TabsList>
          </Tabs>
        </div>

        <div className="p-6">
          <div className="space-y-6">
        
        {(activeTab === 'Rasgos y Debilidades' || activeTab === 'Rasgos') && (() => {
          const stageName = String(formData['basic_stage'] || formData['stage'] || formData['etapa'] || '').toLowerCase();
          const stage = stagesList.find((s: any) => s.name.toLowerCase() === stageName);
          const maxTraits = stage?.maxTraits || 0;
          const minWeaknesses = stage?.minWeaknesses || 0;
          
          const traitsList = elements.filter(el => el.kind === 'trait');
          const weaknessesList = elements.filter(el => el.kind === 'weakness');
          
          const selectedTraits = Array.isArray(formData['traits']) ? formData['traits'] : [];
          const selectedWeaknesses = Array.isArray(formData['weaknesses']) ? formData['weaknesses'] : [];

          const toggleElement = (type: 'traits' | 'weaknesses', id: string, max: number, isMin: boolean = false) => {
            setIsDirty(true);
            const current = Array.isArray(formData[type]) ? formData[type] : [];
            if (current.includes(id)) {
              setFormData(prev => ({ ...prev, [type]: current.filter(v => v !== id) }));
            } else {
              if (max > 0 && current.length >= max && !isMin) {
                toast.error(`No puedes seleccionar más de ${max} ${type === 'traits' ? 'rasgos' : 'debilidades'}`);
                return;
              }
              setFormData(prev => ({ ...prev, [type]: [...current, id] }));
            }
          };

          return (
            <Card className="border-border">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base uppercase tracking-wider text-primary flex items-center gap-2">
                  <BrainCircuit className="size-5" /> Rasgos y Debilidades
                </CardTitle>
                <CardDescription>
                  {stage ? (
                    <span>Etapa actual: <strong>{stage.name}</strong>. Permite hasta {maxTraits} rasgos y requiere un mínimo de {minWeaknesses} debilidades.</span>
                  ) : (
                    <span>Selecciona una etapa en la pestaña Datos para ver los límites de rasgos y debilidades.</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold font-oxanium text-lg text-foreground flex items-center gap-2"><BrainCircuit className="size-4 text-cyan-500" /> Rasgos</h3>
                    <Badge variant="outline">{selectedTraits.length} / {maxTraits > 0 ? maxTraits : '∞'}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {traitsList.map(trait => (
                      <div 
                        key={trait.id} 
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${selectedTraits.includes(trait.id) ? 'bg-cyan-950/20 border-cyan-800/50' : 'bg-card hover:bg-muted/50 border-border'}`}
                        onClick={() => toggleElement('traits', trait.id, maxTraits)}
                      >
                        <Checkbox 
                          checked={selectedTraits.includes(trait.id)} 
                          className="mt-1 pointer-events-none"
                        />
                        <div>
                          <div className="font-medium text-sm text-foreground">{trait.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{trait.description}</div>
                        </div>
                      </div>
                    ))}
                    {traitsList.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center col-span-full border border-dashed rounded-md">No hay rasgos publicados en el catálogo.</div>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold font-oxanium text-lg text-foreground flex items-center gap-2"><HeartCrack className="size-4 text-red-500" /> Debilidades</h3>
                    <Badge variant="outline">{selectedWeaknesses.length} / Mínimo {minWeaknesses}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {weaknessesList.map(weakness => (
                      <div 
                        key={weakness.id} 
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${selectedWeaknesses.includes(weakness.id) ? 'bg-red-950/20 border-red-800/50' : 'bg-card hover:bg-muted/50 border-border'}`}
                        onClick={() => toggleElement('weaknesses', weakness.id, 0, true)}
                      >
                        <Checkbox 
                          checked={selectedWeaknesses.includes(weakness.id)} 
                          className="mt-1 pointer-events-none"
                        />
                        <div>
                          <div className="font-medium text-sm text-foreground">{weakness.name}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{weakness.description}</div>
                        </div>
                      </div>
                    ))}
                    {weaknessesList.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center col-span-full border border-dashed rounded-md">No hay debilidades publicadas en el catálogo.</div>}
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        })()}

        {activeTab === 'Habilidades' && (() => {
          return (
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base uppercase tracking-wider text-primary flex items-center gap-2">
                    <Sparkles className="size-5" /> Habilidades
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Habilidades de entrenamiento y capacidades del personaje. Asigna un nivel de 1 a 5 para cada habilidad.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {skillItems.length} asignada{skillItems.length === 1 ? '' : 's'}
                </Badge>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Selector para añadir habilidad */}
                <div className="p-4 border border-border/60 bg-muted/20 rounded-lg space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
                    <Plus className="size-3.5 text-primary" /> Añadir Habilidad desde el Catálogo
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-8 space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Habilidad</Label>
                      <Select 
                        value={selectedSkillElementId} 
                        onValueChange={setSelectedSkillElementId}
                      >
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue placeholder="Selecciona una habilidad del catálogo..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {publishedSkillElements.map(el => (
                            <SelectItem 
                              key={el.id} 
                              value={el.id}
                              disabled={skillItems.some(s => s.elementId === el.id)}
                            >
                              {el.name} {skillItems.some(s => s.elementId === el.id) ? '(Ya asignada)' : ''}
                            </SelectItem>
                          ))}
                          {publishedSkillElements.length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground text-center">No hay habilidades publicadas</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">Nivel Inicial (1-5)</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="5" 
                        value={skillLevel} 
                        onChange={e => setSkillLevel(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))} 
                        className="bg-background font-mono text-center" 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button 
                        type="button" 
                        onClick={handleAddSkill} 
                        disabled={!selectedSkillElementId}
                        className="w-full"
                      >
                        <Plus className="size-4 mr-1" /> Añadir
                      </Button>
                    </div>
                  </div>

                  {selectedSkillElementId && (() => {
                    const sel = publishedSkillElements.find(e => e.id === selectedSkillElementId);
                    if (!sel?.description) return null;
                    return (
                      <p className="text-xs text-muted-foreground italic bg-background/50 p-2.5 rounded border border-border/40">
                        {sel.description}
                      </p>
                    );
                  })()}
                </div>

                {/* Lista de habilidades asignadas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold font-oxanium text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="size-4 text-amber-400" /> Habilidades del Personaje
                    </h3>
                    <span className="text-xs text-muted-foreground">Total: {skillItems.length}</span>
                  </div>

                  {skillItems.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground space-y-2">
                      <Sparkles className="size-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-sm font-medium">El personaje aún no tiene habilidades asignadas.</p>
                      <p className="text-xs text-muted-foreground">Utiliza el selector superior para asignar habilidades del catálogo.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {skillItems.map(item => {
                        const el = item.element || elements.find(e => e.id === item.elementId);
                        const name = el?.name || item.elementId;
                        const desc = el?.description || '';
                        return (
                          <div 
                            key={item.elementId}
                            className="p-3.5 rounded-lg border border-border/70 bg-card hover:border-primary/40 transition-colors flex flex-col justify-between gap-3 shadow-sm"
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold font-oxanium text-sm text-foreground leading-tight">{name}</span>
                                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0">
                                  Nivel {item.level}
                                </Badge>
                              </div>
                              {desc && <p className="text-xs text-muted-foreground line-clamp-2">{desc}</p>}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-[11px] text-muted-foreground mr-1">Nivel:</Label>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="size-7 p-0 h-7 w-7"
                                  disabled={item.level <= 1}
                                  onClick={() => handleUpdateSkillLevel(item.elementId, -1)}
                                >
                                  <Minus className="size-3" />
                                </Button>
                                <span className="font-mono text-xs font-bold w-6 text-center">{item.level}</span>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  className="size-7 p-0 h-7 w-7"
                                  disabled={item.level >= 5}
                                  onClick={() => handleUpdateSkillLevel(item.elementId, 1)}
                                >
                                  <Plus className="size-3" />
                                </Button>
                              </div>

                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                                onClick={() => handleRemoveSkill(item.elementId)}
                              >
                                <Trash2 className="size-3.5 mr-1" /> Quitar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {activeTab === 'Atributos' && (() => {
          const purchasedBonus = calculatePurchasedAttributeBonuses(inventoryItems, elements);
          const purchasedAttrPoints = purchasedBonus.total;

          const traitBonus = calculateTraitAttributeBonus(formData, elements, mechanicsList);
          const traitAttrPoints = traitBonus.total;
          const equipmentBonus = calculateEquipmentBonuses(inventoryItems, elements, mechanicsList);
          const validation = validateCharacter(formData, stagesList, purchasedAttrPoints, 5, traitAttrPoints);
          const derived = calculateDerivedStats(formData, stagesList, elements, mechanicsList, inventoryItems);
          const stage = stagesList.find((s: any) => s.name.toLowerCase() === String(formData['basic_stage'] || formData['stage'] || formData['etapa'] || '').toLowerCase());
          
          return (
            <Card className="border-border">
              <CardHeader className="border-b bg-muted/30 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base uppercase tracking-wider text-primary flex items-center gap-2">
                  <Activity className="size-5" /> Sistema & Estadísticas
                </CardTitle>
                {validation.status === 'green' && <Badge className="bg-green-500/20 text-green-500 border-green-500/50"><CheckCircle className="size-3.5 mr-1" /> Todo en orden</Badge>}
                {validation.status === 'orange' && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50"><AlertCircle className="size-3.5 mr-1" /> Faltan datos</Badge>}
                {validation.status === 'red' && <Badge className="bg-red-500/20 text-red-500 border-red-500/50"><AlertTriangle className="size-3.5 mr-1" /> Hay errores</Badge>}
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                {validation.messages.length > 0 && (
                  <div className={`p-4 rounded-md border ${validation.status === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'}`}>
                    <ul className="list-disc list-inside text-sm font-medium">
                      {validation.messages.map((msg, idx) => <li key={idx}>{msg}</li>)}
                    </ul>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-widest text-foreground">Etapa del Personaje</Label>
                    {birthDateValue && <span className="text-xs text-muted-foreground">Derivada de la edad ({formData['basic_age'] || '?'} años)</span>}
                  </div>
                  <Select 
                    value={formData['basic_stage'] || ''} 
                    onValueChange={v => updateField('basic_stage', v)}
                    disabled={!!birthDateValue}
                  >
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue placeholder="Selecciona una etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stagesList.map((s: any) => (
                        <SelectItem key={s.name} value={s.name}>{s.name} ({s.attrPoints} pts, max {s.maxAttr})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-sm font-bold uppercase tracking-widest text-foreground">Atributos Base</Label>
                    {stage && (() => {
                      const baseSum = (Number(formData.FUE)||0) + (Number(formData.DES)||0) + (Number(formData.RES)||0) + (Number(formData.INT)||0) + (Number(formData.VOL)||0) + (Number(formData.VEL)||0);
                      const allowedBaseBudget = stage.attrPoints;
                      const isOverBudget = baseSum > allowedBaseBudget;
                      const effectiveTotal = baseSum + purchasedAttrPoints + traitAttrPoints;
                      return (
                        <div className="text-right flex items-center gap-2 flex-wrap text-xs font-mono">
                          <span className="text-muted-foreground">
                            Puntos base: <strong className={isOverBudget ? 'text-red-500' : 'text-primary'}>
                              {baseSum}
                            </strong> / {allowedBaseBudget}
                          </span>
                          {typeof stage.maxAttributesAtCap === 'number' && stage.maxAttr > 0 && (() => {
                            const traitList = Array.isArray(formData.traits) ? formData.traits : [];
                            const hasTalentoso = traitList.some((t: any) => {
                              const id = typeof t === 'string' ? t : (t?.id || t?.elementId || '');
                              return id === 'core.trait.talented';
                            });
                            const allowedAtCap = stage.maxAttributesAtCap + (hasTalentoso ? 1 : 0);
                            const countAtCap = ['FUE', 'DES', 'RES', 'INT', 'VOL', 'VEL'].filter(
                              attr => (Number(formData[attr]) || 0) === stage.maxAttr
                            ).length;
                            const isCapExceeded = countAtCap > allowedAtCap;

                            return (
                              <span className="text-muted-foreground">
                                Al máximo ({stage.maxAttr}): <strong className={isCapExceeded ? 'text-red-500' : 'text-primary'}>
                                  {countAtCap}
                                </strong> / {allowedAtCap}
                                {hasTalentoso && (
                                  <span className="text-emerald-400 font-semibold ml-1">(+1 Talentoso)</span>
                                )}
                              </span>
                            );
                          })()}
                          {purchasedAttrPoints > 0 && (
                            <span className="text-cyan-400 font-semibold">
                              (Mejoras: +{purchasedAttrPoints})
                            </span>
                          )}
                          {traitAttrPoints !== 0 && (
                            <span className="text-emerald-400 font-semibold">
                              (Rasgos: {traitAttrPoints > 0 ? `+${traitAttrPoints}` : traitAttrPoints})
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            (Total efectivo: <strong>{effectiveTotal}</strong>)
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: 'FUE', label: 'Fuerza', icon: Swords },
                      { id: 'DES', label: 'Destreza', icon: Zap },
                      { id: 'RES', label: 'Resistencia', icon: HeartPulse },
                      { id: 'INT', label: 'Inteligencia', icon: Brain },
                      { id: 'VOL', label: 'Voluntad', icon: Flame },
                      { id: 'VEL', label: 'Velocidad', icon: Wind }
                    ].map(attr => {
                      const baseVal = Number(formData[attr.id]) || 0;
                      const purchasedVal = purchasedBonus.byAttr[attr.id] || 0;
                      const traitVal = traitBonus.byAttr[attr.id] || 0;
                      const equipmentVal = equipmentBonus.byAttr[attr.id] || 0;
                      const effectiveVal = baseVal + purchasedVal + traitVal + equipmentVal;
                      const hasModifiers = purchasedVal !== 0 || traitVal !== 0 || equipmentVal !== 0;
                      const sources = [
                        ...(purchasedBonus.sourcesByAttr[attr.id] || []),
                        ...(traitBonus.sourcesByAttr[attr.id] || []),
                        ...(equipmentBonus.sourcesByAttr[attr.id] || [])
                      ];

                      return (
                        <div key={attr.id} className="relative border border-border bg-bg2/40 p-3 rounded-md space-y-2">
                          <attr.icon className="absolute right-3 top-2 size-8 text-muted-foreground/10" />
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{attr.label}</Label>
                            {hasModifiers && (
                              <span className="text-xs font-mono font-bold text-primary">
                                Efectivo: {effectiveVal}
                              </span>
                            )}
                          </div>
                          <Input 
                            type="number" 
                            min="0" 
                            max={stage?.maxAttr || 10} 
                            value={formData[attr.id] || ''} 
                            onChange={e => updateField(attr.id, parseInt(e.target.value) || 0)} 
                            className="font-mono text-lg bg-background" 
                          />
                          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono text-muted-foreground">
                            <span>Base: {baseVal}</span>
                            <ModifierBadgeGroup sources={sources} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold uppercase tracking-widest text-foreground">Estadísticas Derivadas (Auto-calculadas)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Salud</span>
                        <ModifierBadgeGroup sources={derived.derivedSources?.salud || equipmentBonus.sourcesByDerived.salud || []} />
                      </div>
                      <strong className="text-xl font-mono text-primary">{derived.salud}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Estamina</span>
                        <ModifierBadgeGroup sources={derived.derivedSources?.estamina || equipmentBonus.sourcesByDerived.estamina || []} />
                      </div>
                      <strong className="text-xl font-mono text-indigo-400">{derived.estamina}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Evasión</span>
                        <ModifierBadgeGroup sources={derived.derivedSources?.evasion || equipmentBonus.sourcesByDerived.evasion || []} />
                      </div>
                      <strong className="text-xl font-mono text-foreground">{derived.evasion}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Coraje</span>
                        <ModifierBadgeGroup sources={derived.derivedSources?.coraje || equipmentBonus.sourcesByDerived.coraje || []} />
                      </div>
                      <strong className="text-xl font-mono text-foreground">{derived.coraje}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Iniciativa</span>
                        <ModifierBadgeGroup sources={derived.derivedSources?.iniciativa || equipmentBonus.sourcesByDerived.iniciativa || []} />
                      </div>
                      <strong className="text-xl font-mono text-foreground">{derived.iniciativa > 0 ? `+${derived.iniciativa}` : derived.iniciativa}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">RED</span>
                        <ModifierBadgeGroup sources={derived.derivedSources?.reduccionDano || equipmentBonus.sourcesByDerived.reduccionDano || []} />
                      </div>
                      <strong className="text-xl font-mono text-foreground">{derived.reduccionDano}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Mod FUE</span>
                      <strong className="text-xl font-mono text-foreground">{derived.modFue > 0 ? `+${derived.modFue}` : derived.modFue}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Mod DES</span>
                      <strong className="text-xl font-mono text-foreground">{derived.modDes > 0 ? `+${derived.modDes}` : derived.modDes}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Daño Físico</span>
                      <strong className="text-xl font-mono text-red-400">{derived.dañoFisico}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Daño de Rango</span>
                      <strong className="text-xl font-mono text-blue-400">{derived.dañoRango}</strong>
                    </div>
                  </div>
                  <ModifierNotesLegend className="mt-2" />
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-accent2/40 bg-bg2/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-5 text-accent2" />
                        <span className="text-sm font-bold uppercase tracking-widest text-accent2">Plus Ultra</span>
                        <Badge variant="outline" className="text-[10px] uppercase border-accent2/40 text-accent2 bg-accent2/5">
                          Recurso Heroico Extraordinario
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Puntos otorgados por el Narrador por acciones extraordinarias. Permiten realizar proezas como repetir tiradas de acción o actuar al límite en combate. No tienen límite máximo ni se recuperan automáticamente.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      {isAdmin ? (
                        <div className="flex items-center gap-2 border border-border bg-bg1 p-1.5 rounded-md">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-foreground hover:bg-muted"
                            disabled={(Number(formData['plus_ultra'] ?? formData['plusUltra'] ?? 0)) <= 0}
                            onClick={() => {
                              const current = Math.max(0, parseInt(String(formData['plus_ultra'] ?? formData['plusUltra'] ?? 0), 10) || 0);
                              const next = Math.max(0, current - 1);
                              updateField('plus_ultra', next);
                              updateField('plusUltra', next);
                            }}
                          >
                            <span className="text-lg font-bold leading-none">-</span>
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            className="w-16 h-8 text-center font-mono text-lg font-bold bg-background text-accent2 border border-border focus-visible:ring-1 focus-visible:ring-accent2"
                            value={Number(formData['plus_ultra'] ?? formData['plusUltra'] ?? 0)}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              updateField('plus_ultra', val);
                              updateField('plusUltra', val);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-foreground hover:bg-muted"
                            onClick={() => {
                              const current = Math.max(0, parseInt(String(formData['plus_ultra'] ?? formData['plusUltra'] ?? 0), 10) || 0);
                              const next = current + 1;
                              updateField('plus_ultra', next);
                              updateField('plusUltra', next);
                            }}
                          >
                            <span className="text-lg font-bold leading-none">+</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 border border-border bg-bg1 px-4 py-2 rounded-md">
                          <span className="text-xs text-muted-foreground uppercase tracking-widest">Reserva:</span>
                          <strong className="text-2xl font-mono text-accent2">
                            {Number(formData['plus_ultra'] ?? formData['plusUltra'] ?? 0)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        })()}
        {activeTab === 'Inventario' && (
          <Card className="border-border">
            <CardHeader className="border-b bg-muted/30 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base uppercase tracking-wider text-primary flex items-center gap-2">
                  <Package className="size-5" /> Inventario y Posesiones
                </CardTitle>
                <CardDescription className="mt-1">
                  Objetos, armas, equipamiento, consumibles y materiales asignados a este personaje.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {inventoryItems.length} {inventoryItems.length === 1 ? 'objeto' : 'objetos'}
              </Badge>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Añadir objeto al inventario */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Plus className="size-4" /> Añadir Objeto al Inventario
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <Select 
                      value={selectedInvElementId} 
                      onValueChange={setSelectedInvElementId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar objeto del catálogo..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {publishedInventoryElements.map(el => (
                          <SelectItem key={el.id} value={el.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{el.name}</span>
                              <span className="text-[10px] uppercase font-mono text-muted-foreground">({elementKindMap[el.kind] || el.kind})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Input 
                      type="number" 
                      min={1} 
                      value={invQuantity} 
                      onChange={(e) => setInvQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="Cant."
                      className="font-mono text-center"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button 
                      type="button" 
                      className="w-full"
                      disabled={!selectedInvElementId}
                      onClick={handleAddInventoryItem}
                    >
                      <Plus className="size-4 mr-1" /> Añadir
                    </Button>
                  </div>
                </div>
                {selectedInvElementId && (() => {
                  const el = elements.find(e => e.id === selectedInvElementId);
                  if (!el) return null;
                  return (
                    <div className="mt-2 text-xs text-muted-foreground bg-background/60 p-2.5 rounded border border-border/50">
                      <span className="font-semibold text-foreground">{el.name}</span> ({elementKindMap[el.kind] || el.kind}): {el.description || 'Sin descripción'}
                    </div>
                  );
                })()}
              </div>

              {/* Lista de objetos en inventario */}
              {inventoryItems.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border/80 rounded-lg bg-muted/10">
                  <Package className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-foreground">Inventario vacío</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Usa el selector superior para añadir objetos, equipamiento o consumibles a la ficha.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {inventoryItems.map((item) => {
                    const el = item.element || elements.find(e => e.id === item.elementId) || { name: item.elementId, kind: 'item', description: '' };
                    return (
                      <div 
                        key={item.elementId}
                        className="p-3.5 rounded-lg border border-border bg-card/80 flex flex-col justify-between gap-2.5 transition-colors hover:border-primary/40"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-semibold text-sm text-foreground font-oxanium leading-snug">
                                {el.name}
                              </span>
                              {item.equipped && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[9px] px-1.5 py-0 h-4.5 font-bold uppercase tracking-wider font-mono">
                                  EQUIPADO
                                </Badge>
                              )}
                            </div>
                            <Badge variant="secondary" className="font-mono text-[10px] uppercase shrink-0">
                              {elementKindMap[el.kind] || el.kind}
                            </Badge>
                          </div>
                          {el.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {el.description}
                            </p>
                          )}
                          {item.notes && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 text-xs text-amber-200/90 font-mono flex items-start gap-1.5 mt-1">
                              <FileText className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-semibold block text-[10px] uppercase text-amber-400">Detalles / Info adicional:</span>
                                <span className="whitespace-pre-wrap">{item.notes}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              className="size-7"
                              onClick={() => handleUpdateInventoryQuantity(item.elementId, -1)}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <Input 
                              type="number" 
                              min={1}
                              value={item.quantity} 
                              onChange={(e) => handleUpdateInventoryQuantity(item.elementId, parseInt(e.target.value, 10) || 1, true)}
                              className="w-14 h-7 text-xs font-mono font-bold text-center px-1"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              className="size-7"
                              onClick={() => handleUpdateInventoryQuantity(item.elementId, 1)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant={item.equipped ? "secondary" : "outline"}
                              size="sm"
                              className={cn(
                                "h-7 text-xs font-semibold px-2.5 transition-colors",
                                item.equipped
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => handleToggleInventoryEquipped(item.elementId)}
                            >
                              {item.equipped ? (
                                <>
                                  <ShieldCheck className="size-3.5 mr-1 text-emerald-400" /> Desequipar
                                </>
                              ) : (
                                <>
                                  <Shield className="size-3.5 mr-1" /> Equipar
                                </>
                              )}
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                              onClick={() => handleRemoveInventoryItem(item.elementId)}
                            >
                              <Trash2 className="size-3.5 mr-1" /> Quitar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'Licencias y Permisos' && (
          <Card className="border-border">
            <CardHeader className="border-b bg-muted/30 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Shield className="size-5" /> Licencias, Permisos, Certificaciones y Recursos
                </CardTitle>
                <CardDescription className="mt-1">
                  Habilitaciones oficiales, permisos especiales, certificaciones, recursos de personaje, trasfondos y activos clandestinos.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs border-amber-500/30 text-amber-400">
                {credentialItems.length} {credentialItems.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Añadir credencial */}
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Plus className="size-4" /> Añadir Licencia, Permiso, Certificación, Recurso o Trasfondo
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-9">
                    <Select 
                      value={selectedCredElementId} 
                      onValueChange={setSelectedCredElementId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar credencial, recurso o trasfondo del catálogo..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {publishedCredentialElements.map(el => (
                          <SelectItem key={el.id} value={el.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{el.name}</span>
                              <span className="text-[10px] uppercase font-mono text-muted-foreground">({credentialKindLabel(el.kind)})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Button 
                      type="button" 
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={!selectedCredElementId}
                      onClick={handleAddCredential}
                    >
                      <Plus className="size-4 mr-1" /> Añadir
                    </Button>
                  </div>
                </div>
                {selectedCredElementId && (() => {
                  const el = elements.find(e => e.id === selectedCredElementId);
                  if (!el) return null;
                  return (
                    <div className="mt-2 text-xs text-muted-foreground bg-background/60 p-2.5 rounded border border-border/50">
                      <span className="font-semibold text-foreground">{el.name}</span> ({credentialKindLabel(el.kind)}): {el.description || 'Sin descripción'}
                    </div>
                  );
                })()}
              </div>

              {/* Lista de credenciales */}
              {credentialItems.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border/80 rounded-lg bg-muted/10">
                  <Shield className="size-10 text-muted-foreground/40 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-foreground">Sin registros asignados</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Usa el selector superior para asignar licencias, permisos especiales, certificaciones oficiales, recursos, trasfondos o activos clandestinos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {credentialItems.map((item) => {
                    const el = item.element || elements.find(e => e.id === item.elementId) || { name: item.elementId, kind: 'license', description: '' };
                    const kindMeta: Record<string, { label: string; border: string; bg: string; text: string }> = {
                      license: { label: 'Licencia', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
                      permission: { label: 'Permiso', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
                      certification: { label: 'Certificación', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
                      character_resource: { label: 'Recurso', border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400' },
                      background: { label: 'Trasfondo', border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400' },
                      clandestine_asset: { label: 'Activo Clandestino', border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400' },
                    };
                    const meta = kindMeta[el.kind] || { label: el.kind, border: 'border-border', bg: 'bg-muted/20', text: 'text-foreground' };

                    return (
                      <div 
                        key={item.elementId}
                        className={`p-3.5 rounded-lg border ${meta.border} bg-card/80 flex flex-col justify-between gap-2.5 transition-colors`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-sm text-foreground font-oxanium leading-snug">
                              {el.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${meta.bg} ${meta.text} border ${meta.border}`}>
                              {meta.label}
                            </span>
                          </div>
                          {el.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {el.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                          <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                            ● Acreditado
                          </span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                            onClick={() => handleRemoveCredential(item.elementId)}
                          >
                            <Trash2 className="size-3.5 mr-1" /> Quitar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'Técnicas' && (
          <CharacterTechniquesEditor
            characterId={character?.id}
            mechanics={mechanicsList}
          />
        )}

        {activeTab !== 'Atributos' && activeTab !== 'Inventario' && activeTab !== 'Licencias y Permisos' && activeTab !== 'Rasgos' && activeTab !== 'Rasgos y Debilidades' && activeTab !== 'Habilidades' && activeTab !== 'Técnicas' && activeTab !== 'Tecnicas' && activeTab && groupedFields[activeTab] && (
          <div key={activeTab}>
            <div>

            {isAdmin && activeTab === 'Datos' && (
              <div className="md:col-span-2 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-primary/20 bg-primary/5 rounded-md">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Shield className="size-3.5" /> Vínculo Canon
                  </Label>
                  <Select value={canonId || 'none'} onValueChange={(val) => setCanonId(val === 'none' ? null : val)}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Personaje Original" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno / Personaje Original</SelectItem>
                      {(canonList || []).map((c: any) => {
                        const isOccupied = c.status === 'occupied' && c.id !== canonId;
                        const isReserved = c.status === 'reserved' && c.id !== canonId;
                        const isDisabled = isOccupied || isReserved;
                        return (
                          <SelectItem key={c.id} value={c.id} disabled={isDisabled}>
                            {c.name} {isOccupied ? '(Ocupado)' : isReserved ? '(Reservado)' : '(Disponible)'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Enlace con catálogo canon público.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <User className="size-3.5" /> Jugador Asignado
                  </Label>
                  <Select value={playerId ? String(playerId) : 'none'} onValueChange={(val) => setPlayerId(val === 'none' ? null : parseInt(val, 10))}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Sin jugador (Independiente/NPC)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin jugador asignado (NPC/Independiente)</SelectItem>
                      {(playersList || []).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} {p.status === 'absent' ? '· [Ausente]' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Asigna este personaje a un jugador.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Activity className="size-3.5" /> Estado del Personaje
                  </Label>
                  <div className="flex items-center justify-between p-2 rounded-md border border-border bg-background/50 h-9">
                    <span className={`text-xs font-oxanium uppercase font-bold ${isActive ? 'text-green-400' : 'text-amber-400'}`}>
                      {isActive ? 'Activo' : 'Archivado (Inactivo)'}
                    </span>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Inactivos: ocultos en registros públicos.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groupedFields[activeTab].sort((a: any, b: any) => {
                if (activeTab === 'Datos') {
                  const getCatOrder = (cat: string) => cat === 'Datos Básicos' ? 1 : (cat === 'Datos Administrativos' ? 2 : 3);
                  if (getCatOrder(a.category) !== getCatOrder(b.category)) {
                    return getCatOrder(a.category) - getCatOrder(b.category);
                  }
                }
                return a.order - b.order;
              }).map((field: any) => (
                <div key={field.id} className={`space-y-2 ${['textarea', 'quirk', 'image', 'multiselect'].includes(field.type) ? 'md:col-span-2' : ''} w-full`}>
                  <Label className="text-sm font-bold uppercase tracking-widest text-foreground">{field.name}</Label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
        </div>
          
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-2">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Volver
              </Button>
            )}
            {character?.id && (
              <Button
                variant="outline"
                onClick={() => navigate(`/sheet/${character.id}`)}
                disabled={isSaving}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Ver Ficha
              </Button>
            )}
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
