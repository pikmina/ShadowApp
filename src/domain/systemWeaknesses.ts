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
  mechanicalBehaviors: MechanicalBehavior[];
}

const RAW_CORE_ALTERED_STATUSES: Array<{
  id: string;
  name: string;
  description: string;
  kind: "altered_status";
  mechanicalBehaviors: MechanicalBehaviorInput[];
}> = [
  {
    id: "core.status.stunned",
    name: "Aturdido",
    description: "El personaje pierde su siguiente turno o acción principal.",
    kind: "altered_status",
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
        ],
      },
    ],
  },
  {
    id: "core.status.vulnerable",
    name: "Vulnerable",
    description: "El personaje tiene sus defensas comprometidas: -2 a Evasión (EVA).",
    kind: "altered_status",
    mechanicalBehaviors: [
      {
        id: "status_vulnerable_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_vulnerable_eva",
            type: "derived_stat_modifier",
            statId: "eva",
            amount: -2,
            operation: "add",
          },
        ],
      },
    ],
  },
  {
    id: "core.status.berserker",
    name: "Berserker",
    description: "Estado de frenesí incontrolable: +2 Fuerza (FUE), -2 Inteligencia (INT). Obligado a atacar al objetivo más cercano.",
    kind: "altered_status",
    mechanicalBehaviors: [
      {
        id: "status_berserker_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_berserker_fue",
            type: "attribute_modifier",
            attributeId: "fue",
            amount: 2,
            operation: "add",
          },
          {
            id: "eff_berserker_int",
            type: "attribute_modifier",
            attributeId: "int",
            amount: -2,
            operation: "add",
          },
          {
            id: "eff_berserker_control",
            type: "manual",
            message: "Furia ciega: debe atacar al objetivo más cercano disponible.",
          },
        ],
      },
    ],
  },
  {
    id: "core.status.paralyzed",
    name: "Paralizado",
    description: "Incapacidad motriz temporal: no puede realizar acciones ni movimientos.",
    kind: "altered_status",
    mechanicalBehaviors: [
      {
        id: "status_paralyzed_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_paralyzed_block",
            type: "action_block",
            blockedAction: "all",
            duration: 1,
          },
        ],
      },
    ],
  },
  {
    id: "core.status.unstable",
    name: "Inestable",
    description: "El Quirk o poder del personaje se descontrola; sus efectos escapan al control preciso del usuario.",
    kind: "altered_status",
    mechanicalBehaviors: [
      {
        id: "status_unstable_behavior",
        mode: "continuous",
        conditions: [],
        effects: [
          {
            id: "eff_unstable_manual",
            type: "manual",
            message: "Efecto inestable: el Director de Juego determina desviaciones o efectos colaterales.",
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
          kind: "receive_healing",
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
                  type: "incoming_healing_modifier",
                  amount: -999,
                  operation: "add",
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
