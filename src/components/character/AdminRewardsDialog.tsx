import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import useSWR from 'swr';

const fetcher = (url: string) => apiFetch(url).then(res => res.json());

export default function AdminRewardsDialog({ characterId, onClose }: { characterId: number, onClose: () => void }) {
  const [type, setType] = useState<'exp' | 'yen' | 'possession'>('exp');
  const [amount, setAmount] = useState<string>('');
  const [elementId, setElementId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { data: elements } = useSWR('/api/elements', fetcher);
  const elementKindLabel = (kind: string) => ({
    license: 'Licencia', permission: 'Permiso', certification: 'Certificación', trait: 'Rasgo', weakness: 'Debilidad',
    skill: 'Habilidad', equipment: 'Equipamiento', weapon: 'Arma', ammunition: 'Munición', consumable: 'Consumible',
  } as Record<string, string>)[kind] ?? 'Elemento';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) === 0) return toast.error("La cantidad no puede ser 0");
    if (!reason) return toast.error("Debes proporcionar un motivo");
    
    if (!window.confirm("¿Confirmar esta transacción?")) return;

    setLoading(true);
    try {
      if (type === 'possession') {
         if (!elementId) throw new Error("Debes especificar el elemento");
         const res = await apiFetch(`/api/admin/character/${characterId}/possession`, {
           method: 'POST',
           body: JSON.stringify({ elementId, quantity: parseInt(amount), reason })
         });
         if (!res.ok) throw new Error(await res.text());
      } else {
         const res = await apiFetch(`/api/admin/character/${characterId}/reward`, {
           method: 'POST',
           body: JSON.stringify({ type, amount: parseInt(amount), reason })
         });
         if (!res.ok) throw new Error(await res.text());
      }
      toast.success("Transacción exitosa");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error en la transacción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-md shadow-lg border border-border max-w-sm w-full">
        <h3 className="text-lg font-bold mb-4">Administrar Recompensas</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs mb-1 block">Tipo</label>
            <Select value={type} onValueChange={(v: any) => { setType(v); if (v === 'possession' && !amount) setAmount('1'); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exp">EXP</SelectItem>
                <SelectItem value="yen">Yen</SelectItem>
                <SelectItem value="possession">Elemento del catálogo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'possession' && (
            <div>
              <label className="text-xs mb-1 block">Elemento</label>
              <Select value={elementId} onValueChange={setElementId}>
                <SelectTrigger><SelectValue placeholder="Selecciona un elemento" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {elements?.map((el: any) => (
                    <SelectItem key={el.id} value={el.id}>[{elementKindLabel(el.kind)}] {el.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs mb-1 block">{type === 'possession' ? 'Cantidad (1 para otorgar, -1 para retirar)' : 'Cantidad (puede ser negativa)'}</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block">Motivo</label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: Recompensa de misión" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Confirmar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
