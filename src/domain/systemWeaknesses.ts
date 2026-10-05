/**
 * Definiciones canónicas de las 23 Debilidades del Sistema y Estados Alterados Core.
 * Representadas exclusivamente mediante MechanicalBehavior.
 * 
 * Principio fundamental:
 * Cero lógica hardcodeada en el runtime (prohibido if (name === ...)).
 * Cada debilidad opera a través de primitivas puras: mode, trigger, conditions, resolution, effects, control.
 */

import { MechanicalBehavior, MechanicalBehaviorInput, mechanicalBehaviorSchema } from "./mechanicalBehavior.ts";

export interface CanonicalWeaknessDefinition {
  id: string;
  name: string;
  description: string;
  kind: "weakness";
  mechanicalBehaviors: MechanicalBehavior[];
}

export interface CanonicalStatusDefinition {
  id: string;
  name: string;
  description: string;
  kind: "altered_status";
  metadata?: Record<string, any>;
  mechanicalBehaviors: MechanicalBehavior[];
}

const RAW_CORE_ALTERED_STATUSES: Array<{
  id: string;
  name: string;
  description: string;
  kind: "altered_status";
  metadata?: Record<string, any>;
  mechanicalBehaviors: MechanicalBehaviorInput[];
}> = [
  // 1. Asfixia
  {
    id: "core.status.asfixia",
    name: "Asfixia",
    description: "No puede atacar; 1d6 daño por turno",
    kind: "altered_status",
    metadata: {
      damageTypeId: "motor",
      effectType: "hybrid",
      hasTiers: false,
      defaultDurationTurns: 1,
      combatEffect: "No puede atacar; 1d6 daño por turno",
      resistanceDifficulty: "Muy Difícil (24)",
      resistanceDC: 24,
      cureMethods: "Aire, mascarilla, quirk respiratorio",
      cureEffect: "Elimina daño y restaura respiración.",
      dotDamageFormula: "1d6",
      controlDescription: "No puede atacar.",
    },
    mechanicalBehaviors: [
      {
        id: "status_asfixia_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_asfixia_block",
            type: "action_block",
            blockedAction: "attack",
            duration: 1,
          },
          {
            id: "eff_asfixia_dot",
            type: "damage",
            dice: "1d6",
            damageType: "motor",
          },
        ],
      },
    ],
  },

  // 2. Aturdido
  {
    id: "core.status.stunned",
    name: "Aturdido",
    description: "Pierde la acción; -1 a Evasión",
    kind: "altered_status",
    metadata: {
      damageTypeId: "sensorial",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 1,
      combatEffect: "Pierde la acción; -1 a Evasión",
      resistanceDifficulty: "Fácil (12)",
      resistanceDC: 12,
      cureMethods: "Medicina, estimulantes, quirk de enfoque",
      cureEffect: "Recupera acción y evita desventaja.",
      controlDescription: "Pierde la acción; -1 a Evasión.",
    },
    mechanicalBehaviors: [
      {
        id: "status_stunned_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_stunned_block",
            type: "action_block",
            blockedAction: "action",
            duration: 1,
          },
          {
            id: "eff_stunned_eva",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -1,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 3. Berserker (Familia con niveles Leve y Grave)
  {
    id: "core.status.berserker",
    name: "Berserker",
    description: "Estado de frenesí combativo incontrolable.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "psiquico",
      effectType: "hybrid",
      hasTiers: true,
      defaultDurationTurns: 2,
      tiers: {
        leve: {
          name: "Berserker Leve",
          durationTurns: 2,
          resistanceDifficulty: "Normal (16) Voluntad",
          resistanceDC: 16,
          cureMethods: "Quirk calmante, tecnología inhibidora",
          cureEffect: "Recupera control emocional.",
          combatEffect: "Da +2 daño, pero no puede retirarse",
          controlDescription: "Da +2 daño, pero no puede retirarse.",
        },
        grave: {
          name: "Berserker Grave",
          durationTurns: 3,
          resistanceDifficulty: "Extremo (28) Voluntad",
          resistanceDC: 28,
          cureMethods: "Quirk calmante avanzado, tranquilizante",
          cureEffect: "Baja a leve o se elimina.",
          combatEffect: "Da +4 daño, +2 a tirada de acción, sin control sobre objetivos",
          controlDescription: "Da +4 daño, +2 a tirada de acción, sin control sobre objetivos.",
        },
      },
    },
    mechanicalBehaviors: [
      {
        id: "status_berserker_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_berserker_dmg",
            type: "outgoing_damage_modifier",
            amount: 2,
            operation: "add",
          },
          {
            id: "eff_berserker_ctrl",
            type: "manual",
            message: "Frenesí combativo: debe atacar al objetivo más cercano.",
          },
        ],
      },
    ],
  },

  // 4. Coma Ilusorio
  {
    id: "core.status.coma_ilusorio",
    name: "Coma Ilusorio",
    description: "Deja al oponente en estado de coma, teniendo ilusiones y fantasías.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "psiquico",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 3,
      combatEffect: "Deja al oponente en estado de coma, teniendo ilusiones y fantasías.",
      resistanceDifficulty: "Complicado (16)",
      resistanceDC: 16,
      cureMethods: "Si recibe un impacto directo, despierta.",
      cureEffect: "Efecto Aturdido al Despertar",
      controlDescription: "Deja al oponente en estado de coma. Si recibe impacto directo, despierta con efecto Aturdido.",
    },
    mechanicalBehaviors: [
      {
        id: "status_coma_ilusorio_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_coma_ilusorio_block",
            type: "action_block",
            blockedAction: "all",
            duration: 3,
          },
        ],
      },
    ],
  },

  // 6. Concentrado (beneficio)
  {
    id: "core.status.concentrado",
    name: "Concentrado (beneficio)",
    description: "Da +2 a todas las tiradas de acción",
    kind: "altered_status",
    metadata: {
      damageTypeId: "psiquico",
      effectType: "buff",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "Da +2 a todas las tiradas de acción",
      resistanceDifficulty: "—",
      resistanceDC: 0,
      cureMethods: "Pierde efecto si recibe daño o si se desconcentra",
      cureEffect: "Se elimina al romper la concentración.",
      controlDescription: "Da +2 a todas las tiradas de acción.",
    },
    mechanicalBehaviors: [
      {
        id: "status_concentrado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_concentrado_roll",
            type: "roll_modifier",
            rollType: "action",
            amount: 2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 7. Congelado
  {
    id: "core.status.congelado",
    name: "Congelado",
    description: "No puede moverse; Evasión -4",
    kind: "altered_status",
    metadata: {
      damageTypeId: "hielo",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "No puede moverse; Evasión -4",
      resistanceDifficulty: "Complicado (16)",
      resistanceDC: 16,
      cureMethods: "Calor, Quirk de fuego, aliados rompen hielo",
      cureEffect: "Recupera movilidad normal.",
      controlDescription: "No puede moverse; Evasión -4.",
    },
    mechanicalBehaviors: [
      {
        id: "status_congelado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_congelado_block",
            type: "action_block",
            blockedAction: "movement",
            duration: 2,
          },
          {
            id: "eff_congelado_eva",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -4,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 8. Conmoción
  {
    id: "core.status.conmocion",
    name: "Conmoción",
    description: "-4 a la iniciativa y ataque",
    kind: "altered_status",
    metadata: {
      damageTypeId: "sensorial",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "-4 a la iniciativa y ataque",
      resistanceDifficulty: "Difícil (20)",
      resistanceDC: 20,
      cureMethods: "Medicina avanzada, descanso, quirk curativo",
      cureEffect: "Recupera stats; elimina el estado.",
      controlDescription: "-4 a la iniciativa y ataque.",
    },
    mechanicalBehaviors: [
      {
        id: "status_conmocion_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_conmocion_ini",
            type: "derived_stat_modifier",
            statId: "ini",
            amount: -4,
            operation: "add",
          },
          {
            id: "eff_conmocion_att",
            type: "roll_modifier",
            rollType: "attack",
            amount: -4,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 9. Desbalanceado
  {
    id: "core.status.desbalanceado",
    name: "Desbalanceado",
    description: "-3 a ataques cuerpo a cuerpo",
    kind: "altered_status",
    metadata: {
      damageTypeId: "motor",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 1,
      combatEffect: "-3 a ataques cuerpo a cuerpo",
      resistanceDifficulty: "Fácil (12)",
      resistanceDC: 12,
      cureMethods: "Agilidad, ayuda física, estabilizadores",
      cureEffect: "Vuelve a posición normal.",
      controlDescription: "-3 a ataques cuerpo a cuerpo.",
    },
    mechanicalBehaviors: [
      {
        id: "status_desbalanceado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_desbalanceado_att",
            type: "roll_modifier",
            rollType: "attack",
            amount: -3,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 10. Desorientado
  {
    id: "core.status.desorientado",
    name: "Desorientado",
    description: "-3 a tiradas; falla movimientos finos",
    kind: "altered_status",
    metadata: {
      damageTypeId: "psiquico",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "-3 a tiradas; falla movimientos finos",
      resistanceDifficulty: "Normal (16)",
      resistanceDC: 16,
      cureMethods: "Quirk mental, apoyo de aliado",
      cureEffect: "Recupera claridad; elimina penalizadores.",
      controlDescription: "-3 a tiradas; falla movimientos finos.",
    },
    mechanicalBehaviors: [
      {
        id: "status_desorientado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_desorientado_roll",
            type: "roll_modifier",
            rollType: "action",
            amount: -3,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 11. Dormido
  {
    id: "core.status.dormido",
    name: "Dormido",
    description: "Deja al oponente dormido.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "motor",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 3,
      combatEffect: "Deja al oponente dormido.",
      resistanceDifficulty: "Complicado (16)",
      resistanceDC: 16,
      cureMethods: "Si recibe un impacto directo, despierta.",
      cureEffect: "Despierta al recibir impacto.",
      controlDescription: "Deja al oponente dormido. Si recibe impacto directo, despierta.",
    },
    mechanicalBehaviors: [
      {
        id: "status_dormido_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_dormido_block",
            type: "action_block",
            blockedAction: "all",
            duration: 3,
          },
        ],
      },
    ],
  },

  // 12. Electrocutado
  {
    id: "core.status.electrocutado",
    name: "Electrocutado",
    description: "No puede actuar en ese turno; recibe 1d10 daño instantáneo",
    kind: "altered_status",
    metadata: {
      damageTypeId: "electrico",
      effectType: "hybrid",
      hasTiers: false,
      defaultDurationTurns: 1,
      combatEffect: "No puede actuar en ese turno; recibe 1d10 daño instantáneo",
      resistanceDifficulty: "Normal (16)",
      resistanceDC: 16,
      cureMethods: "Aislamiento, medicina, quirks eléctricos",
      cureEffect: "Elimina incapacidad y evita futuros daños.",
      dotDamageFormula: "1d10",
      controlDescription: "No puede actuar en ese turno.",
    },
    mechanicalBehaviors: [
      {
        id: "status_electrocutado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_electro_block",
            type: "action_block",
            blockedAction: "action",
            duration: 1,
          },
          {
            id: "eff_electro_dot",
            type: "damage",
            dice: "1d10",
            damageType: "electrico",
          },
        ],
      },
    ],
  },

  // 12. Hemorragia (Familia con niveles Leve y Grave)
  {
    id: "core.status.hemorragia",
    name: "Hemorragia",
    description: "Sangrado profuso que reduce la salud cada turno si no se contiene.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "cortante",
      effectType: "dot",
      hasTiers: true,
      defaultDurationTurns: 3,
      tiers: {
        leve: {
          name: "Hemorragia Leve",
          damageFormula: "1d8",
          durationTurns: 3,
          resistanceDifficulty: "Normal (16)",
          resistanceDC: 16,
          cureMethods: "Medicina, vendaje, sellado",
          cureEffect: "Detiene el sangrado inmediatamente.",
          combatEffect: "1d8 daño por turno",
        },
        grave: {
          name: "Hemorragia Grave",
          damageFormula: "2d8",
          durationTurns: 4,
          resistanceDifficulty: "Muy Difícil (24)",
          resistanceDC: 24,
          cureMethods: "Medicina avanzada, quirks regenerativos",
          cureEffect: "Baja a leve; si ya es leve, se elimina.",
          combatEffect: "2d8 daño por turno",
        },
      },
    },
    mechanicalBehaviors: [
      {
        id: "status_hemorragia_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_hemorragia_dot",
            type: "damage",
            dice: "1d8",
            damageType: "cortante",
          },
        ],
      },
    ],
  },

  // 15. Inmovilizado
  {
    id: "core.status.inmovilizado",
    name: "Inmovilizado",
    description: "El personaje no puede moverse.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "motor",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "El personaje no puede moverse.",
      resistanceDifficulty: "Fácil (12)",
      resistanceDC: 12,
      cureMethods: "Resistencia",
      cureEffect: "Puede moverse",
      controlDescription: "El personaje no puede moverse.",
    },
    mechanicalBehaviors: [
      {
        id: "status_inmovilizado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_inmovilizado_block",
            type: "action_block",
            blockedAction: "movement",
            duration: 2,
          },
        ],
      },
    ],
  },

  // 16. Locura
  {
    id: "core.status.locura",
    name: "Locura",
    description: "Ataca al aliado enemigo más cercano; acciones caóticas",
    kind: "altered_status",
    metadata: {
      damageTypeId: "psiquico",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "Ataca al aliado enemigo más cercano; acciones caóticas",
      resistanceDifficulty: "Muy Difícil (24)",
      resistanceDC: 24,
      cureMethods: "Quirk mental, medicina mental",
      cureEffect: "Recupera lucidez.",
      controlDescription: "Ataca al aliado enemigo más cercano; acciones caóticas.",
    },
    mechanicalBehaviors: [
      {
        id: "status_locura_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_locura_ctrl",
            type: "manual",
            message: "Locura: ataca al aliado o enemigo más cercano, ejecutando acciones caóticas.",
          },
        ],
      },
    ],
  },

  // 17. Miedo / Aterrorizado
  {
    id: "core.status.miedo",
    name: "Miedo / Aterrorizado",
    description: "No puede atacar; solo huir/defenderse",
    kind: "altered_status",
    metadata: {
      damageTypeId: "psiquico",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "No puede atacar; solo huir/defenderse",
      resistanceDifficulty: "Normal (16) Voluntad",
      resistanceDC: 16,
      cureMethods: "Apoyo emocional, quirk mental",
      cureEffect: "Recupera control.",
      controlDescription: "No puede atacar; solo huir/defenderse.",
    },
    mechanicalBehaviors: [
      {
        id: "status_miedo_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_miedo_block",
            type: "action_block",
            blockedAction: "attack",
            duration: 2,
          },
        ],
      },
    ],
  },

  // 18. Mutación Visual
  {
    id: "core.status.mutacion_visual",
    name: "Mutación Visual",
    description: "Cambia cómo se ve el usuario. Recibe +2 puntos a Defensa.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "sensorial",
      effectType: "buff",
      hasTiers: false,
      defaultDurationTurns: 4,
      combatEffect: "Cambia cómo se ve el usuario. Recibe +2 puntos a Defensa.",
      resistanceDifficulty: "Complicado (16)",
      resistanceDC: 16,
      cureMethods: "Si recibe impacto directo vuelve a su forma original.",
      cureEffect: "Vuelve a su forma original al recibir impacto directo.",
      controlDescription: "Cambia cómo se ve el usuario. Recibe +2 puntos a Defensa.",
    },
    mechanicalBehaviors: [
      {
        id: "status_mutacion_visual_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_mutacion_def",
            type: "derived_stat_modifier",
            statId: "def",
            amount: 2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 19. Nulificación de Don
  {
    id: "core.status.nulificacion_don",
    name: "Nulificación de Don",
    description: "El usuario no puede usar su don.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "anomalia_don",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 1,
      combatEffect: "El usuario no puede usar su don.",
      resistanceDifficulty: "Complicado (16)",
      resistanceDC: 16,
      cureMethods: "Si se realiza una tirada de Coraje que supere la tirada que la creo.",
      cureEffect: "Recupera el control sobre el quirk.",
      controlDescription: "El usuario no puede usar su don.",
    },
    mechanicalBehaviors: [
      {
        id: "status_nulificacion_don_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_nulificacion_block",
            type: "action_block",
            blockedAction: "quirk",
            duration: 1,
          },
        ],
      },
    ],
  },

  // 17. Quemadura (Familia con niveles Leve y Grave)
  {
    id: "core.status.quemadura",
    name: "Quemadura",
    description: "Herida por fuego o calor extremo que causa daño continuado.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "fuego",
      effectType: "dot",
      hasTiers: true,
      defaultDurationTurns: 3,
      tiers: {
        leve: {
          name: "Quemadura Leve",
          damageFormula: "1d6",
          durationTurns: 3,
          resistanceDifficulty: "Fácil (12)",
          resistanceDC: 12,
          cureMethods: "Resistencia, Medicina, Enfriamiento, Quirk de hielo/curación",
          cureEffect: "Elimina el daño continuo. Estado desaparece.",
          combatEffect: "1d6 daño por turno",
        },
        grave: {
          name: "Quemadura Grave",
          damageFormula: "2d6",
          durationTurns: 4,
          resistanceDifficulty: "Difícil (20)",
          resistanceDC: 20,
          cureMethods: "Medicina, Quirk de curación, tecnología refrigerante",
          cureEffect: "Baja a Leve o se elimina completamente si el método es potente.",
          combatEffect: "2d6 daño por turno",
        },
      },
    },
    mechanicalBehaviors: [
      {
        id: "status_quemadura_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_quemadura_dot",
            type: "damage",
            dice: "1d6",
            damageType: "fuego",
          },
        ],
      },
    ],
  },

  // 18. Ralentizado
  {
    id: "core.status.ralentizado",
    name: "Ralentizado",
    description: "Solo movimiento reducido; -2 a evasión",
    kind: "altered_status",
    metadata: {
      damageTypeId: "motor",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "Solo movimiento reducido; -2 a evasión",
      resistanceDifficulty: "Normal (16)",
      resistanceDC: 16,
      cureMethods: "Resistencia, quirk potenciador, exoesqueleto",
      cureEffect: "Recupera su velocidad normal.",
      controlDescription: "Solo movimiento reducido; -2 a evasión.",
    },
    mechanicalBehaviors: [
      {
        id: "status_ralentizado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_ralentizado_eva",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 19. Sobrecalentado
  {
    id: "core.status.sobrecalentado",
    name: "Sobrecalentado",
    description: "No puede usar su Quirk; -2 a tiradas de acción",
    kind: "altered_status",
    metadata: {
      damageTypeId: "fuego",
      effectType: "control",
      hasTiers: false,
      defaultDurationTurns: 2,
      combatEffect: "No puede usar su Quirk; -2 a tiradas de acción",
      resistanceDifficulty: "Complicado (16)",
      resistanceDC: 16,
      cureMethods: "Enfriarse, quirk de hielo, reposo",
      cureEffect: "Restaura uso del Quirk.",
      controlDescription: "No puede usar su Quirk; -2 a tiradas de acción.",
    },
    mechanicalBehaviors: [
      {
        id: "status_sobrecalentado_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_sobrecalentado_block",
            type: "action_block",
            blockedAction: "quirk",
            duration: 2,
          },
          {
            id: "eff_sobrecalentado_roll",
            type: "roll_modifier",
            rollType: "action",
            amount: -2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 20. Veneno (Familia con niveles Leve y Grave)
  {
    id: "core.status.veneno",
    name: "Veneno",
    description: "Toxina activa que causa daño continuado por turno si no se neutraliza.",
    kind: "altered_status",
    metadata: {
      damageTypeId: "acido",
      effectType: "dot",
      hasTiers: true,
      defaultDurationTurns: 2,
      tiers: {
        leve: {
          name: "Veneno Leve",
          damageFormula: "1d6",
          durationTurns: 2,
          resistanceDifficulty: "Fácil (12)",
          resistanceDC: 12,
          cureMethods: "Resistencia, antídoto, Quirk purificador",
          cureEffect: "Elimina el veneno, detiene daño.",
          combatEffect: "1d6 daño por turno",
        },
        grave: {
          name: "Veneno Grave",
          damageFormula: "2d6",
          durationTurns: 3,
          resistanceDifficulty: "Difícil (20)",
          resistanceDC: 20,
          cureMethods: "Antídoto avanzado, Quirk curativo",
          cureEffect: "Reduce a leve o elimina.",
          combatEffect: "2d6 daño por turno",
        },
      },
    },
    mechanicalBehaviors: [
      {
        id: "status_veneno_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_veneno_dot",
            type: "damage",
            dice: "1d6",
            damageType: "acido",
          },
        ],
      },
    ],
  },
];

export const CORE_ALTERED_STATUSES: CanonicalStatusDefinition[] = RAW_CORE_ALTERED_STATUSES.map((s) => ({
  ...s,
  mechanicalBehaviors: s.mechanicalBehaviors.map((b) => mechanicalBehaviorSchema.parse(b)),
}));

const RAW_SYSTEM_WEAKNESSES: Array<{
  id: string;
  name: string;
  description: string;
  kind: "weakness";
  mechanicalBehaviors: MechanicalBehaviorInput[];
}> = [
  // 1. Acumulación de Impacto
  {
    id: "weakness_acumulacion_impacto",
    name: "Acumulación de Impacto",
    description: "Cada vez que recibe daño acumula 1 impacto. Al alcanzar 3 impactos, el daño recibido se incrementa en +3 y pierde 1 turno.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_acumulacion_counter",
        mode: "reactive",
        trigger: {
          kind: "receive_damage",
        },
        conditions: [],
        effects: [
          {
            id: "eff_acumulacion_inc",
            type: "counter_modifier",
            counterId: "impacto",
            operation: "increment",
            value: 1,
          },
        ],
      },
      {
        id: "mb_acumulacion_threshold",
        mode: "reactive",
        trigger: {
          kind: "receive_damage",
        },
        conditions: [
          {
            type: "counter",
            counterId: "impacto",
            comparison: ">=",
            value: 3,
          },
        ],
        effects: [
          {
            id: "eff_acumulacion_dmg_penalty",
            type: "incoming_damage_modifier",
            amount: 3,
            operation: "add",
          },
          {
            id: "eff_acumulacion_turn_loss",
            type: "turn_loss",
            turns: 1,
          },
        ],
        control: {
          reset: {
            event: "trigger_resolution",
            target: "counter",
          },
        },
      },
    ],
  },

  // 2. Armadura Lenta
  {
    id: "weakness_armadura_lenta",
    name: "Armadura Lenta",
    description: "El personaje sufre -2 EVA y -1 VEL continuamente. Si un ataque perfora o supera la armadura (tag: armor_pierced), queda aturdido 1 turno.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_armadura_lenta_passive",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_armadura_lenta_eva",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -2,
            operation: "add",
          },
          {
            id: "eff_armadura_lenta_vel",
            type: "attribute_modifier",
            attributeId: "vel",
            amount: -1,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_armadura_lenta_pierced",
        mode: "reactive",
        trigger: {
          kind: "receive_damage",
        },
        conditions: [
          {
            type: "tag",
            tag: "armor_pierced",
            scope: "attack",
          },
        ],
        effects: [
          {
            id: "eff_armadura_lenta_stun",
            type: "status_apply",
            statusElementId: "core.status.stunned",
            turns: 1,
          },
        ],
      },
    ],
  },

  // 3. Canalización Exigente
  {
    id: "weakness_canalizacion_exigente",
    name: "Canalización Exigente",
    description: "Mantener canalizaciones cuesta +1 ES por turno. Si una canalización es interrumpida, el personaje queda Paralizado 1 turno.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_canalizacion_cost",
        mode: "continuous",
        conditions: [
          {
            type: "tag",
            tag: "channeling",
            scope: "action",
          },
        ],
        effects: [
          {
            id: "eff_canalizacion_extra_es",
            type: "cost_modifier",
            scopeId: "channeling",
            amount: 1,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_canalizacion_interrupted",
        mode: "reactive",
        trigger: {
          kind: "action_interrupted",
        },
        conditions: [],
        effects: [
          {
            id: "eff_canalizacion_paralyzed",
            type: "status_apply",
            statusElementId: "core.status.paralyzed",
            turns: 1,
          },
        ],
      },
    ],
  },

  // 4. Dependencia
  {
    id: "weakness_dependencia",
    name: "Dependencia",
    description: "Si el personaje entra en síndrome de abstinencia o privación (señal manual: substance_deprivation), sufre -2 a todas sus tiradas y sus Quirks cuestan +1 ES.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_dependencia_deprived",
        mode: "continuous",
        conditions: [
          {
            type: "manual",
            signalId: "substance_deprivation",
            description: "Privación o abstinencia de la sustancia/objeto requerido",
          },
        ],
        effects: [
          {
            id: "eff_dependencia_penalty",
            type: "roll_modifier",
            rollType: "all",
            amount: -2,
            operation: "add",
          },
          {
            id: "eff_dependencia_cost",
            type: "cost_modifier",
            scopeId: "quirk",
            amount: 1,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 5. Dependencia del Ritmo
  {
    id: "weakness_dependencia_del_ritmo",
    name: "Dependencia del Ritmo",
    description: "Al final de su turno, si el personaje no utilizó su Quirk durante dicho turno, pierde 1 punto de Estamina (ES -1).",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_dependencia_ritmo_turn_end",
        mode: "reactive",
        trigger: {
          kind: "turn_end",
        },
        conditions: [
          {
            type: "turn_history",
            event: "used_quirk_this_turn",
            value: false,
          },
        ],
        effects: [
          {
            id: "eff_dependencia_ritmo_es_loss",
            type: "resource_modifier",
            resourceId: "ES",
            amount: -1,
          },
        ],
      },
    ],
  },

  // 6. Derroche de Energía
  {
    id: "weakness_derroche_de_energia",
    name: "Derroche de Energía",
    description: "Cuando el gasto acumulado de ES durante el turno alcanza >= 4, debe superar una tirada de RD 12. En fallo, pierde 1 ES adicional y queda Vulnerable.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_derroche_energia",
        mode: "reactive",
        trigger: {
          kind: "spend_resource",
          resourceId: "ES",
        },
        conditions: [
          {
            type: "turn_aggregate",
            metric: "es_spent",
            comparison: ">=",
            value: 4,
          },
        ],
        limitations: [
          {
            id: "lim_derroche_turn",
            type: "usage_limit",
            period: "turn",
            max: 1,
          },
        ],
        resolution: {
          type: "rd",
          difficulty: 12,
          outcomes: [
            {
              id: "outcome_derroche_fail",
              outcome: "failure",
              description: "Fallo en control de energía: pierde 1 ES adicional y queda Vulnerable",
              effects: [
                {
                  id: "eff_derroche_fail_es",
                  type: "resource_modifier",
                  resourceId: "ES",
                  amount: -1,
                },
                {
                  id: "eff_derroche_fail_vulnerable",
                  type: "status_apply",
                  statusElementId: "core.status.vulnerable",
                },
              ],
            },
          ],
        },
        effects: [],
      },
    ],
  },

  // 7. Descarga Forzada
  {
    id: "weakness_descarga_forzada",
    name: "Descarga Forzada",
    description: "Tras utilizar el Quirk, su uso queda bloqueado durante 1 turno. El personaje puede ignorar el bloqueo voluntariamente pagando 3 ES adicionales.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_descarga_forzada",
        mode: "reactive",
        trigger: {
          kind: "use_quirk",
        },
        conditions: [],
        effects: [
          {
            id: "eff_descarga_block",
            type: "action_block",
            blockedAction: "quirk",
            duration: 1,
          },
        ],
        control: {
          exception: {
            costResource: "ES",
            costAmount: 3,
            action: "allow",
            description: "Pagar 3 ES para ignorar el bloqueo de Quirk",
          },
        },
      },
    ],
  },

  // 8. Egocéntrico
  {
    id: "weakness_egocentrico",
    name: "Egocéntrico",
    description: "Continuamente sufre -4 en Alerta y -2 en Dominio Quirk. Además, cuando falla cualquier tirada por un margen de 5 o más, pierde 1 ES.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_egocentrico_continuous",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_egocentrico_alerta",
            type: "skill_modifier",
            skillId: "alerta",
            amount: -4,
            operation: "add",
          },
          {
            id: "eff_egocentrico_dominio",
            type: "skill_modifier",
            skillId: "dominio_quirk",
            amount: -2,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_egocentrico_failure_margin",
        mode: "reactive",
        trigger: {
          kind: "roll_failure",
        },
        conditions: [
          {
            type: "roll",
            rollType: "failure_margin",
            comparison: ">=",
            target: 5,
          },
        ],
        effects: [
          {
            id: "eff_egocentrico_fail_es",
            type: "resource_modifier",
            resourceId: "ES",
            amount: -1,
          },
        ],
      },
    ],
  },

  // 9. Emocionalidad Frágil
  {
    id: "weakness_emocionalidad_fragil",
    name: "Emocionalidad Frágil",
    description: "Cuando utiliza su Quirk bajo emoción intensa (señal manual: intense_emotion), si cualquier dado obtiene 1-5, el Quirk se vuelve inestable para resolución narrativa del Director.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_emocionalidad_fragil",
        mode: "reactive",
        trigger: {
          kind: "use_quirk",
        },
        conditions: [
          {
            type: "manual",
            signalId: "intense_emotion",
            description: "Uso de Quirk bajo emoción intensa",
          },
          {
            type: "die",
            dieSelection: "any",
            comparison: "<=",
            value: 5,
          },
        ],
        resolution: {
          type: "manual",
          description: "Quirk inestable por emoción intensa: el Director de Juego resuelve consecuencias o desviaciones.",
        },
        effects: [
          {
            id: "eff_emocionalidad_unstable",
            type: "status_apply",
            statusElementId: "core.status.unstable",
          },
        ],
      },
    ],
  },

  // 10. Energía Oscura
  {
    id: "weakness_energia_oscura",
    name: "Energía Oscura",
    description: "En tiradas de Quirk: si cualquier dado obtiene 1, recibe 4 de daño inmediatamente. Si ambos dados obtienen 1 (doble 1), además entra en estado Berserker durante 2 turnos.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_energia_oscura_any_1",
        mode: "reactive",
        trigger: {
          kind: "roll",
          tag: "quirk",
        },
        conditions: [
          {
            type: "die",
            dieSelection: "any",
            comparison: "=",
            value: 1,
          },
        ],
        effects: [
          {
            id: "eff_energia_oscura_dmg",
            type: "damage",
            dice: "4",
            target: { type: "self" },
          },
        ],
      },
      {
        id: "mb_energia_oscura_both_1",
        mode: "reactive",
        trigger: {
          kind: "roll",
          tag: "quirk",
        },
        conditions: [
          {
            type: "die",
            dieSelection: "both",
            comparison: "=",
            value: 1,
          },
        ],
        effects: [
          {
            id: "eff_energia_oscura_berserker",
            type: "status_apply",
            statusElementId: "core.status.berserker",
            turns: 2,
          },
        ],
      },
    ],
  },

  // 11. Fatiga Crónica
  {
    id: "weakness_fatiga_cronica",
    name: "Fatiga Crónica",
    description: "El coste de Quirk aumenta en +1 ES de forma continua. Cuando la Estamina cae a 3 o menos (ES <= 3), queda Aturdido durante 1 turno.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_fatiga_cronica_cost",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_fatiga_extra_es",
            type: "cost_modifier",
            scopeId: "quirk",
            amount: 1,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_fatiga_cronica_threshold",
        mode: "reactive",
        trigger: {
          kind: "resource_threshold_crossed",
          resourceId: "ES",
          threshold: 3,
          direction: "cross_down",
        },
        conditions: [],
        effects: [
          {
            id: "eff_fatiga_stun",
            type: "status_apply",
            statusElementId: "core.status.stunned",
            turns: 1,
          },
        ],
      },
    ],
  },

  // 12. Mala Cara
  {
    id: "weakness_mala_cara",
    name: "Mala Cara",
    description: "Sufre +4 a la dificultad (RD) en tiradas de Carisma y Presencia de forma continua. Además, los aliados deben superar RD 12 para que sus efectos de soporte sean efectivos en él.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_mala_cara_passive",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_mala_cara_carisma",
            type: "rd_modifier",
            skillId: "carisma",
            amount: 4,
            operation: "add",
          },
          {
            id: "eff_mala_cara_presencia",
            type: "rd_modifier",
            skillId: "presencia",
            amount: 4,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_mala_cara_support_check",
        mode: "reactive",
        trigger: {
          kind: "receive_support",
        },
        conditions: [
          {
            type: "tag",
            tag: "support",
            scope: "attack",
          },
        ],
        resolution: {
          type: "rd",
          difficulty: 12,
          outcomes: [
            {
              id: "outcome_mala_cara_fail",
              outcome: "failure",
              description: "Fallo al canalizar o aceptar el soporte del aliado",
              effects: [
                {
                  id: "eff_mala_cara_reject_support",
                  type: "effect_block",
                },
              ],
            },
          ],
        },
        effects: [],
      },
    ],
  },

  // 13. Obsesión
  {
    id: "weakness_obsesion",
    name: "Obsesión",
    description: "Si la persona objeto de obsesión está presente en escena (señal manual: obsession_target_present), sus técnicas ofensivas cuestan +1 ES. Si la persona está en peligro y no intenta protegerla, sufre -2 a todas sus tiradas.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_obsesion_present_cost",
        mode: "continuous",
        conditions: [
          {
            type: "manual",
            signalId: "obsession_target_present",
            description: "Persona objeto de obsesión presente en la escena",
          },
        ],
        effects: [
          {
            id: "eff_obsesion_offensive_cost",
            type: "cost_modifier",
            scopeId: "offensive",
            amount: 1,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_obsesion_unprotected_penalty",
        mode: "continuous",
        conditions: [
          {
            type: "manual",
            signalId: "obsession_target_in_danger",
            description: "Persona objeto de obsesión en peligro",
          },
          {
            type: "manual",
            signalId: "obsession_not_protected",
            description: "El personaje no intentó proteger a su objetivo",
          },
        ],
        conditionLogic: "all",
        effects: [
          {
            id: "eff_obsesion_roll_penalty",
            type: "roll_modifier",
            rollType: "all",
            amount: -2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 14. Punto de Quiebre
  {
    id: "weakness_punto_de_quiebre",
    name: "Punto de Quiebre",
    description: "Mientras su Salud se encuentre al 50% o menos (SA <= 50%), sufre un penalizador de -2 a todas sus tiradas de acción.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_punto_quiebre",
        mode: "continuous",
        conditions: [
          {
            type: "percentage",
            resourceId: "SA",
            comparison: "<=",
            percent: 50,
          },
        ],
        effects: [
          {
            id: "eff_punto_quiebre_penalty",
            type: "roll_modifier",
            rollType: "action",
            amount: -2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 15. Retroceso Corporal
  {
    id: "weakness_retroceso_corporal",
    name: "Retroceso Corporal",
    description: "Cada vez que utiliza su Quirk, el esfuerzo físico inflige 3 puntos de daño directo a su propia Salud.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_retroceso_corporal",
        mode: "reactive",
        trigger: {
          kind: "use_quirk",
        },
        conditions: [],
        effects: [
          {
            id: "eff_retroceso_damage",
            type: "damage",
            dice: "3",
            target: { type: "self" },
          },
        ],
      },
    ],
  },

  // 16. Rigidez Corporal
  {
    id: "weakness_rigidez_corporal",
    name: "Rigidez Corporal",
    description: "La excesiva masa muscular compromete los reflejos: Si RES está entre 5 y 6, EVA -1. Si RES es >= 7, EVA -2. Las escalas son mutuamente excluyentes y nunca se acumulan.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_rigidez_res_5_6",
        mode: "continuous",
        conditions: [
          {
            type: "attribute",
            attributeId: "res",
            comparison: ">=",
            value: 5,
          },
          {
            type: "attribute",
            attributeId: "res",
            comparison: "<",
            value: 7,
          },
        ],
        conditionLogic: "all",
        effects: [
          {
            id: "eff_rigidez_eva_1",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -1,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_rigidez_res_7_plus",
        mode: "continuous",
        conditions: [
          {
            type: "attribute",
            attributeId: "res",
            comparison: ">=",
            value: 7,
          },
        ],
        effects: [
          {
            id: "eff_rigidez_eva_2",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 17. Rigidez Mental
  {
    id: "weakness_rigidez_mental",
    name: "Rigidez Mental",
    description: "Inflexibilidad de pensamiento: sufre -2 continuo en tiradas de protección o defensa mental.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_rigidez_mental",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_rigidez_mental_penalty",
            type: "roll_modifier",
            rollType: "mental_defense",
            amount: -2,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 18. Salud Frágil
  {
    id: "weakness_salud_fragil",
    name: "Salud Frágil",
    description: "Dificultad de regeneración celular: toda curación recibida sufre un penalizador de -1 al valor final curado.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_salud_fragil",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_salud_fragil_heal_penalty",
            type: "incoming_healing_modifier",
            amount: -1,
            operation: "add",
          },
        ],
      },
    ],
  },

  // 19. Sobrecarga Progresiva
  {
    id: "weakness_sobrecarga_progresiva",
    name: "Sobrecarga Progresiva",
    description: "El uso continuo agota las reservas: Si utiliza Quirk en turnos consecutivos, el segundo turno cuesta +1 ES, el tercer turno cuesta +2 ES. Se reinicia tras un turno sin usar Quirk.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_sobrecarga_prog_turn2",
        mode: "continuous",
        conditions: [
          {
            type: "turn_history",
            event: "consecutive_turns_used",
            comparison: "=",
            value: 2,
          },
        ],
        effects: [
          {
            id: "eff_sobrecarga_cost_1",
            type: "cost_modifier",
            scopeId: "quirk",
            amount: 1,
            operation: "add",
          },
        ],
      },
      {
        id: "mb_sobrecarga_prog_turn3_plus",
        mode: "continuous",
        conditions: [
          {
            type: "turn_history",
            event: "consecutive_turns_used",
            comparison: ">=",
            value: 3,
          },
        ],
        effects: [
          {
            id: "eff_sobrecarga_cost_2",
            type: "cost_modifier",
            scopeId: "quirk",
            amount: 2,
            operation: "add",
          },
        ],
        control: {
          reset: {
            target: "consecutive_turns_quirk_used",
            event: "turn_without_quirk",
          },
        },
      },
    ],
  },

  // 20. Sobrecarga Total
  {
    id: "weakness_sobrecarga_total",
    name: "Sobrecarga Total",
    description: "Cuando obtiene doble 10 en una tirada de Quirk, recibe 4 de daño inmediato y su siguiente uso de Quirk duplica su coste de ES (x2). Tras ese uso, el multiplicador desaparece.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_sobrecarga_total",
        mode: "reactive",
        trigger: {
          kind: "roll",
          tag: "quirk",
        },
        conditions: [
          {
            type: "die",
            dieSelection: "both",
            comparison: "=",
            value: 10,
          },
        ],
        effects: [
          {
            id: "eff_sobrecarga_total_dmg",
            type: "damage",
            dice: "4",
            target: { type: "self" },
          },
          {
            id: "eff_sobrecarga_total_double_cost",
            type: "cost_modifier",
            scopeId: "quirk",
            amount: 2,
            operation: "multiply",
            temporality: {
              duration: {
                type: "until_next_use",
              },
            },
          },
        ],
      },
    ],
  },

  // 21. Trauma
  {
    id: "weakness_trauma",
    name: "Trauma",
    description: "Ante la exposición a un estímulo traumático (señal manual: trauma_stimulus), debe superar una tirada de RD 16. En fallo queda Paralizado 1 turno; con un margen de fallo de 5 o más, queda Paralizado 2 turnos.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_trauma",
        mode: "reactive",
        trigger: {
          kind: "manual",
          description: "Exposición al estímulo traumático (trauma_stimulus)",
        },
        conditions: [],
        resolution: {
          type: "rd",
          difficulty: 16,
          outcomes: [
            {
              id: "outcome_trauma_margin_5",
              outcome: "failure_margin",
              marginThreshold: 5,
              description: "Fallo crítico/grave: Paralizado durante 2 turnos",
              effects: [
                {
                  id: "eff_trauma_paralyzed_2",
                  type: "status_apply",
                  statusElementId: "core.status.paralyzed",
                  turns: 2,
                },
              ],
            },
            {
              id: "outcome_trauma_fail_regular",
              outcome: "failure",
              description: "Fallo regular: Paralizado durante 1 turno",
              effects: [
                {
                  id: "eff_trauma_paralyzed_1",
                  type: "status_apply",
                  statusElementId: "core.status.paralyzed",
                  turns: 1,
                },
              ],
            },
          ],
        },
        effects: [],
      },
    ],
  },

  // 22. Zona Vulnerable
  {
    id: "weakness_zona_vulnerable",
    name: "Zona Vulnerable",
    description: "Un punto débil anatómico o biomecánico: cuando recibe un impacto crítico (doble 9 o doble 10 / tag: critical), el daño entrante se incrementa en +5 en el mismo pipeline.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_zona_vulnerable",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_zona_vulnerable_crit_dmg",
            type: "incoming_damage_modifier",
            amount: 5,
            operation: "add",
            tagFilter: "critical",
          },
        ],
      },
    ],
  },

  // 23. Vulnerable al fuego
  {
    id: "weakness_vulnerable_al_fuego",
    name: "Vulnerable al fuego",
    description: "Vulnerabilidad elemental: todo daño entrante con la etiqueta de fuego (tag: fire) se incrementa en +4.",
    kind: "weakness",
    mechanicalBehaviors: [
      {
        id: "mb_vulnerable_fuego",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_vulnerable_fuego_dmg",
            type: "incoming_damage_modifier",
            amount: 4,
            operation: "add",
            tagFilter: "fire",
          },
        ],
      },
    ],
  },
];

export const SYSTEM_WEAKNESSES: CanonicalWeaknessDefinition[] = RAW_SYSTEM_WEAKNESSES.map((w) => ({
  ...w,
  mechanicalBehaviors: w.mechanicalBehaviors.map((b) => mechanicalBehaviorSchema.parse(b)),
}));
