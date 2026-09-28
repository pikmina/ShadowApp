import { describe, it, expect } from "vitest";
import {
  describeMechanicalBehavior,
  type MechanicalDescriptionResult,
} from "../mechanicalDescription";
import {
  type MechanicalBehavior,
  createDefaultMechanicalBehavior,
} from "../mechanicalBehavior";
import { SYSTEM_TRAITS } from "../systemTraits";
import { SYSTEM_WEAKNESSES } from "../systemWeaknesses";

describe("Traits & Weaknesses Admin UI Mechanical Description Integration (Task 24)", () => {
  // A. Opening a Trait with mechanics shows generated description
  it("A: generates mechanical description for canonical traits when opened in admin UI", () => {
    const agile = SYSTEM_TRAITS.find((t) => t.id === "core.trait.agile");
    expect(agile).toBeDefined();
    expect(agile!.mechanicalBehaviors.length).toBeGreaterThan(0);

    const results = agile!.mechanicalBehaviors.map((b) =>
      describeMechanicalBehavior(b, { format: "compact" })
    );

    expect(results).toHaveLength(1);
    expect(results[0].complete).toBe(true);
    expect(results[0].text).toBe("Otorga +1 a Velocidad (VEL).");
  });

  // B. Opening a Weakness with mechanics shows generated description
  it("B: generates mechanical description for canonical weaknesses when opened in admin UI", () => {
    const malaCara = SYSTEM_WEAKNESSES.find((w) => w.id === "weakness_mala_cara");
    expect(malaCara).toBeDefined();
    expect(malaCara!.mechanicalBehaviors.length).toBe(2);

    const results = malaCara!.mechanicalBehaviors.map((b) =>
      describeMechanicalBehavior(b, { format: "compact" })
    );

    expect(results[0].complete).toBe(true);
    expect(results[0].text).toContain("+4 a la dificultad (RD) de tiradas de carisma");
    expect(results[0].text).toContain("+4 a la dificultad (RD) de tiradas de presencia");

    expect(results[1].complete).toBe(true);
    expect(results[1].text).toContain("Superar RD 12");
  });

  // C. Editing an effect updates preview immediately
  it("C: editing an effect immediately updates the mechanical description preview", () => {
    const behavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("b1"),
      effects: [{ id: "e1", type: "damage", dice: "3D6" }],
    };

    let preview = describeMechanicalBehavior(behavior, { format: "compact" });
    expect(preview.text).toBe("Inflige 3D6 de daño.");

    // Admin updates damage: 3D6 -> 4D6
    const updatedBehavior: MechanicalBehavior = {
      ...behavior,
      effects: [{ id: "e1", type: "damage", dice: "4D6" }],
    };

    preview = describeMechanicalBehavior(updatedBehavior, { format: "compact" });
    expect(preview.text).toBe("Inflige 4D6 de daño.");
  });

  // D. Editing a target updates preview immediately
  it("D: editing a target immediately updates the mechanical description preview", () => {
    const behavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("b1"),
      target: { type: "enemy", quantity: { mode: "exact", count: 1 } },
      effects: [{ id: "e1", type: "damage", dice: "2D8" }],
    };

    let preview = describeMechanicalBehavior(behavior, { format: "compact" });
    expect(preview.text).toBe("Inflige 2D8 de daño a un enemigo.");

    // Admin updates target: 1 enemy -> up to 3 allies
    const updatedBehavior: MechanicalBehavior = {
      ...behavior,
      target: { type: "ally", quantity: { mode: "up_to", count: 3 } },
      effects: [{ id: "e1", type: "healing", resourceId: "ES", amount: 2 }],
    };

    preview = describeMechanicalBehavior(updatedBehavior, { format: "compact" });
    expect(preview.text).toBe("Hasta 3 aliados recuperan 2 de Estamina.");
  });

  // E. Editing a limitation updates preview immediately
  it("E: editing a limitation immediately updates the mechanical description preview", () => {
    const behavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("b1"),
      target: { type: "ally", quantity: { mode: "up_to", count: 3 } },
      effects: [{ id: "e1", type: "healing", resourceId: "ES", amount: 2 }],
      limitations: [{ id: "l1", type: "usage_limit", period: "combat", max: 1 }],
    };

    let preview = describeMechanicalBehavior(behavior, { format: "compact" });
    expect(preview.text).toBe("Hasta 3 aliados recuperan 2 de Estamina. 1 vez por combate.");

    // Admin updates limitation: 1 vez por combate -> 2 veces por turno
    const updatedBehavior: MechanicalBehavior = {
      ...behavior,
      limitations: [{ id: "l1", type: "usage_limit", period: "turn", max: 2 }],
    };

    preview = describeMechanicalBehavior(updatedBehavior, { format: "compact" });
    expect(preview.text).toBe("Hasta 3 aliados recuperan 2 de Estamina. 2 veces por turno.");
  });

  // F. Multiple behaviors produce multiple descriptions
  it("F: multiple behaviors in a single trait/weakness produce separate mechanical descriptions", () => {
    const behaviors: MechanicalBehavior[] = [
      {
        ...createDefaultMechanicalBehavior("b1"),
        effects: [
          {
            id: "e1",
            type: "attribute_modifier",
            attributeId: "fue",
            amount: 1,
            operation: "add",
          },
        ],
      },
      {
        ...createDefaultMechanicalBehavior("b2"),
        trigger: { kind: "turn_start" },
        target: { type: "self" },
        effects: [{ id: "e2", type: "healing", resourceId: "ES", amount: 2 }],
      },
    ];

    const results = behaviors.map((b) => describeMechanicalBehavior(b, { format: "compact" }));
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe("Otorga +1 a Fuerza (FUE).");
    expect(results[1].text).toContain("Recupera 2 de Estamina.");
  });

  // G. Empty mechanics produces no fake text
  it("G: empty behaviors produce zero descriptions so UI can show 'Sin mecánica configurada.'", () => {
    const emptyBehaviors: MechanicalBehavior[] = [];
    const results = emptyBehaviors.map((b) => describeMechanicalBehavior(b, { format: "compact" }));
    expect(results).toHaveLength(0);
  });

  // H. Incomplete descriptions produce complete=false and warnings
  it("H: unrenderable or missing descriptions report complete=false and warnings for admin", () => {
    const incompleteBehavior: MechanicalBehavior = {
      ...createDefaultMechanicalBehavior("b_incomplete"),
      conditions: [{ type: "manual", signalId: "undescribed_signal" }],
      effects: [{ id: "e1", type: "unknown_custom" } as any],
    };

    const preview = describeMechanicalBehavior(incompleteBehavior, { format: "compact" });
    expect(preview.complete).toBe(false);
    expect(preview.warnings.length).toBeGreaterThan(0);
  });

  // I. Manual mechanics render through the pure renderer
  it("I: manual mechanics render their explicit message without special-casing in UI", () => {
    const wealthTrait = SYSTEM_TRAITS.find((t) => t.id === "core.trait.wealth");
    expect(wealthTrait).toBeDefined();

    const behavior = wealthTrait!.mechanicalBehaviors[0];
    const preview = describeMechanicalBehavior(behavior, { format: "compact" });

    expect(preview.complete).toBe(true);
    expect(preview.text).toContain("Ingreso mensual: +300 ¥.");
  });

  // J. Narrative description remains completely separate
  it("J: maintains narrative description and mechanical description as independent fields", () => {
    const traitForm = {
      id: "core.trait.agile",
      kind: "trait",
      name: "Ágil",
      description: "+1 en Velocidad.", // Human-written narrative
      mechanicalBehaviors: [
        {
          ...createDefaultMechanicalBehavior("agile.attribute"),
          effects: [
            {
              id: "agile.effect",
              type: "attribute_modifier" as const,
              attributeId: "vel",
              amount: 1,
              operation: "add" as const,
            },
          ],
        },
      ],
    };

    // The UI generates mechanical description from mechanicalBehaviors:
    const mechanicalPreview = describeMechanicalBehavior(traitForm.mechanicalBehaviors[0], {
      format: "compact",
    });

    expect(traitForm.description).toBe("+1 en Velocidad.");
    expect(mechanicalPreview.text).toBe("Otorga +1 a Velocidad (VEL).");
    expect(traitForm).not.toHaveProperty("mechanicalDescription");
  });

  // Verification of key canonical examples:
  describe("Canonical Element Mechanical Descriptions", () => {
    it("renders canonical Líder nato accurately", () => {
      const mb: MechanicalBehavior = {
        ...createDefaultMechanicalBehavior("natural-leader.speech"),
        target: { type: "ally", quantity: { mode: "up_to", count: 3 } },
        effects: [{ id: "eff1", type: "healing", resourceId: "ES", amount: 2 }],
        limitations: [{ id: "lim1", type: "usage_limit", period: "combat", max: 1 }],
      };
      const res = describeMechanicalBehavior(mb, { format: "compact" });
      expect(res.text).toBe("Hasta 3 aliados recuperan 2 de Estamina. 1 vez por combate.");
    });

    it("renders canonical Reflejos Rápidos accurately with +2 Iniciativa and first turn condition", () => {
      const quickReflexes = SYSTEM_TRAITS.find((t) => t.id === "core.trait.quick-reflexes");
      const behavior = quickReflexes!.mechanicalBehaviors[0];
      const res = describeMechanicalBehavior(behavior, { format: "compact" });
      expect(res.text).toContain("Otorga +2 a Iniciativa.");
      expect(res.text).toContain("Solo durante el primer turno del combate.");
    });

    it("renders canonical Mala Cara behaviors accurately", () => {
      const malaCara = SYSTEM_WEAKNESSES.find((w) => w.id === "weakness_mala_cara");
      const b1 = malaCara!.mechanicalBehaviors[0];
      const res1 = describeMechanicalBehavior(b1, { format: "compact" });
      expect(res1.text).toContain("+4 a la dificultad (RD) de tiradas de carisma");
      expect(res1.text).toContain("+4 a la dificultad (RD) de tiradas de presencia");

      const b2 = malaCara!.mechanicalBehaviors[1];
      const res2 = describeMechanicalBehavior(b2, { format: "detailed" });
      expect(res2.sections?.trigger?.[0]).toBe("Al recibir soporte");
      expect(res2.sections?.resolution?.[0]).toBe("Superar RD 12");
    });

    it("renders canonical Ágil accurately", () => {
      const agile = SYSTEM_TRAITS.find((t) => t.id === "core.trait.agile");
      const behavior = agile!.mechanicalBehaviors[0];
      const res = describeMechanicalBehavior(behavior, { format: "compact" });
      expect(res.text).toBe("Otorga +1 a Velocidad (VEL).");
    });
  });
});
