import { describe, it, expect } from "vitest";
import {
  validateAmmunitionSemantics,
  assertAmmunitionSemantics,
  buildAmmunitionMechanicalDescription,
  resolveAmmunitionStock,
  consumeBullets,
  applyAmmunitionDamageBonus,
  type AmmunitionMetadata,
} from "../ammunition.ts";

describe("Ammunition Domain & Lifecycle", () => {
  describe("Ammunition Semantics Validation", () => {
    it("permits incomplete draft ammunition without throwing", () => {
      const draftPayload = {
        name: "Munición experimental",
        status: "draft",
        metadata: {},
      };
      const result = validateAmmunitionSemantics(draftPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(() => assertAmmunitionSemantics(draftPayload)).not.toThrow();
    });

    it("requires a name for both draft and published ammunition", () => {
      const invalidDraft = {
        name: "   ",
        status: "draft",
        metadata: {},
      };
      const result = validateAmmunitionSemantics(invalidDraft);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("El nombre de la munición es obligatorio.");
      expect(() => assertAmmunitionSemantics(invalidDraft)).toThrow();
    });

    it("requires caliber, weapon type, and positive boxQuantity for published ammunition", () => {
      const incompletePublished = {
        name: "Bala Estándar 9mm",
        status: "published",
        metadata: {},
      };
      const result = validateAmmunitionSemantics(incompletePublished);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("La munición publicada requiere especificar un calibre.");
      expect(result.errors).toContain("La munición publicada requiere seleccionar un tipo de arma compatible.");
      expect(result.errors).toContain("La munición publicada requiere especificar la cantidad de balas por caja.");
    });

    it("validates that boxQuantity must be an integer strictly greater than zero", () => {
      const zeroQty = {
        name: "Balas 9mm",
        status: "published",
        metadata: {
          caliberName: "9mm",
          weaponTypeId: "firearm",
          boxQuantity: 0,
        },
      };
      const resultZero = validateAmmunitionSemantics(zeroQty);
      expect(resultZero.valid).toBe(false);
      expect(resultZero.errors).toContain("Las balas por caja deben ser un número entero estrictamente positivo.");

      const negativeQty = {
        ...zeroQty,
        metadata: { ...zeroQty.metadata, boxQuantity: -10 },
      };
      expect(validateAmmunitionSemantics(negativeQty).valid).toBe(false);

      const floatQty = {
        ...zeroQty,
        metadata: { ...zeroQty.metadata, boxQuantity: 12.5 },
      };
      expect(validateAmmunitionSemantics(floatQty).valid).toBe(false);
    });

    it("validates damageBonus bounds (0 <= bonus <= 20)", () => {
      const negativeBonus = {
        name: "Balas Huecas",
        status: "draft",
        metadata: { damageBonus: -2 },
      };
      expect(validateAmmunitionSemantics(negativeBonus).valid).toBe(false);

      const excessiveBonus = {
        name: "Balas Explosivas",
        status: "draft",
        metadata: { damageBonus: 25 },
      };
      const result = validateAmmunitionSemantics(excessiveBonus);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("El bono de daño de la munición excede el límite máximo permitido (+20).");

      const validBonus = {
        name: "Balas Perforantes",
        status: "published",
        metadata: {
          caliberName: "5.56mm",
          weaponTypeId: "firearm",
          boxQuantity: 30,
          damageBonus: 4,
        },
      };
      expect(validateAmmunitionSemantics(validBonus).valid).toBe(true);
    });

    it("validates compatible weaponTypeId against canonical options", () => {
      const invalidWeaponType = {
        name: "Flechas",
        status: "published",
        metadata: {
          caliberName: "Estándar",
          weaponTypeId: "laser_cannon_unknown",
          boxQuantity: 20,
        },
      };
      const result = validateAmmunitionSemantics(invalidWeaponType);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/no corresponde a una regla válida de tipo de arma/);
    });
  });

  describe("Mechanical Description Generation", () => {
    it("generates structured mechanical description", () => {
      const metadata: AmmunitionMetadata = {
        caliberName: "9mm Parabellum",
        weaponTypeId: "firearm",
        boxQuantity: 30,
        damageBonus: 2,
      };
      const desc = buildAmmunitionMechanicalDescription(metadata, "Arma de fuego");
      expect(desc).toBe("Calibre 9mm Parabellum. Compatible con Arma de fuego. 30 balas por caja. Bono de daño: +2.");
    });

    it("handles zero damage bonus correctly without losing +0 indication", () => {
      const metadata: AmmunitionMetadata = {
        caliberName: ".45 ACP",
        weaponTypeId: "firearm",
        boxQuantity: 50,
        damageBonus: 0,
      };
      const desc = buildAmmunitionMechanicalDescription(metadata, "Arma corta");
      expect(desc).toBe("Calibre .45 ACP. Compatible con Arma corta. 50 balas por caja. Bono de daño: +0.");
    });
  });

  describe("Stock Resolution & Inventory Representation", () => {
    it("initializes stock to total capacity when character has never spent bullets", () => {
      const element = {
        id: "ammo-9mm",
        name: "Caja de 9mm",
        metadata: {
          caliberName: "9mm",
          weaponTypeId: "firearm",
          boxQuantity: 30,
          damageBonus: 0,
        },
      };
      const possession = {
        quantity: 1,
        selectedChoices: {},
      };

      const stock = resolveAmmunitionStock(possession, element);
      expect(stock.boxQuantity).toBe(30);
      expect(stock.totalBoxes).toBe(1);
      expect(stock.maxBullets).toBe(30);
      expect(stock.remainingBullets).toBe(30);
      expect(stock.isExhausted).toBe(false);
      expect(stock.displayStock).toBe("30/30 balas");
    });

    it("respects multiple boxes owned by the character", () => {
      const element = {
        id: "ammo-9mm",
        name: "Caja de 9mm",
        metadata: {
          caliberName: "9mm",
          weaponTypeId: "firearm",
          boxQuantity: 30,
        },
      };
      const possession = {
        quantity: 3,
        selectedChoices: {},
      };

      const stock = resolveAmmunitionStock(possession, element);
      expect(stock.boxQuantity).toBe(30);
      expect(stock.totalBoxes).toBe(3);
      expect(stock.maxBullets).toBe(90);
      expect(stock.remainingBullets).toBe(90);
    });

    it("reads persisted remainingBullets from selectedChoices and bounds to maxBullets", () => {
      const element = {
        id: "ammo-9mm",
        name: "Caja de 9mm",
        metadata: {
          caliberName: "9mm",
          weaponTypeId: "firearm",
          boxQuantity: 30,
        },
      };
      const possession = {
        quantity: 1,
        selectedChoices: {
          remainingBullets: 25,
        },
      };

      const stock = resolveAmmunitionStock(possession, element);
      expect(stock.remainingBullets).toBe(25);
      expect(stock.displayStock).toBe("25/30 balas");
      expect(stock.isExhausted).toBe(false);
    });

    it("identifies exhausted stock when remainingBullets reaches 0", () => {
      const element = {
        id: "ammo-9mm",
        name: "Caja de 9mm",
        metadata: {
          caliberName: "9mm",
          weaponTypeId: "firearm",
          boxQuantity: 30,
        },
      };
      const possession = {
        quantity: 1,
        selectedChoices: {
          remainingBullets: 0,
        },
      };

      const stock = resolveAmmunitionStock(possession, element);
      expect(stock.remainingBullets).toBe(0);
      expect(stock.isExhausted).toBe(true);
      expect(stock.displayStock).toBe("0/30 balas");
    });
  });

  describe("Consumption Logic (Independent from Magazine Capacity)", () => {
    it("consumes exactly 1 bullet per shot, taking a 30-round box to 25 after 5 shots", () => {
      const element = {
        id: "ammo-9mm",
        name: "Caja de 9mm",
        metadata: {
          caliberName: "9mm",
          weaponTypeId: "firearm",
          boxQuantity: 30,
        },
      };
      let stock = resolveAmmunitionStock({ quantity: 1, selectedChoices: {} }, element);
      expect(stock.remainingBullets).toBe(30);

      // 5 consecutive single-shot consumptions
      for (let i = 0; i < 5; i++) {
        const result = consumeBullets(stock, 1);
        stock = {
          ...stock,
          remainingBullets: result.remainingBullets,
          isExhausted: result.isExhausted,
        };
      }

      expect(stock.remainingBullets).toBe(25);
      expect(stock.isExhausted).toBe(false);
    });

    it("prevents consumption beyond available stock and avoids negative numbers", () => {
      const stock = {
        elementId: "ammo-1",
        name: "Caja de balas",
        caliberName: "9mm",
        weaponTypeId: "firearm",
        boxQuantity: 30,
        totalBoxes: 1,
        remainingBullets: 2,
        maxBullets: 30,
        damageBonus: 0,
        isExhausted: false,
        displayStock: "2/30 balas",
      };

      // Consuming 2 reaches 0
      const res = consumeBullets(stock, 2);
      expect(res.remainingBullets).toBe(0);
      expect(res.isExhausted).toBe(true);

      // Consuming 3 throws error because only 2 are available
      expect(() => consumeBullets(stock, 3)).toThrow(/Munición insuficiente/);
    });

    it("rejects non-positive integer consumption amounts", () => {
      const stock = {
        elementId: "ammo-1",
        name: "Caja de balas",
        caliberName: "9mm",
        weaponTypeId: "firearm",
        boxQuantity: 30,
        totalBoxes: 1,
        remainingBullets: 10,
        maxBullets: 30,
        damageBonus: 0,
        isExhausted: false,
        displayStock: "10/30 balas",
      };

      expect(() => consumeBullets(stock, 0)).toThrow(/Cantidad a consumir inválida/);
      expect(() => consumeBullets(stock, -1)).toThrow(/Cantidad a consumir inválida/);
      expect(() => consumeBullets(stock, 1.5)).toThrow(/Cantidad a consumir inválida/);
    });
  });

  describe("Damage Bonus Integration", () => {
    it("applies ammunition damage bonus to weapon damage exactly once", () => {
      const baseDamage = 14;
      const bonus = 3;
      const finalDamage = applyAmmunitionDamageBonus(baseDamage, bonus);
      expect(finalDamage).toBe(17);
    });

    it("does not modify damage when bonus is 0", () => {
      const baseDamage = 18;
      const finalDamage = applyAmmunitionDamageBonus(baseDamage, 0);
      expect(finalDamage).toBe(18);
    });
  });
});
