import { describe, it, expect } from "vitest";
import {
  getCanonicalStatusDefaultTurns,
  CANONICAL_STATUS_FAMILIES,
  CANONICAL_SINGLE_STATUSES,
  parseStatusRemoveSelection,
  composeStatusRemoveId,
} from "../canonicalAlteredStatuses";

describe("Canonical Altered Statuses UI & Metadata Invariants", () => {
  describe("1. Canonical Duration in Turns (status_apply)", () => {
    it("returns correct default turns for non-tiered single statuses", () => {
      expect(getCanonicalStatusDefaultTurns("core.status.asfixia")).toBe(1);
      expect(getCanonicalStatusDefaultTurns("core.status.stunned")).toBe(1);
      expect(getCanonicalStatusDefaultTurns("core.status.coma_ilusorio")).toBe(3);
      expect(getCanonicalStatusDefaultTurns("core.status.dormido")).toBe(3);
      expect(getCanonicalStatusDefaultTurns("core.status.electrocutado")).toBe(1);
      expect(getCanonicalStatusDefaultTurns("core.status.desbalanceado")).toBe(1);
      expect(getCanonicalStatusDefaultTurns("core.status.congelado")).toBe(2);
      expect(getCanonicalStatusDefaultTurns("core.status.inmovilizado")).toBe(2);
      expect(getCanonicalStatusDefaultTurns("core.status.mutacion_visual")).toBe(4);
    });

    it("returns correct default turns for tiered status families", () => {
      expect(getCanonicalStatusDefaultTurns("core.status.hemorragia_leve")).toBe(2);
      expect(getCanonicalStatusDefaultTurns("core.status.hemorragia_grave")).toBe(4);
      expect(getCanonicalStatusDefaultTurns("core.status.quemadura_leve")).toBe(2);
      expect(getCanonicalStatusDefaultTurns("core.status.quemadura_grave")).toBe(4);
      expect(getCanonicalStatusDefaultTurns("core.status.veneno_leve")).toBe(2);
      expect(getCanonicalStatusDefaultTurns("core.status.veneno_grave")).toBe(3);
      expect(getCanonicalStatusDefaultTurns("core.status.berserker_leve")).toBe(2);
      expect(getCanonicalStatusDefaultTurns("core.status.berserker_grave")).toBe(3);
    });
  });

  describe("2. Status Removal & Severity Tier Selection (status_remove)", () => {
    it("identifies tiered families and correctly parses baseKey and tier", () => {
      const parsedHemoLeve = parseStatusRemoveSelection("core.status.hemorragia_leve");
      expect(parsedHemoLeve.hasTiers).toBe(true);
      expect(parsedHemoLeve.baseKey).toBe("core.status.hemorragia");
      expect(parsedHemoLeve.tier).toBe("leve");

      const parsedHemoGrave = parseStatusRemoveSelection("core.status.hemorragia_grave");
      expect(parsedHemoGrave.hasTiers).toBe(true);
      expect(parsedHemoGrave.baseKey).toBe("core.status.hemorragia");
      expect(parsedHemoGrave.tier).toBe("grave");

      const parsedHemoAll = parseStatusRemoveSelection("core.status.hemorragia");
      expect(parsedHemoAll.hasTiers).toBe(true);
      expect(parsedHemoAll.baseKey).toBe("core.status.hemorragia");
      expect(parsedHemoAll.tier).toBe("all");
    });

    it("identifies non-tiered statuses and reports hasTiers as false", () => {
      const parsedStun = parseStatusRemoveSelection("core.status.stunned");
      expect(parsedStun.hasTiers).toBe(false);
      expect(parsedStun.baseKey).toBe("core.status.stunned");

      const parsedAsfixia = parseStatusRemoveSelection("core.status.asfixia");
      expect(parsedAsfixia.hasTiers).toBe(false);
      expect(parsedAsfixia.baseKey).toBe("core.status.asfixia");

      const parsedAll = parseStatusRemoveSelection("all");
      expect(parsedAll.hasTiers).toBe(false);
      expect(parsedAll.baseKey).toBe("all");

      const parsedLeve = parseStatusRemoveSelection("leve");
      expect(parsedLeve.hasTiers).toBe(false);
      expect(parsedLeve.baseKey).toBe("leve");
    });

    it("composes canonical status removal IDs for tiered families", () => {
      expect(composeStatusRemoveId("core.status.hemorragia", "leve")).toBe("core.status.hemorragia_leve");
      expect(composeStatusRemoveId("core.status.hemorragia", "grave")).toBe("core.status.hemorragia_grave");
      expect(composeStatusRemoveId("core.status.hemorragia", "all")).toBe("core.status.hemorragia");

      expect(composeStatusRemoveId("core.status.quemadura", "leve")).toBe("core.status.quemadura_leve");
      expect(composeStatusRemoveId("core.status.quemadura", "grave")).toBe("core.status.quemadura_grave");

      expect(composeStatusRemoveId("core.status.veneno", "leve")).toBe("core.status.veneno_leve");
      expect(composeStatusRemoveId("core.status.veneno", "grave")).toBe("core.status.veneno_grave");

      expect(composeStatusRemoveId("core.status.berserker", "leve")).toBe("core.status.berserker_leve");
      expect(composeStatusRemoveId("core.status.berserker", "grave")).toBe("core.status.berserker_grave");
    });

    it("returns unmodified ID when composing a non-tiered status", () => {
      expect(composeStatusRemoveId("core.status.stunned", "leve")).toBe("core.status.stunned");
      expect(composeStatusRemoveId("core.status.asfixia", "grave")).toBe("core.status.asfixia");
      expect(composeStatusRemoveId("all", "leve")).toBe("all");
    });
  });
});
