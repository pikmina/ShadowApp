import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { apiFetch, fetcher } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";


export default function CharacterEditor({ character, onSaved, onCancel }: { character?: any, onSaved: () => void, onCancel?: () => void }) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>(character?.profileData || {});

  const { data: fields, error: fieldsError } = useSWR(user ? "/api/sheet-fields" : null, fetcher);
  const { data: settings, error: settingsError } = useSWR(user ? "/api/settings" : null, fetcher);

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
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  });

  useEffect(() => {
    if (character?.profileData) {
      setFormData(character.profileData);
    }
  }, [character]);

  useEffect(() => {
    if (processedFields.length > 0 && !activeTab) {
      const categories = Object.keys(groupedFields).sort((a, b) => {
        const getOrder = (cat: string) => {
          if (cat === 'Datos Administrativos') return 1;
          if (cat === 'Datos Básicos') return 2;
          return 3;
        };
        return getOrder(a) - getOrder(b);
      });
      if (categories.length > 0) setActiveTab(categories[0]);
    }
  }, [processedFields.length, activeTab, Object.keys(groupedFields).join(',')]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          characterId: character?.id,
          name: formData.name || formData.alias || "Unnamed",
          profileData: formData
        })
      });
      if (!res.ok) throw new Error("Error saving");
      toast.success("Ficha guardada exitosamente");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (id: string, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (!fields || !settings) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const renderField = (field: any) => {
    // (rest of renderField...)
    const value = formData[field.id] || "";

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
              <Label className="text-xs block text-primary">Nivel 1 (Despertar)</Label>
              <Textarea value={formData[`${field.id}_lvl1`] || ''} onChange={e => updateField(`${field.id}_lvl1`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-primary">Nivel 2 (Desarrollo)</Label>
              <Textarea value={formData[`${field.id}_lvl2`] || ''} onChange={e => updateField(`${field.id}_lvl2`, e.target.value)} />
            </div>
            <div className="space-y-2 border-t border-border pt-2">
              <Label className="text-xs block text-primary">Nivel 3 (Maestría)</Label>
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
            {formData['Nombre']?.charAt(0) || character?.name?.charAt(0) || 'P'}
          </div>
          <div>
            <h2 className="text-2xl font-bold font-oxanium text-foreground flex items-center gap-3">
              Editar Registro: {formData['Nombre'] || formData['name'] || character?.name || "Sin Nombre"}
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

      <div className="flex bg-card/40 border border-border overflow-x-auto custom-scrollbar rounded-lg mb-6 p-1 gap-1 items-center">
        {Object.keys(groupedFields).sort((a, b) => {
          const getOrder = (cat: string) => {
            if (cat === 'Datos Administrativos') return 1;
            if (cat === 'Datos Básicos') return 2;
            return 3;
          };
          return getOrder(a) - getOrder(b);
        }).map(category => (
          <Button
            key={category}
            variant="ghost"
            size="sm"
            className={`whitespace-nowrap shrink-0 transition-colors rounded-md font-medium h-9 px-4 ${activeTab === category ? 'bg-background text-primary border border-border/50 shadow-sm hover:bg-background/80 hover:text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            onClick={() => setActiveTab(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab && groupedFields[activeTab] && (
          <Card key={activeTab} className="border-border">
            <CardHeader className="border-b bg-muted/30 pb-3">
              <CardTitle className="text-base uppercase tracking-wider text-primary">{activeTab}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupedFields[activeTab].sort((a: any, b: any) => a.order - b.order).map((field: any) => (
                  <div key={field.id} className={`space-y-2 ${['textarea', 'quirk', 'image', 'multiselect'].includes(field.type) ? 'md:col-span-2' : ''} w-full`}>
                    <Label>{field.name}</Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
