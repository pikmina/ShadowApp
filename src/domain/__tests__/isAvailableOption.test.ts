import { describe, it, expect } from "vitest";
import { getCategoryOptions, getVisibleOptions, createCoreCategories } from "../coreRuleCatalog";
import type { SystemMechanicsConfig } from "../systemMechanics";

describe("Administrative availability (isAvailable) in mechanical options", () => {
  it("normalizes isAvailable in getCategoryOptions for true, false, and undefined", () => {
    const customConfig: SystemMechanicsConfig = [
      {
        id: "core.duration",
        name: "Duración",
        description: "Duración",
        logicalType: "limitation",
        scope: { techniques: true, objects: true, actions: true },
        rules: [
          {
            id: "core.duration.instant",
            name: "Instantáneo",
            cost: 0,
            runtimeKey: "instant",
            ruleType: "component",
            component: { kind: "duration", duration: { mode: "instant" } },
          },
          {
            id: "core.duration.turns",
            name: "Durante X turnos",
            cost: 1,
            runtimeKey: "turns",
            isAvailable: true,
            ruleType: "component",
            component: { kind: "duration", duration: { mode: "turns", turns: 1 } },
          },
          {
            id: "core.duration.until_turn_end",
            name: "Hasta el final del turno",
            cost: 0,
            runtimeKey: "until_turn_end",
            isAvailable: false,
            ruleType: "component",
            component: { kind: "duration", duration: { mode: "until_turn_end" } },
          },
        ],
      },
    ];

    const options = getCategoryOptions(customConfig, "duration");
    expect(options).toHaveLength(3);

    const instant = options.find((o) => o.runtimeKey === "instant");
    const turns = options.find((o) => o.runtimeKey === "turns");
    const endTurn = options.find((o) => o.runtimeKey === "until_turn_end");

    expect(instant?.isAvailable).toBe(true);
    expect(turns?.isAvailable).toBe(true);
    expect(endTurn?.isAvailable).toBe(false);
  });

  it("filters out unavailable options for new selections in getVisibleOptions", () => {
    const options = [
      { id: "1", runtimeKey: "instant", name: "Instantáneo", isAvailable: true },
      { id: "2", runtimeKey: "until_turn_end", name: "Hasta el final del turno", isAvailable: false },
    ];

    const visible = getVisibleOptions(options, undefined);
    expect(visible).toHaveLength(1);
    expect(visible[0].runtimeKey).toBe("instant");
  });

  it("preserves historical unavailable options if currently selected in getVisibleOptions", () => {
    const options = [
      { id: "1", runtimeKey: "instant", name: "Instantáneo", isAvailable: true },
      { id: "2", runtimeKey: "until_turn_end", name: "Hasta el final del turno", isAvailable: false },
    ];

    const visible = getVisibleOptions(options, "until_turn_end");
    expect(visible).toHaveLength(2);
    expect(visible.map((o) => o.runtimeKey)).toEqual(["instant", "until_turn_end"]);
  });

  it("defaults core fallback categories to isAvailable: true", () => {
    const coreCats = createCoreCategories();
    const options = getCategoryOptions(coreCats, "activation");
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => o.isAvailable === true)).toBe(true);
  });
});
