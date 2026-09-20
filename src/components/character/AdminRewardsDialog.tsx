import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2, Package, Coins, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import useSWR from 'swr';

const fetcher = (url: string) => apiFetch(url).then(res => res.json());

interface AdminRewardsDialogProps {
  characterId: number;
  character?: any;
  onClose: () => void;
}

export default function AdminRewardsDialog({ characterId, character, onClose }: AdminRewardsDialogProps) {
  const [type, setType] = useState<'exp' | 'yen' | 'possession'>('possession');
  const [amount, setAmount] = useState<string>('1');
  const [elementId, setElementId] = useState<string>('');
  const [elementSearch, setElementSearch] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { data: rawElements } = useSWR('/api/elements', fetcher);
  const { data: rules } = useSWR('/api/rules', fetcher);

  const maxPurchasedAttributes = useMemo(() => {
    if (!Array.isArray(rules)) return 5;
    const r = rules.find((item: any) => item.key === 'max_purchased_attributes');
    return Number(r?.value?.max ?? r?.value) || 5;
  }, [rules]);

  const totalCharacterAttrUpgrades = useMemo(() => {
    if (!character?.possessions || !Array.isArray(character.possessions)) return 0;
    return character.possessions.reduce((sum: number, p: any) => {
      const elKind = p.element?.kind || p.kind;
      if (elKind === 'attribute_upgrade') {
        return sum + (p.possession?.quantity ?? p.quantity ?? 0);
      }
      return sum;
    }, 0);
  }, [character]);
  const elementKindLabel = (kind: string) => ({
    license: 'Licencia', permission: 'Permiso', certification: 'Certificación', trait: 'Rasgo', weakness: 'Debilidad',
    skill: 'Habilidad', equipment: 'Equipamiento', weapon: 'Arma', ammunition: 'Munición', consumable: 'Consumible',
    character_resource: 'Recurso de Personaje', attribute_upgrade: 'Mejora de Atributo', technique_entitlement: 'Técnica',
    altered_status: 'Estado Alterado', plus_ultra_effect: 'Efecto Plus Ultra', crafting_material: 'Material de Fabricación',
    ingredient: 'Ingrediente'
  } as Record<string, string>)[kind] ?? 'Elemento';

  // Strictly filter to published elements
  const publishedElements = useMemo(() => {
    if (!Array.isArray(rawElements)) return [];
    return rawElements.filter((el: any) => el.status === 'published');
  }, [rawElements]);

  // Filter published elements by search query
  const filteredElements = useMemo(() => {
    const q = elementSearch.trim().toLowerCase();
    if (!q) return publishedElements;
    return publishedElements.filter((el: any) => {
      const name = (el.name || '').toLowerCase();
      const kindLabel = (elementKindLabel(el.kind) || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      return name.includes(q) || kindLabel.includes(q) || id.includes(q);
    });
  }, [publishedElements, elementSearch]);

  const selectedElement = useMemo(() => {
    if (!elementId) return null;
    return publishedElements.find((el: any) => el.id === elementId) ?? null;
  }, [publishedElements, elementId]);

  // Existing possession quantity of this character
  const currentQuantityInPossession = useMemo(() => {
    if (!selectedElement || !character?.possessions || !Array.isArray(character.possessions)) return 0;
    const match = character.possessions.find((p: any) => p.element?.id === selectedElement.id || p.possession?.elementId === selectedElement.id);
    return match?.possession?.quantity ?? 0;
  }, [selectedElement, character]);

  // Ensure selected element is always in the options list for Radix Select to display it
  const displayElements = useMemo(() => {
    if (!selectedElement) return filteredElements;
    if (filteredElements.some((el: any) => el.id === selectedElement.id)) {
      return filteredElements;
    }
    return [selectedElement, ...filteredElements];
  }, [filteredElements, selectedElement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount || '1', 10);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return toast.error("La cantidad debe ser un número entero diferente de 0");
    }

    const finalReason = reason.trim() || (type === 'possession' ? 'Asignación de elemento por administración' : 'Recompensa por administración');

    setLoading(true);
    try {
      if (type === 'possession') {
        if (!elementId) {
          setLoading(false);
          return toast.error("Debes seleccionar un elemento del catálogo");
        }
        await apiFetch(`/api/admin/character/${characterId}/possession`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elementId, quantity: parsedAmount, reason: finalReason })
        });
        toast.success(`Posesión actualizada (${selectedElement?.name || 'Elemento'}: ${parsedAmount > 0 ? `+${parsedAmount}` : parsedAmount})`);
      } else {
        await apiFetch(`/api/admin/character/${characterId}/reward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount: parsedAmount, reason: finalReason })
        });
        toast.success(`Recompensa asignada (${type === 'exp' ? `${parsedAmount} EXP` : `¥${parsedAmount}`})`);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la transacción");
    } finally {
      setLoading(false);
    }
  };

  const typeDisplayLabels: Record<string, string> = {
    possession: 'Elemento del Catálogo (Posesión)',
    exp: 'Experiencia (EXP)',
    yen: 'Yenes (¥)',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-card p-6 rounded-lg shadow-xl border border-border max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="text-base font-bold font-oxanium text-foreground tracking-wide">
              Administrar Recompensas y Posesiones
            </h3>
            {character?.name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <User className="size-3 text-primary" />
                <span className="font-semibold text-foreground">{character.name}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-amber-400 font-mono text-[11px]">{character.exp ?? 0} EXP</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-emerald-400 font-mono text-[11px]">¥ {character.yen ?? 0}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            title="Cerrar diálogo"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-0.5">
          <div>
            <label className="text-xs mb-1.5 block font-medium text-foreground">Tipo de Recompensa</label>
            <Select 
              value={type} 
              onValueChange={(v: any) => { 
                setType(v); 
                if (v === 'possession' && (!amount || amount === '0')) setAmount('1'); 
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Selecciona un tipo">
                  {typeDisplayLabels[type] || 'Selecciona un tipo'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="possession" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="size-3.5 text-primary" />
                    <span>Elemento del Catálogo (Posesión)</span>
                  </div>
                </SelectItem>
                <SelectItem value="exp" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>Experiencia (EXP)</span>
                  </div>
                </SelectItem>
                <SelectItem value="yen" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Coins className="size-3.5 text-emerald-400" />
                    <span>Yenes (¥)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'possession' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium block text-foreground">Elemento del Catálogo</label>
                <span className="text-[11px] text-emerald-500 font-medium">● Solo publicados</span>
              </div>

              {/* Buscador de elementos */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, tipo o ID..."
                  value={elementSearch}
                  onChange={e => setElementSearch(e.target.value)}
                  className="h-8 pl-8 pr-7 text-xs bg-background/50"
                />
                {elementSearch && (
                  <button
                    type="button"
                    onClick={() => setElementSearch('')}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    title="Limpiar búsqueda"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Selector con elementos filtrados */}
              <Select value={elementId} onValueChange={setElementId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder={publishedElements.length === 0 ? "No hay elementos disponibles" : "Selecciona un elemento..."}>
                    {selectedElement ? `[${elementKindLabel(selectedElement.kind)}] ${selectedElement.name}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {displayElements.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      No se encontraron elementos publicados
                    </div>
                  ) : (
                    displayElements.map((el: any) => (
                      <SelectItem key={el.id} value={el.id} className="text-xs">
                        <span className="text-muted-foreground font-mono text-[10px] mr-1.5">
                          [{elementKindLabel(el.kind)}]
                        </span>
                        <span className="font-medium">{el.name}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {/* Ficha de detalles del elemento seleccionado */}
              {selectedElement && (
                <div className="p-3 rounded-md bg-muted/40 border border-border/70 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground truncate">{selectedElement.name}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 h-4 shrink-0">
                      {elementKindLabel(selectedElement.kind)}
                    </Badge>
                  </div>
                  {selectedElement.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {selectedElement.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground">
                      Actualmente en inventario:
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {currentQuantityInPossession} unidad(es)
                    </span>
                  </div>
                  {selectedElement.kind === 'attribute_upgrade' && (
                    <div className={`p-2 rounded mt-1 border text-[11px] space-y-0.5 ${
                      totalCharacterAttrUpgrades >= maxPurchasedAttributes 
                        ? 'bg-destructive/10 border-destructive/30 text-destructive' 
                        : 'bg-amber-500/10 border-amber-500/20 text-foreground'
                    }`}>
                      <div className="flex justify-between font-semibold">
                        <span>Límite de Mejoras de Atributo:</span>
                        <span className="font-mono">{totalCharacterAttrUpgrades} / {maxPurchasedAttributes} máx.</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {totalCharacterAttrUpgrades >= maxPurchasedAttributes 
                          ? 'El personaje ya ha alcanzado el límite máximo de mejoras configurado en las reglas.'
                          : `Quedan ${maxPurchasedAttributes - totalCharacterAttrUpgrades} mejoras disponibles para este personaje.`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {filteredElements.length} de {publishedElements.length} elemento(s) disponible(s)
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs mb-1 block font-medium text-foreground">
              {type === 'possession' ? 'Cantidad (número positivo para otorgar, negativo para retirar)' : 'Cantidad (puede ser positiva o negativa)'}
            </label>
            <Input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder={type === 'possession' ? '1' : '100'}
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs mb-1 block font-medium text-foreground">Motivo (Opcional)</label>
            <Input 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="Ej: Recompensa de misión, compra de evento, ajuste" 
              className="text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading || (type === 'possession' && !elementId)} className="gap-1.5">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>{loading ? "Guardando..." : "Confirmar"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
