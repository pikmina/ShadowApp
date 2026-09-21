import { describe, it, expect } from "vitest";
import {
  MECHANICAL_LABELS,
  getMechanicalLabel,
  getAlteredStatusLabel,
  getAttributeLabel,
  getResourceLabel,
  getTagLabel,
} from "../domain/mechanicalLabels";

describe("Mechanical Labels Registry (Spanish Localization)", () => {
  it("provides canonical Spanish labels for all behavior modes", () => {
    expect(getMechanicalLabel("modes", "active")).toBe("Activo");
    expect(getMechanicalLabel("modes", "reactive")).toBe("Reactivo");
    expect(getMechanicalLabel("modes", "continuous")).toBe("Continuo");
  });

  it("provides canonical Spanish labels for triggers", () => {
    expect(getMechanicalLabel("triggers", "receive_damage")).toBe("Recibir daño");
    expect(getMechanicalLabel("triggers", "deal_damage")).toBe("Infligir daño");
    expect(getMechanicalLabel("triggers", "turn_start")).toBe("Inicio del turno");
    expect(getMechanicalLabel("triggers", "turn_end")).toBe("Fin del turno");
    expect(getMechanicalLabel("triggers", "spend_resource")).toBe("Gastar recurso");
    expect(getMechanicalLabel("triggers", "resource_threshold_crossed")).toBe("Cruzar umbral de recurso");
  });

  it("provides canonical Spanish labels for condition types", () => {
    expect(getMechanicalLabel("conditionTypes", "resource")).toBe("Valor de recurso");
    expect(getMechanicalLabel("conditionTypes", "percentage")).toBe("Porcentaje de recurso");
    expect(getMechanicalLabel("conditionTypes", "tag")).toBe("Etiqueta / Tag");
    expect(getMechanicalLabel("conditionTypes", "die")).toBe("Dado individual");
  });

  it("provides canonical Spanish labels for effect types", () => {
    expect(getMechanicalLabel("effectTypes", "damage")).toBe("Infligir Daño");
    expect(getMechanicalLabel("effectTypes", "healing")).toBe("Curación");
    expect(getMechanicalLabel("effectTypes", "barrier")).toBe("Otorgar Barrera");
    expect(getMechanicalLabel("effectTypes", "status_apply")).toBe("Aplicar Estado Alterado");
    expect(getMechanicalLabel("effectTypes", "status_remove")).toBe("Eliminar Estado Alterado");
    expect(getMechanicalLabel("effectTypes", "cost_modifier")).toBe("Modificar Coste");
    expect(getMechanicalLabel("effectTypes", "turn_loss")).toBe("Pérdida de Turno");
  });

  it("provides canonical Spanish labels for targets and durations", () => {
    expect(getMechanicalLabel("targets", "self")).toBe("Uno mismo");
    expect(getMechanicalLabel("targets", "enemy")).toBe("Enemigo");
    expect(getMechanicalLabel("targets", "ally")).toBe("Aliado");
    expect(getMechanicalLabel("durations", "instant")).toBe("Instantánea");
    expect(getMechanicalLabel("durations", "turns")).toBe("Turnos");
    expect(getMechanicalLabel("durations", "permanent")).toBe("Permanente");
  });

  it("resolves canonical altered status IDs to human readable Spanish", () => {
    expect(getAlteredStatusLabel("core.status.stunned")).toBe("Aturdido");
    expect(getAlteredStatusLabel("core.status.vulnerable")).toBe("Vulnerable");
    expect(getAlteredStatusLabel("core.status.berserker")).toBe("Berserker");
    expect(getAlteredStatusLabel("core.status.paralyzed")).toBe("Paralizado");
    expect(getAlteredStatusLabel("support_blocked")).toBe("Soporte Bloqueado");
  });

  it("handles fallback gracefully without throwing", () => {
    expect(getMechanicalLabel("triggers", "unknown_custom_trigger")).toBe("Unknown Custom Trigger");
    expect(getMechanicalLabel("modes", "")).toBe("");
    expect(getAlteredStatusLabel("unknown.status.custom_bleed")).toBe("Unknown Status Custom Bleed");
  });
});
