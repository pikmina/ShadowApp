import { describe, it, expect } from "vitest";
import {
  extractDieSides,
  filterDamageOptionsByBaseDice,
} from "../weaponMechanics.ts";
import { createCoreCategories, getCategoryOptions } from "../coreRuleCatalog.ts";
import type { CategoryOptionView } from "../coreRuleCatalog.ts";

describe("Fase 1: Filtrado estructurado de dados de daño en armas", () => {
  const coreMechanics = createCoreCategories();
  const allDamageOptions = getCategoryOptions(coreMechanics, "damage");

  it("1. extractDieSides extrae correctamente el número de caras sin importar el formato", () => {
    expect(extractDieSides("D10")).toBe(10);
    expect(extractDieSides("d10")).toBe(10);
    expect(extractDieSides("D12")).toBe(12);
    expect(extractDieSides("1D10")).toBe(10);
    expect(extractDieSides("2D10")).toBe(10);
    expect(extractDieSides("3D10")).toBe(10);
    expect(extractDieSides("1d6")).toBe(6);
    expect(extractDieSides("4D8")).toBe(8);
    expect(extractDieSides("D4")).toBe(4);
    expect(extractDieSides("D20")).toBe(20);

    // Daño fijo plano (sin caras de dado) debe ser null
    expect(extractDieSides("2")).toBeNull();
    expect(extractDieSides("4")).toBeNull();
    expect(extractDieSides("8")).toBeNull();
    expect(extractDieSides("")).toBeNull();
    expect(extractDieSides(undefined)).toBeNull();
    expect(extractDieSides(null)).toBeNull();
  });

  it("2. Muestra exclusivamente opciones reales compatibles del catálogo según el modelo canónico (D10)", () => {
    const d10Options = filterDamageOptionsByBaseDice(allDamageOptions, "D10");

    expect(d10Options.length).toBeGreaterThan(0);
    // En las reglas core, existen 1D10, 2D10, 3D10
    const diceList = d10Options.map((o) => o.effect?.dice || o.formula);
    expect(diceList).toContain("1D10");
    expect(diceList).toContain("2D10");
    expect(diceList).toContain("3D10");

    // Todas las opciones devueltas deben tener caras === 10
    d10Options.forEach((opt) => {
      const sides = extractDieSides(opt.effect?.dice || opt.formula);
      expect(sides).toBe(10);
    });
  });

  it("3. Muestra exclusivamente opciones reales compatibles del catálogo para D12", () => {
    const d12Options = filterDamageOptionsByBaseDice(allDamageOptions, "D12");

    expect(d12Options.length).toBeGreaterThan(0);
    const diceList = d12Options.map((o) => o.effect?.dice || o.formula);
    expect(diceList).toContain("1D12");
    expect(diceList).toContain("2D12");

    // No debe contener dados de 10 caras ni de 6 caras
    expect(diceList).not.toContain("1D10");
    expect(diceList).not.toContain("1D6");
    expect(diceList).not.toContain("2D6");
  });

  it("4. La compatibilidad NO depende del texto de name ni de runtimeKey (depende de effect.dice)", () => {
    // Opción con nombre engañoso pero dado real D10
    const optionWithDeceptiveName: CategoryOptionView = {
      id: "custom.damage.heavy_impact",
      runtimeKey: "impacto_demoledor",
      name: "Impacto Demoledor (Espada)", // No contiene "D10" en el nombre
      cost: 4,
      isAvailable: true,
      effect: { type: "damage", dice: "2D10" },
    };

    // Opción con "D10" en el nombre pero dado real D6
    const optionWithFakeName: CategoryOptionView = {
      id: "custom.damage.fake_d10",
      runtimeKey: "fake_d10",
      name: "Tirada D10 Especial", // Contiene "D10" en el nombre pero es 3D6
      cost: 3,
      isAvailable: true,
      effect: { type: "damage", dice: "3D6" },
    };

    const mixedOptions: CategoryOptionView[] = [
      optionWithDeceptiveName,
      optionWithFakeName,
    ];

    const result = filterDamageOptionsByBaseDice(mixedOptions, "D10");

    // Debe incluir la opción con effect.dice === '2D10' a pesar de que su nombre es "Impacto Demoledor"
    expect(result).toContain(optionWithDeceptiveName);
    // Debe excluir la opción cuyo effect.dice es '3D6' a pesar de tener "D10" en el nombre
    expect(result).not.toContain(optionWithFakeName);
  });

  it("5. Las opciones incompatibles (como daño fijo) quedan excluidas", () => {
    const d4Options = filterDamageOptionsByBaseDice(allDamageOptions, "D4");
    const formulas = d4Options.map((o) => o.effect?.dice || o.formula);

    // Debe contener dados D4 (1D4, 2D4, etc.)
    expect(formulas).toContain("1D4");
    // No debe contener valores de daño fijo (2, 4, 6, 8)
    expect(formulas).not.toContain("2");
    expect(formulas).not.toContain("4");
    expect(formulas).not.toContain("6");
    expect(formulas).not.toContain("8");
  });

  it("6. Si no existen opciones compatibles, devuelve arreglo vacío y NO genera opciones sintéticas", () => {
    // Tipo de dado no configurado en el catálogo core, por ejemplo D20 o D100
    const d20Options = filterDamageOptionsByBaseDice(allDamageOptions, "D20");

    expect(d20Options).toEqual([]);
    expect(d20Options.length).toBe(0);

    // Lista vacía de opciones
    const emptyResult = filterDamageOptionsByBaseDice([], "D10");
    expect(emptyResult).toEqual([]);
    expect(emptyResult.length).toBe(0);

    // Comprobar explícitamente que no inventa [1D10, 2D10, 3D10]
    expect(emptyResult.some((o) => o.name === "1D10" || o.name === "2D10")).toBe(false);
  });

  it("7. Las opciones globales y catálogo general no sufren regresiones", () => {
    // allDamageOptions sigue conteniendo todas las opciones de daño del sistema
    expect(allDamageOptions.length).toBeGreaterThanOrEqual(15);
    const hasD6 = allDamageOptions.some((o) => o.effect?.dice === "1D6");
    const hasD8 = allDamageOptions.some((o) => o.effect?.dice === "1D8");
    const hasD10 = allDamageOptions.some((o) => o.effect?.dice === "1D10");
    const hasD12 = allDamageOptions.some((o) => o.effect?.dice === "1D12");

    expect(hasD6).toBe(true);
    expect(hasD8).toBe(true);
    expect(hasD10).toBe(true);
    expect(hasD12).toBe(true);
  });

  it("8. WeaponMechanicalEffectsEditor renderiza el estado vacío comprensible cuando no hay opciones compatibles (ej. D20)", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { WeaponMechanicalEffectsEditor } = await import("../../components/mechanics/WeaponMechanicalEffectsEditor.tsx");

    const html = renderToStaticMarkup(
      React.createElement(WeaponMechanicalEffectsEditor, {
        behaviors: [],
        onChange: () => {},
        baseDice: "D20",
        mechanics: coreMechanics,
      })
    );

    // Debe mostrar el estado vacío
    expect(html).toContain("No hay opciones de daño compatibles");
    expect(html).toContain("No existen reglas configuradas para el dado D20");
    // NO debe haber fabricado 1D20, 2D20 o 3D20
    expect(html).not.toContain("1D20");
    expect(html).not.toContain("2D20");
  });

  it("9. WeaponMechanicalEffectsEditor renderiza las opciones válidas del catálogo cuando existen (ej. D10)", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { WeaponMechanicalEffectsEditor } = await import("../../components/mechanics/WeaponMechanicalEffectsEditor.tsx");

    const html = renderToStaticMarkup(
      React.createElement(WeaponMechanicalEffectsEditor, {
        behaviors: [],
        onChange: () => {},
        baseDice: "D10",
        mechanics: coreMechanics,
      })
    );

    // NO debe mostrar el estado vacío
    expect(html).not.toContain("No hay opciones de daño compatibles");
    // Debe mostrar la etiqueta del dado D10
    expect(html).toContain("Dado de Daño (D10)");
  });
});
