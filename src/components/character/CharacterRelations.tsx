import React, { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { apiFetch, fetcher } from "@/lib/api";

export function CharacterEmployments({ characterId, canonCharacterId }: { characterId?: number; canonCharacterId?: string }) {
  const ownerPath = canonCharacterId ? `/api/admin/canon-characters/${canonCharacterId}` : `/api/admin/characters/${characterId}`;
  const ownerPayload = canonCharacterId ? { canonCharacterId } : { characterId };
  const { data: employments, mutate: mutateEmployments } = useSWR(`${ownerPath}/employments`, fetcher);
  const { data: structure } = useSWR("/api/admin/employments/structure", fetcher);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!selectedPosition) return;
    setIsSubmitting(true);
    try {
      await apiFetch("/api/admin/employments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ownerPayload, positionId: selectedPosition })
      });
      toast.success("Empleo asignado");
      setSelectedPosition("");
      mutateEmployments();
    } catch (error: any) {
      toast.error(error.message || "Error al asignar empleo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("¿Retirar este empleo?")) return;
    try {
      await apiFetch(`/api/admin/employments/${id}`, { method: "DELETE" });
      toast.success("Empleo retirado");
      mutateEmployments();
    } catch (error: any) {
      toast.error(error.message || "Error al retirar empleo");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Empleos y Cargos</h3>
      <div className="space-y-2">
        {employments?.length === 0 && <p className="text-sm text-muted-foreground">Sin empleos asignados.</p>}
        {employments?.map((emp: any) => (
          <div key={emp.employment.id} className="flex justify-between items-center p-3 border rounded bg-muted/20">
            <div>
              <p className="font-medium">{emp.position.name}</p>
              <p className="text-xs text-muted-foreground">{emp.institution.name} - {emp.department.name}</p>
            </div>
            <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemove(emp.employment.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center pt-2">
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
        >
          <option value="">Seleccionar posición...</option>
          {structure?.filter((i: any) => i.active)?.map((inst: any) => (
            <optgroup key={inst.id} label={inst.name}>
              {inst.departments?.filter((d: any) => d.active)?.map((dep: any) => (
                dep.positions?.filter((p: any) => p.active)?.map((pos: any) => (
                  <option key={pos.id} value={pos.id} disabled={pos.capacity !== null && pos.occupiedSlots >= pos.capacity}>
                    {dep.name} - {pos.name} {pos.capacity !== null ? `(${pos.occupiedSlots}/${pos.capacity})` : ''}
                  </option>
                ))
              ))}
            </optgroup>
          ))}
        </select>
        <Button onClick={handleAdd} disabled={!selectedPosition || isSubmitting} size="sm">
          <Plus className="size-4 mr-2" /> Asignar
        </Button>
      </div>
    </div>
  );
}

export function CharacterEnrollments({ characterId, canonId, canonCharacterId }: { characterId?: number; canonId?: string | null; canonCharacterId?: string }) {
  const effectiveCanonId = canonCharacterId || canonId || null;
  const ownerPath = canonCharacterId ? `/api/admin/canon-characters/${canonCharacterId}` : `/api/admin/characters/${characterId}`;
  const ownerPayload = canonCharacterId ? { canonCharacterId } : { characterId };
  const { data: enrollment, mutate: mutateEnrollment } = useSWR(`${ownerPath}/enrollment`, fetcher);
  const { data: structure } = useSWR("/api/admin/classes/structure", fetcher);
  const [selectedClass, setSelectedClass] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!selectedClass) return;
    setIsSubmitting(true);
    try {
      await apiFetch("/api/admin/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ownerPayload, classGroupId: selectedClass })
      });
      toast.success("Inscrito en clase");
      setSelectedClass("");
      mutateEnrollment();
    } catch (error: any) {
      toast.error(error.message || "Error al inscribir");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("¿Retirar de esta clase?")) return;
    try {
      await apiFetch(`/api/admin/enrollments/${id}`, { method: "DELETE" });
      toast.success("Inscripción retirada");
      mutateEnrollment();
    } catch (error: any) {
      toast.error(error.message || "Error al retirar inscripción");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Clase / Grupo</h3>
      
      {enrollment ? (
        <div className="flex justify-between items-center p-3 border rounded bg-muted/20">
          <div>
            <p className="font-medium">{enrollment.classGroup.name}</p>
            <p className="text-xs text-muted-foreground">{enrollment.academicYear.name}</p>
          </div>
          <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemove(enrollment.enrollment.id)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Sin clase asignada.</p>
          <div className="flex gap-2 items-center">
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">Seleccionar clase...</option>
              {structure?.filter((y: any) => y.active)?.map((year: any) => (
                <optgroup key={year.id} label={year.name}>
                  {year.classes?.filter((c: any) => c.active)?.map((cls: any) => (
                    <option key={cls.id} value={cls.id} disabled={!effectiveCanonId && cls.capacity !== 0 && cls.usedSlots >= cls.capacity}>
                      {cls.name} {(!effectiveCanonId && cls.capacity !== 0) ? `(${cls.usedSlots}/${cls.capacity})` : '(No cuenta hacia el límite)'}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Button onClick={handleAdd} disabled={!selectedClass || isSubmitting} size="sm">
              <Plus className="size-4 mr-2" /> Inscribir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
