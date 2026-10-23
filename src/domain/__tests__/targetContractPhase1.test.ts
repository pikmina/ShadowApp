import { describe, it, expect } from "vitest";
import {
  mechanicalTargetSchema,
  normalizeMechanicalTarget,
  CANONICAL_TARGET_TYPES,
  type MechanicalTarget,
} from "../mechanicalBehavior.ts";
import { describeMechanicalTarget } from "../mechanicalDescription.ts";
import { getMechanicalLabel } from "../mechanicalLabels.ts";

describe("Fase 1 — Contrato de Objetivos, Normalización y Tipado", () => {
  describe("1. Invariante «self» y Preservación de description", () => {
    it("canonicaliza un target 'self' contaminado eliminando quantity, range, area, selectionMode, selectionRestriction y excludeSelf", () => {
      const contaminated = {
        type: "self",
        excludeSelf: true,
        quantity: { mode: "up_to", count: 3 },
        range: { type: "distance", distanceMeters: 20 },
        area: { shape: "radius", sizeMeters: 10 },
        selectionMode: "manual",
        selectionRestriction: "random",
      };

      const parsed = mechanicalTargetSchema.parse(contaminated);
      expect(parsed).toEqual({ type: "self" });

      const normalized = normalizeMechanicalTarget(contaminated);
      expect(normalized).toEqual({ type: "self" });
    });

    it("preserva la propiedad documental 'description' en 'self' tanto en parse como en normalizeMechanicalTarget", () => {
      const withDescription = {
        type: "self",
        description: "Enfoque sobre el cuerpo físico del propio ejecutor",
        range: { type: "distance", distanceMeters: 10 }, // Debe eliminarse
        excludeSelf: true, // Debe eliminarse
      };

      const parsed = mechanicalTargetSchema.parse(withDescription);
      expect(parsed).toEqual({
        type: "self",
        description: "Enfoque sobre el cuerpo físico del propio ejecutor",
      });

      const normalized = normalizeMechanicalTarget(withDescription);
      expect(normalized).toEqual({
        type: "self",
        description: "Enfoque sobre el cuerpo físico del propio ejecutor",
      });
    });

    it("garantiza idempotencia estructural estricta en normalizeMechanicalTarget", () => {
      const inputs = [
        { type: "self" },
        { type: "self", description: "Aura personal" },
        {
          type: "self",
          quantity: { mode: "up_to", count: 5 },
          range: { type: "contact" },
          excludeSelf: true,
        },
      ];

      for (const input of inputs) {
        const pass1 = normalizeMechanicalTarget(input);
        const pass2 = normalizeMechanicalTarget(pass1);
        expect(pass2).toEqual(pass1);
      }
    });
  });

  describe("2. Normalización Intencional de Facciones (enemy, ally, enemies, allies)", () => {
    it("normaliza 'enemy' a type: 'character' con excludeSelf: true en mechanicalTargetSchema", () => {
      const parsedEnemy = mechanicalTargetSchema.parse({ type: "enemy" });
      expect(parsedEnemy.type).toBe("character");
      expect(parsedEnemy.excludeSelf).toBe(true);

      const parsedAlly = mechanicalTargetSchema.parse({ type: "ally" });
      expect(parsedAlly.type).toBe("character");
      expect(parsedAlly.excludeSelf).toBe(true);
    });

    it("normaliza 'enemy' a type: 'character' con excludeSelf: true en memoria mediante normalizeMechanicalTarget", () => {
      const normalized = normalizeMechanicalTarget({ type: "enemy" });
      expect(normalized.type).toBe("character");
      expect(normalized.excludeSelf).toBe(true);
      expect(normalized.quantity).toBeUndefined();
    });

    it("normaliza 'ally' a type: 'character' con excludeSelf: true en memoria mediante normalizeMechanicalTarget", () => {
      const normalized = normalizeMechanicalTarget({ type: "ally" });
      expect(normalized.type).toBe("character");
      expect(normalized.excludeSelf).toBe(true);
      expect(normalized.quantity).toBeUndefined();
    });

    it("normaliza 'enemies' a type: 'character', excludeSelf: true y quantity { mode: 'all' } cuando no se definió cantidad", () => {
      const normalized = normalizeMechanicalTarget({ type: "enemies" });
      expect(normalized.type).toBe("character");
      expect(normalized.excludeSelf).toBe(true);
      expect(normalized.quantity).toEqual({ mode: "all" });
      expect(normalized.selectionMode).toBe("standard_priority");
    });

    it("normaliza 'allies' a type: 'character', excludeSelf: true y quantity { mode: 'all' } cuando no se definió cantidad", () => {
      const normalized = normalizeMechanicalTarget({ type: "allies" });
      expect(normalized.type).toBe("character");
      expect(normalized.excludeSelf).toBe(true);
      expect(normalized.quantity).toEqual({ mode: "all" });
    });

    it("preserva la cantidad explícita preexistente al normalizar 'enemies' y 'allies'", () => {
      const enemiesCount = normalizeMechanicalTarget({
        type: "enemies",
        quantity: { mode: "up_to", count: 3 },
      });
      expect(enemiesCount.type).toBe("character");
      expect(enemiesCount.excludeSelf).toBe(true);
      expect(enemiesCount.quantity).toEqual({ mode: "up_to", count: 3 });

      const alliesCount = normalizeMechanicalTarget({
        type: "allies",
        quantity: { mode: "exact", count: 2 },
      });
      expect(alliesCount.type).toBe("character");
      expect(alliesCount.excludeSelf).toBe(true);
      expect(alliesCount.quantity).toEqual({ mode: "exact", count: 2 });
    });

    it("preserva selectionRestriction al normalizar a selectionMode", () => {
      const parsedRandom = normalizeMechanicalTarget({
        type: "enemy",
        selectionRestriction: "random",
      });
      expect(parsedRandom.type).toBe("character");
      expect(parsedRandom.excludeSelf).toBe(true);
      expect(parsedRandom.selectionMode).toBe("random");
      expect(parsedRandom.selectionRestriction).toBe("random");

      const parsedNearest = normalizeMechanicalTarget({
        type: "ally",
        selectionRestriction: "nearest",
      });
      expect(parsedNearest.type).toBe("character");
      expect(parsedNearest.excludeSelf).toBe(true);
      expect(parsedNearest.selectionMode).toBe("standard_priority");
      expect(parsedNearest.selectionRestriction).toBe("nearest");
    });
  });

  describe("3. Manejo Nativo de 'character' y la propiedad 'excludeSelf'", () => {
    it("admite 'character' nativo con excludeSelf omitido o undefined", () => {
      const parsed = mechanicalTargetSchema.parse({ type: "character" });
      expect(parsed.type).toBe("character");
      expect(parsed.excludeSelf).toBeUndefined();
    });

    it("admite 'character' nativo con excludeSelf: true", () => {
      const parsed = mechanicalTargetSchema.parse({
        type: "character",
        excludeSelf: true,
        quantity: { mode: "exact", count: 1 },
      });
      expect(parsed.type).toBe("character");
      expect(parsed.excludeSelf).toBe(true);
      expect(parsed.quantity).toEqual({ mode: "exact", count: 1 });
    });

    it("admite 'character' nativo con excludeSelf: false (permitiendo auto-inclusión)", () => {
      const parsed = mechanicalTargetSchema.parse({
        type: "character",
        excludeSelf: false,
      });
      expect(parsed.type).toBe("character");
      expect(parsed.excludeSelf).toBe(false);
    });
  });

  describe("4. Preservación Estricta de Tipos No-Personaje y 'any'", () => {
    it("preserva 'any' como tipo separado sin convertirlo a 'character'", () => {
      const parsed = mechanicalTargetSchema.parse({ type: "any" });
      expect(parsed.type).toBe("any");
      expect(parsed.excludeSelf).toBeUndefined();

      const normalized = normalizeMechanicalTarget({ type: "any" });
      expect(normalized.type).toBe("any");
    });

    it("preserva 'zone' como tipo canónico válido", () => {
      expect(CANONICAL_TARGET_TYPES).toContain("zone");

      const parsed = mechanicalTargetSchema.parse({
        type: "zone",
        range: { type: "distance", distanceMeters: 30 },
      });
      expect(parsed.type).toBe("zone");
      expect(parsed.range).toEqual({ type: "distance", distanceMeters: 30 });
    });

    it("preserva 'object' y 'structure' sin alteraciones", () => {
      const parsedObj = mechanicalTargetSchema.parse({ type: "object" });
      expect(parsedObj.type).toBe("object");

      const parsedStruct = mechanicalTargetSchema.parse({ type: "structure" });
      expect(parsedStruct.type).toBe("structure");
    });

    it("preserva 'area' como tipo histórico sin inventar dimensiones", () => {
      const parsed = mechanicalTargetSchema.parse({ type: "area" });
      expect(parsed.type).toBe("area");
      expect(parsed.area).toBeUndefined();
    });

    it("preserva 'manual', 'roll', 'resource' y 'active_element' sin alteración", () => {
      const types = ["manual", "roll", "resource", "active_element"] as const;
      for (const t of types) {
        const parsed = mechanicalTargetSchema.parse({ type: t });
        expect(parsed.type).toBe(t);
      }
    });
  });

  describe("5. Descriptores Mecánicos y Etiquetas para 'zone'", () => {
    it("describeMechanicalTarget reconoce 'zone' con texto correcto y sin advertencias", () => {
      const desc = describeMechanicalTarget({ type: "zone" });
      expect(desc.text).toBe("En la zona seleccionada");
      expect(desc.complete).toBe(true);
      expect(desc.warnings).toHaveLength(0);
    });

    it("getMechanicalLabel reconoce la etiqueta de 'zone'", () => {
      const label = getMechanicalLabel("targets", "zone");
      expect(label).toBe("Zona / Coordenada espacial");
    });
  });

  describe("6. Comportamiento frente a Propiedades Desconocidas", () => {
    it("el esquema Zod descarta propiedades arbitrarias no declaradas sin fallar", () => {
      const withUnknown = {
        type: "character",
        excludeSelf: true,
        arbitraryUnrecognizedField: "some-value",
        legacyExtraNumber: 999,
      };

      const parsed = mechanicalTargetSchema.parse(withUnknown);
      expect(parsed.type).toBe("character");
      expect(parsed.excludeSelf).toBe(true);
      expect((parsed as any).arbitraryUnrecognizedField).toBeUndefined();
      expect((parsed as any).legacyExtraNumber).toBeUndefined();
    });
  });
});
