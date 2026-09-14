import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { apiFetch, fetcher } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, AlertTriangle, CheckCircle, AlertCircle, Activity, Heart, Shield, Swords, Zap, Brain, Flame, Wind } from "lucide-react";
import { toast } from "sonner";
import { validateCharacter, calculateDerivedStats } from "@/lib/characterValidation";
import { Badge } from "@/components/ui/badge";


export default function CharacterEditor({ character, onSaved, onCancel }: { character?: any, onSaved: () => void, onCancel?: () => void }) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>(character?.profileData || {});

  const { data: fields, error: fieldsError } = useSWR(user ? "/api/sheet-fields" : null, fetcher);
  const { data: settings, error: settingsError } = useSWR(user ? "/api/settings" : null, fetcher);
  const { data: rules } = useSWR(user ? "/api/rules" : null, fetcher);
  const stagesList = Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_stages')?.value || [] : [];
  const mechanicsList = Array.isArray(rules) ? rules.find((r: any) => r.key === 'system_mechanics')?.value || [] : [];
  const { data: rawElements } = useSWR(user ? "/api/elements" : null, fetcher);
  const elements = Array.isArray(rawElements) ? rawElements.filter(el => el.status === 'published') : [];

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
  useEffect(() => {
    if (character?.profileData && !isDirty) {
      setFormData(character.profileData);
    }
  }, [character?.profileData, isDirty]);

  // Derive current age and auto-assign stage based on birth date
  const dateField = processedFields?.find((f: any) => f.type === 'date' && (f.name.toLowerCase().includes('nacimiento') || f.name.toLowerCase().includes('birth')));
  const birthDateValue = dateField ? formData[dateField.id] : undefined;
  
  useEffect(() => {
    if (birthDateValue && settings?.gameDate && stagesList.length > 0) {
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
  }, [birthDateValue, settings?.gameDate, stagesList.length, formData['basic_stage']]);

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
      const finalProfileData: Record<string, any> = {
        ...formData,
        salud_actual: derived.salud,
        estamina_actual: derived.estamina,
        salud_maxima: derived.salud,
        estamina_maxima: derived.estamina,
        evasion: derived.evasion,
        coraje: derived.coraje,
        mod_fue: derived.modFue,
        mod_des: derived.modDes,
        iniciativa: derived.iniciativa,
        daño_base: derived.dañoBase,
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
            if (nName.includes('canon')) finalProfileData['is_canon'] = val;
            if (nName.includes('imagen') || nName.includes('avatar') || nName.includes('faceclaim')) finalProfileData['avatar_url'] = val;
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
          if (f.type === 'image' && val) {
            finalProfileData['avatar_url'] = val;
          }
          
          if (f.type === 'date' && val && settings?.gameDate) {
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
      }

      const res = await apiFetch('/api/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          characterId: character?.id,
          name: (() => {
            return finalProfileData['basic_name'] || finalProfileData['nombre'] || character?.name || "Unnamed";
          })(),
          expectedUpdatedAt: character?.updatedAt,
          profileData: finalProfileData
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
              <Label className="text-xs mb-1 block">Nombre del Quirk/Poder</Label>
              <Input value={formData[`${field.id}_name`] || ''} onChange={e => updateField(`${field.id}_name`, e.target.value)} placeholder="Ej. One For All" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Descripción General</Label>
              <Textarea value={formData[`${field.id}_desc`] || ''} onChange={e => updateField(`${field.id}_desc`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-foreground uppercase tracking-widest">Nivel 1 (Despertar)</Label>
              <Textarea value={formData[`${field.id}_lvl1`] || ''} onChange={e => updateField(`${field.id}_lvl1`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-foreground uppercase tracking-widest">Nivel 2 (Desarrollo)</Label>
              <Textarea value={formData[`${field.id}_lvl2`] || ''} onChange={e => updateField(`${field.id}_lvl2`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-foreground uppercase tracking-widest">Nivel 3 (Maestría)</Label>
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
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Ver Ficha
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden">
        <div className="flex bg-muted/20 border-b border-border/50 overflow-x-auto custom-scrollbar p-1.5 gap-1 items-center">
        {(() => {
          const allCats = Object.keys(groupedFields);
          const quirkCat = allCats.find(c => c.toLowerCase().includes('quirk')) || 'Quirk';
          
          return ['Datos', 'Rasgos', quirkCat, 'Atributos', ...allCats.filter(c => !['Datos', 'Rasgos', quirkCat, 'Atributos'].includes(c))].map(category => (
            <Button
              key={category}
              variant="ghost"
              size="sm"
              className={`whitespace-nowrap shrink-0 transition-colors rounded-md font-medium h-9 px-4 ${activeTab === category ? 'bg-background text-primary border border-border/50 shadow-sm hover:bg-background/80 hover:text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              onClick={() => setActiveTab(category)}
            >
              {category}
            </Button>
          ));
        })()}
      </div>

        <div className="p-6">
          <div className="space-y-6">
        
        {activeTab === 'Rasgos' && (() => {
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
                  <Brain className="size-5" /> Rasgos y Debilidades
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
                    <h3 className="font-bold font-oxanium text-lg text-foreground flex items-center gap-2"><Zap className="size-4 text-cyan-500" /> Rasgos</h3>
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
                    <h3 className="font-bold font-oxanium text-lg text-foreground flex items-center gap-2"><AlertTriangle className="size-4 text-red-500" /> Debilidades</h3>
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
{activeTab === 'Atributos' && (() => {
          const validation = validateCharacter(formData, stagesList);
          const derived = calculateDerivedStats(formData, stagesList, elements, mechanicsList);
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
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold uppercase tracking-widest text-foreground">Atributos Base</Label>
                    {stage && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Puntos repartidos: <strong className={validation.status === 'red' ? 'text-red-500' : 'text-primary'}>
                          {(Number(formData.FUE)||0) + (Number(formData.DES)||0) + (Number(formData.RES)||0) + (Number(formData.INT)||0) + (Number(formData.VOL)||0) + (Number(formData.VEL)||0)}
                        </strong> / {stage.attrPoints}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: 'FUE', label: 'Fuerza', icon: Swords },
                      { id: 'DES', label: 'Destreza', icon: Zap },
                      { id: 'RES', label: 'Resistencia', icon: Shield },
                      { id: 'INT', label: 'Inteligencia', icon: Brain },
                      { id: 'VOL', label: 'Voluntad', icon: Flame },
                      { id: 'VEL', label: 'Velocidad', icon: Wind }
                    ].map(attr => (
                      <div key={attr.id} className="relative border border-border bg-bg2/40 p-3 rounded-md">
                        <attr.icon className="absolute right-3 top-1/2 -translate-y-1/2 size-8 text-muted-foreground/10" />
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{attr.label}</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max={stage?.maxAttr || 10} 
                          value={formData[attr.id] || ''} 
                          onChange={e => updateField(attr.id, parseInt(e.target.value) || 0)} 
                          className="mt-1 font-mono text-lg bg-background" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold uppercase tracking-widest text-foreground">Estadísticas Derivadas (Auto-calculadas)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Salud</span>
                      <strong className="text-xl font-mono text-primary">{derived.salud}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Estamina</span>
                      <strong className="text-xl font-mono text-indigo-400">{derived.estamina}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Evasión</span>
                      <strong className="text-xl font-mono text-foreground">{derived.evasion}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Coraje</span>
                      <strong className="text-xl font-mono text-foreground">{derived.coraje}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Iniciativa</span>
                      <strong className="text-xl font-mono text-foreground">{derived.iniciativa > 0 ? `+${derived.iniciativa}` : derived.iniciativa}</strong>
                    </div>
                    <div className="border border-border bg-muted/20 p-3 rounded-md text-center">
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">RED</span>
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
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Daño Base</span>
                      <strong className="text-xl font-mono text-red-400">{derived.dañoBase}</strong>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          );
        })()}
        {activeTab !== 'Atributos' && activeTab && groupedFields[activeTab] && (
          <div key={activeTab}>
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
        )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isSaving}>
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
