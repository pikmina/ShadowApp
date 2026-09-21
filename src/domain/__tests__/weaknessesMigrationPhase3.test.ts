import { describe, it, expect, beforeEach } from 'vitest';
import {
  RuleWorld,
  EncounterRuntimeState,
  createParticipantRuntimeState,
  getActiveContinuousModifiers,
  dispatchMechanicalEvent,
  processDamagePipeline,
  processHealingPipeline,
  calculateEffectiveCost,
  applyRollPendingModifiers,
  evaluateMechanicalConditions,
} from '../mechanicalRuntime.ts';
import { SYSTEM_WEAKNESSES, CORE_ALTERED_STATUSES } from '../systemWeaknesses.ts';
import { MechanicalBehavior } from '../mechanicalBehavior.ts';

function getWeaknessBehaviors(weaknessId: string): MechanicalBehavior[] {
  const w = SYSTEM_WEAKNESSES.find((item) => item.id === weaknessId);
  if (!w) throw new Error(`Weakness ${weaknessId} not found in SYSTEM_WEAKNESSES`);
  return w.mechanicalBehaviors;
}

describe('Fase 3 — Migración de las 23 Debilidades a MechanicalBehavior', () => {
  let world: RuleWorld;
  let encounter: EncounterRuntimeState;

  beforeEach(() => {
    world = {
      hero: {
        attributes: { fue: 4, des: 3, res: 4, int: 3, vol: 3, vel: 3 },
        resources: {
          SA: { current: 20, max: 20 },
          ES: { current: 10, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
      enemy: {
        attributes: { fue: 5, des: 3, res: 5, int: 2, vol: 2, vel: 3 },
        resources: {
          SA: { current: 30, max: 30 },
          ES: { current: 10, max: 10 },
        },
        barrier: 0,
        modifiers: [],
        statuses: [],
        inventory: {},
      },
    };

    encounter = {
      turn: 1,
      eventLog: [],
      traceLog: [],
      participants: {
        hero: createParticipantRuntimeState('hero'),
        enemy: createParticipantRuntimeState('enemy'),
      },
    };
  });

  // 1. Acumulación de Impacto
  describe('1. Acumulación de Impacto', () => {
    it('acumula contador de impacto en cada daño recibido y dispara +3 daño y pérdida de turno al alcanzar 3', () => {
      const behaviors = getWeaknessBehaviors('weakness_acumulacion_impacto');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_acumulacion_impacto', behavior: b }));

      // Impacto 1
      const res1 = dispatchMechanicalEvent({
        event: { kind: 'receive_damage', sourceEntityId: 'enemy', targetEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      world = res1.newWorld;
      encounter = res1.newEncounter;
      const counterKey = 'hero:weakness_acumulacion_impacto:mb_acumulacion_counter:impacto';
      expect(encounter.participants.hero.activeCounters[counterKey]).toBe(1);
      expect(encounter.participants.hero.turnLoss).toBe(0);

      // Impacto 2
      const res2 = dispatchMechanicalEvent({
        event: { kind: 'receive_damage', sourceEntityId: 'enemy', targetEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      world = res2.newWorld;
      encounter = res2.newEncounter;
      expect(encounter.participants.hero.activeCounters[counterKey]).toBe(2);
      expect(encounter.participants.hero.turnLoss).toBe(0);

      // Impacto 3 -> Se activa el umbral: turn_loss: 1 y reset
      const res3 = dispatchMechanicalEvent({
        event: { kind: 'receive_damage', sourceEntityId: 'enemy', targetEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      world = res3.newWorld;
      encounter = res3.newEncounter;

      // Comprobar que se aplicó pérdida de turno
      expect(encounter.participants.hero.turnLoss).toBe(1);
      // Comprobar modificador de daño aplicado o resuelto
      const dmgMods = res3.appliedEffects.filter((e) => e.type === 'incoming_damage_modifier');
      expect(dmgMods.length).toBeGreaterThanOrEqual(1);
      expect(dmgMods[0].amount).toBe(3);
    });
  });

  // 2. Armadura Lenta
  describe('2. Armadura Lenta', () => {
    it('aplica continuamente -2 EVA y -1 VEL; y aturde si el ataque perfora la armadura (tag: armor_pierced)', () => {
      const behaviors = getWeaknessBehaviors('weakness_armadura_lenta');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_armadura_lenta', behavior: b }));

      // Continuously
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.derivedStatModifiers).toEqual(
        expect.arrayContaining([{ statId: 'eva', amount: -2, operation: 'add' }])
      );
      expect(cont.attributeModifiers).toEqual(
        expect.arrayContaining([{ attributeId: 'vel', amount: -1, operation: 'add' }])
      );

      // Ataque sin perforar armadura -> No aturde
      const resNormal = dispatchMechanicalEvent({
        event: { kind: 'receive_damage', sourceEntityId: 'enemy', targetEntityId: 'hero', payload: { tags: ['normal'] } },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(resNormal.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.stunned')).toBe(false);

      // Ataque que perfora armadura (armor_pierced) -> Aturdido
      const resPierced = dispatchMechanicalEvent({
        event: { kind: 'receive_damage', sourceEntityId: 'enemy', targetEntityId: 'hero', payload: { tags: ['armor_pierced'] } },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(resPierced.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.stunned')).toBe(true);
    });
  });

  // 3. Canalización Exigente
  describe('3. Canalización Exigente', () => {
    it('incrementa coste de canalización en +1 ES y paraliza 1 turno si es interrumpida', () => {
      const behaviors = getWeaknessBehaviors('weakness_canalizacion_exigente');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_canalizacion_exigente', behavior: b }));

      // Acción sin canalización -> coste base sin incremento
      const costNormal = calculateEffectiveCost({
        baseCost: 2,
        scope: 'action',
        entityId: 'hero',
        encounter,
        continuousModifiers: [],
      });
      expect(costNormal.effectiveCost).toBe(2);

      // Modificadores con tag channeling
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero, world, [], ['channeling']);
      expect(cont.costModifiers).toEqual(
        expect.arrayContaining([{ scopeId: 'channeling', amount: 1, operation: 'add' }])
      );

      // Interrupción de acción -> Paralizado 1 turno
      const resInterrupted = dispatchMechanicalEvent({
        event: { kind: 'action_interrupted', sourceEntityId: 'hero', targetEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(resInterrupted.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.paralyzed')).toBe(true);
    });
  });

  // 4. Dependencia
  describe('4. Dependencia', () => {
    it('no penaliza si no hay señal manual; con señal substance_deprivation penaliza -2 tiradas y +1 coste Quirk', () => {
      const behaviors = getWeaknessBehaviors('weakness_dependencia');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_dependencia', behavior: b }));

      // Sin señal manual
      const contNormal = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero, world, []);
      expect(contNormal.rollModifiers.length).toBe(0);
      expect(contNormal.costModifiers.length).toBe(0);

      // Con señal manual substance_deprivation
      const contDeprived = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero, world, ['substance_deprivation']);
      expect(contDeprived.rollModifiers).toEqual(
        expect.arrayContaining([{ rollType: 'all', amount: -2, operation: 'add' }])
      );
      expect(contDeprived.costModifiers).toEqual(
        expect.arrayContaining([{ scopeId: 'quirk', amount: 1, operation: 'add' }])
      );
    });
  });

  // 5. Dependencia del Ritmo
  describe('5. Dependencia del Ritmo', () => {
    it('resta 1 ES al finalizar el turno si NO utilizó Quirk durante ese turno', () => {
      const behaviors = getWeaknessBehaviors('weakness_dependencia_del_ritmo');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_dependencia_del_ritmo', behavior: b }));

      // Caso positivo: no usó Quirk en el turno (usedQuirkThisTurn: false)
      encounter.participants.hero.usedQuirkThisTurn = false;
      const res1 = dispatchMechanicalEvent({
        event: { kind: 'turn_end', sourceEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(res1.newWorld.hero.resources.ES.current).toBe(9); // 10 - 1

      // Caso negativo: sí utilizó Quirk en el turno (usedQuirkThisTurn: true)
      encounter.participants.hero.usedQuirkThisTurn = true;
      const res2 = dispatchMechanicalEvent({
        event: { kind: 'turn_end', sourceEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(res2.newWorld.hero.resources.ES.current).toBe(10); // no resta
    });
  });

  // 6. Derroche de Energía
  describe('6. Derroche de Energía', () => {
    it('no se activa con gasto acumulado < 4; con >= 4 dispara chequeo RD 12 que en fallo resta 1 ES y aplica Vulnerable', () => {
      const behaviors = getWeaknessBehaviors('weakness_derroche_de_energia');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_derroche_de_energia', behavior: b }));

      // Gasto de 3 ES -> no se activa
      encounter.participants.hero.esSpentThisTurn = 3;
      const resUnder = dispatchMechanicalEvent({
        event: { kind: 'spend_resource', sourceEntityId: 'hero', payload: { resourceId: 'ES', amount: 3 } },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(resUnder.appliedEffects.length).toBe(0);

      // Gasto de 4 ES -> Dispara resolución RD 12 (simulamos tirada 10: fallo)
      encounter.participants.hero.esSpentThisTurn = 4;
      const resFail = dispatchMechanicalEvent({
        event: { kind: 'spend_resource', sourceEntityId: 'hero', payload: { resourceId: 'ES', amount: 1 } },
        world,
        encounter,
        ownedBehaviors: owned,
        rollResult: 10, // Menor que 12 -> Fallo
      });
      expect(resFail.newWorld.hero.resources.ES.current).toBe(9); // -1 ES
      expect(resFail.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.vulnerable')).toBe(true);
    });
  });

  // 7. Descarga Forzada
  describe('7. Descarga Forzada', () => {
    it('bloquea Quirk durante 1 turno tras su uso, pero define excepción con coste 3 ES', () => {
      const behaviors = getWeaknessBehaviors('weakness_descarga_forzada');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_descarga_forzada', behavior: b }));

      const res = dispatchMechanicalEvent({
        event: { kind: 'use_quirk', sourceEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(res.newEncounter.participants.hero.actionBlocks.some((b) => b.blockedAction === 'quirk')).toBe(true);

      // Control exception definido en el behavior
      expect(behaviors[0].control?.exception).toBeDefined();
      expect(behaviors[0].control?.exception?.costResource).toBe('ES');
      expect(behaviors[0].control?.exception?.costAmount).toBe(3);
    });
  });

  // 8. Egocéntrico
  describe('8. Egocéntrico', () => {
    it('aplica continuamente Alerta -4 y Dominio Quirk -2; y resta 1 ES si falla tirada por margen >= 5', () => {
      const behaviors = getWeaknessBehaviors('weakness_egocentrico');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_egocentrico', behavior: b }));

      // Continuo
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.skillModifiers).toEqual(
        expect.arrayContaining([
          { skillId: 'alerta', amount: -4, operation: 'add' },
          { skillId: 'dominio_quirk', amount: -2, operation: 'add' },
        ])
      );

      // Fallo por margen pequeño (3) -> No resta ES
      const resSmallFail = dispatchMechanicalEvent({
        event: { kind: 'roll_failure', sourceEntityId: 'hero', payload: { failureMargin: 3 } },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(resSmallFail.newWorld.hero.resources.ES.current).toBe(10);

      // Fallo por margen grave (5) -> Resta 1 ES
      const resGraveFail = dispatchMechanicalEvent({
        event: { kind: 'roll_failure', sourceEntityId: 'hero', payload: { failureMargin: 5 } },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(resGraveFail.newWorld.hero.resources.ES.current).toBe(9);
    });
  });

  // 9. Emocionalidad Frágil
  describe('9. Emocionalidad Frágil', () => {
    it('requiere señal manual intense_emotion y dado <= 5 para volver inestable el Quirk', () => {
      const behaviors = getWeaknessBehaviors('weakness_emocionalidad_fragil');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_emocionalidad_fragil', behavior: b }));

      // Sin señal manual aunque saque un 2 -> no dispara
      const resNoSignal = dispatchMechanicalEvent({
        event: { kind: 'use_quirk', sourceEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
        dice: [2, 8],
      });
      expect(resNoSignal.appliedEffects.length).toBe(0);

      // Con señal manual pero dados altos [6, 7] -> no dispara
      const resHighDice = dispatchMechanicalEvent({
        event: { kind: 'use_quirk', sourceEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
        signals: ['intense_emotion'],
        dice: [6, 7],
      });
      expect(resHighDice.appliedEffects.length).toBe(0);

      // Con señal manual y un dado <= 5 -> Inestable / Resolución manual
      const resTriggered = dispatchMechanicalEvent({
        event: { kind: 'use_quirk', sourceEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
        signals: ['intense_emotion'],
        dice: [4, 8],
      });
      expect(resTriggered.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.unstable')).toBe(true);
    });
  });

  // 10. Energía Oscura (TEST CRÍTICO)
  describe('10. Energía Oscura (Test crítico)', () => {
    it('un 1 inflige 4 de daño; sin 1 no hace nada; doble 1 activa Berserker 2 turnos y 4 daño', () => {
      const behaviors = getWeaknessBehaviors('weakness_energia_oscura');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_energia_oscura', behavior: b }));

      // Caso 1: Tirada con un 1 (ej: [1, 7]) -> 4 daño, NO berserker
      const resOne = dispatchMechanicalEvent({
        event: { kind: 'roll', sourceEntityId: 'hero', payload: { tag: 'quirk' } },
        world,
        encounter,
        ownedBehaviors: owned,
        dice: [1, 7],
      });
      expect(resOne.newWorld.hero.resources.SA.current).toBe(16); // 20 - 4
      expect(resOne.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.berserker')).toBe(false);

      // Caso 2: Tirada sin 1 (ej: [4, 6]) -> 0 daño
      const resNone = dispatchMechanicalEvent({
        event: { kind: 'roll', sourceEntityId: 'hero', payload: { tag: 'quirk' } },
        world,
        encounter,
        ownedBehaviors: owned,
        dice: [4, 6],
      });
      expect(resNone.newWorld.hero.resources.SA.current).toBe(20);

      // Caso 3: Crítico doble 1 (ej: [1, 1]) -> Aplica Berserker 2 turnos y exactamente 4 daño
      const resDouble = dispatchMechanicalEvent({
        event: { kind: 'roll', sourceEntityId: 'hero', payload: { tag: 'quirk' } },
        world,
        encounter,
        ownedBehaviors: owned,
        dice: [1, 1],
      });
      expect(resDouble.newWorld.hero.resources.SA.current).toBe(16); // Una única aplicación de 4 de daño
      expect(resDouble.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.berserker')).toBe(true);
    });
  });

  // 11. Fatiga Crónica
  describe('11. Fatiga Crónica', () => {
    it('aplica +1 ES a Quirk continuo; cuando ES cruza hacia <= 3 aplica Aturdido 1 turno una sola vez', () => {
      const behaviors = getWeaknessBehaviors('weakness_fatiga_cronica');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_fatiga_cronica', behavior: b }));

      // Continuo: Quirk +1 ES
      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.costModifiers).toEqual(
        expect.arrayContaining([{ scopeId: 'quirk', amount: 1, operation: 'add' }])
      );

      // Cruce de umbral ES de 4 a 3 (cross_down) -> Aturdido
      const resCross = dispatchMechanicalEvent({
        event: {
          kind: 'resource_threshold_crossed',
          sourceEntityId: 'hero',
          payload: { resourceId: 'ES', threshold: 3, direction: 'cross_down' },
        },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(resCross.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.stunned')).toBe(true);
    });
  });

  // 12. Mala Cara
  describe('12. Mala Cara', () => {
    it('aplica continuamente +4 RD a Carisma y Presencia; y rechaza curación de soporte si falla chequeo', () => {
      const behaviors = getWeaknessBehaviors('weakness_mala_cara');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_mala_cara', behavior: b }));

      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rdModifiers).toEqual(
        expect.arrayContaining([
          { skillId: 'carisma', amount: 4, operation: 'add' },
          { skillId: 'presencia', amount: 4, operation: 'add' },
        ])
      );

      // Chequeo de soporte entrante en fallo (tirada 8 contra RD 12)
      const resFail = dispatchMechanicalEvent({
        event: { kind: 'receive_healing', sourceEntityId: 'hero', payload: { tags: ['support'] } },
        world,
        encounter,
        ownedBehaviors: owned,
        rollResult: 8,
      });
      expect(resFail.appliedEffects.some((e) => e.type === 'incoming_healing_modifier' && e.amount < 0)).toBe(true);
    });
  });

  // 13. Obsesión
  describe('13. Obsesión', () => {
    it('aumenta coste ofensivo si el objetivo está presente; y penaliza -2 tiradas si está en peligro y desprotegido', () => {
      const behaviors = getWeaknessBehaviors('weakness_obsesion');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_obsesion', behavior: b }));

      // Señal objetivo presente -> coste ofensivo +1 ES
      const contPresent = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero, world, ['obsession_target_present']);
      expect(contPresent.costModifiers).toEqual(
        expect.arrayContaining([{ scopeId: 'offensive', amount: 1, operation: 'add' }])
      );

      // Señal en peligro pero no desprotegido -> no penaliza tiradas
      const contProtected = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero, world, ['obsession_target_in_danger']);
      expect(contProtected.rollModifiers.length).toBe(0);

      // Ambas señales: en peligro y NO protegido -> -2 a todas las tiradas
      const contUnprotected = getActiveContinuousModifiers(
        owned,
        world.hero,
        encounter.participants.hero,
        world,
        ['obsession_target_in_danger', 'obsession_not_protected']
      );
      expect(contUnprotected.rollModifiers).toEqual(
        expect.arrayContaining([{ rollType: 'all', amount: -2, operation: 'add' }])
      );
    });
  });

  // 14. Punto de Quiebre
  describe('14. Punto de Quiebre', () => {
    it('aplica -2 a tiradas de acción solo mientras SA <= 50%', () => {
      const behaviors = getWeaknessBehaviors('weakness_punto_de_quiebre');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_punto_de_quiebre', behavior: b }));

      // SA = 20 / 20 (100%) -> sin penalizador
      const contFull = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(contFull.rollModifiers.length).toBe(0);

      // SA = 10 / 20 (50%) -> penalizador activo -2
      world.hero.resources.SA.current = 10;
      const contHalf = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(contHalf.rollModifiers).toEqual(
        expect.arrayContaining([{ rollType: 'action', amount: -2, operation: 'add' }])
      );

      // SA se recupera a 14 / 20 (70%) -> desaparece automáticamente
      world.hero.resources.SA.current = 14;
      const contRecovered = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(contRecovered.rollModifiers.length).toBe(0);
    });
  });

  // 15. Retroceso Corporal
  describe('15. Retroceso Corporal', () => {
    it('inflige 3 puntos de daño a sí mismo cada vez que usa Quirk', () => {
      const behaviors = getWeaknessBehaviors('weakness_retroceso_corporal');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_retroceso_corporal', behavior: b }));

      const res = dispatchMechanicalEvent({
        event: { kind: 'use_quirk', sourceEntityId: 'hero' },
        world,
        encounter,
        ownedBehaviors: owned,
      });
      expect(res.newWorld.hero.resources.SA.current).toBe(17); // 20 - 3
    });
  });

  // 16. Rigidez Corporal (TEST CRÍTICO)
  describe('16. Rigidez Corporal (Test crítico)', () => {
    it('escala rigurosamente: RES 4 -> EVA 0, RES 5-6 -> EVA -1, RES 7+ -> EVA -2 (nunca -3)', () => {
      const behaviors = getWeaknessBehaviors('weakness_rigidez_corporal');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_rigidez_corporal', behavior: b }));

      // RES 4 -> 0
      world.hero.attributes.res = 4;
      const cont4 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont4.derivedStatModifiers.length).toBe(0);

      // RES 5 -> EVA -1
      world.hero.attributes.res = 5;
      const cont5 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont5.derivedStatModifiers).toEqual([{ statId: 'eva', amount: -1, operation: 'add' }]);

      // RES 6 -> EVA -1
      world.hero.attributes.res = 6;
      const cont6 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont6.derivedStatModifiers).toEqual([{ statId: 'eva', amount: -1, operation: 'add' }]);

      // RES 7 -> EVA -2 (nunca -3)
      world.hero.attributes.res = 7;
      const cont7 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont7.derivedStatModifiers).toEqual([{ statId: 'eva', amount: -2, operation: 'add' }]);

      // RES 8 -> EVA -2
      world.hero.attributes.res = 8;
      const cont8 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont8.derivedStatModifiers).toEqual([{ statId: 'eva', amount: -2, operation: 'add' }]);
    });
  });

  // 17. Rigidez Mental
  describe('17. Rigidez Mental', () => {
    it('aplica continuamente -2 a tiradas de protección mental', () => {
      const behaviors = getWeaknessBehaviors('weakness_rigidez_mental');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_rigidez_mental', behavior: b }));

      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.rollModifiers).toEqual(
        expect.arrayContaining([{ rollType: 'mental_defense', amount: -2, operation: 'add' }])
      );
    });
  });

  // 18. Salud Frágil
  describe('18. Salud Frágil', () => {
    it('reduce en 1 toda curación recibida mediante el pipeline', () => {
      const behaviors = getWeaknessBehaviors('weakness_salud_fragil');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_salud_fragil', behavior: b }));

      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.incomingHealingModifiers).toEqual([{ amount: -1, operation: 'add' }]);

      // Curación base 5 a hero con SA 10/20
      world.hero.resources.SA.current = 10;
      const healRes = processHealingPipeline({
        baseHealing: 5,
        targetId: 'hero',
        world,
        encounter,
        targetModifiers: cont.incomingHealingModifiers,
      });

      expect(healRes.finalHealing).toBe(4); // 5 - 1 = 4
      expect(healRes.newWorld.hero.resources.SA.current).toBe(14); // 10 + 4
    });
  });

  // 19. Sobrecarga Progresiva (TEST CRÍTICO)
  describe('19. Sobrecarga Progresiva (Test crítico)', () => {
    it('escala en turnos consecutivos (1º:+0, 2º:+1, 3º:+2) y se reinicia tras un turno sin Quirk', () => {
      const behaviors = getWeaknessBehaviors('weakness_sobrecarga_progresiva');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_sobrecarga_progresiva', behavior: b }));

      // Turno 1 con Quirk: consecutive = 1 -> coste normal +0
      encounter.participants.hero.consecutiveTurnsQuirkUsed = 1;
      const cont1 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont1.costModifiers.length).toBe(0);

      // Turno 2 consecutivo con Quirk: consecutive = 2 -> coste +1
      encounter.participants.hero.consecutiveTurnsQuirkUsed = 2;
      const cont2 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont2.costModifiers).toEqual([{ scopeId: 'quirk', amount: 1, operation: 'add' }]);

      // Turno 3 consecutivo con Quirk: consecutive = 3 -> coste +2
      encounter.participants.hero.consecutiveTurnsQuirkUsed = 3;
      const cont3 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont3.costModifiers).toEqual([{ scopeId: 'quirk', amount: 2, operation: 'add' }]);

      // Turno 4 NO usa Quirk -> se reinicia contador
      encounter.participants.hero.consecutiveTurnsQuirkUsed = 0;
      const contReset = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(contReset.costModifiers.length).toBe(0);

      // Turno 5 usa Quirk -> vuelve a ser 1º turno -> coste normal +0
      encounter.participants.hero.consecutiveTurnsQuirkUsed = 1;
      const cont5 = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont5.costModifiers.length).toBe(0);
    });
  });

  // 20. Sobrecarga Total
  describe('20. Sobrecarga Total', () => {
    it('doble 10 inflige 4 de daño y duplica el coste del siguiente uso de Quirk (until_next_use)', () => {
      const behaviors = getWeaknessBehaviors('weakness_sobrecarga_total');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_sobrecarga_total', behavior: b }));

      // Tirada no crítica [10, 8] -> no activa
      const resNoCrit = dispatchMechanicalEvent({
        event: { kind: 'roll', sourceEntityId: 'hero', payload: { tag: 'quirk' } },
        world,
        encounter,
        ownedBehaviors: owned,
        dice: [10, 8],
      });
      expect(resNoCrit.appliedEffects.length).toBe(0);

      // Tirada doble 10 [10, 10]
      const resCrit = dispatchMechanicalEvent({
        event: { kind: 'roll', sourceEntityId: 'hero', payload: { tag: 'quirk' } },
        world,
        encounter,
        ownedBehaviors: owned,
        dice: [10, 10],
      });

      // Recibe 4 de daño inmediato
      expect(resCrit.newWorld.hero.resources.SA.current).toBe(16); // 20 - 4
      // Modificador de coste x2 registrado como pendingModifier
      const pending = resCrit.newEncounter.participants.hero.pendingModifiers.find(
        (p) => p.type === 'cost' && p.scope === 'quirk'
      );
      expect(pending).toBeDefined();
      expect(pending?.operation).toBe('multiply');
      expect(pending?.amount).toBe(2);

      // Al calcular el coste del siguiente Quirk (base 3 ES), se duplica a 6 ES
      const costNext = calculateEffectiveCost({
        baseCost: 3,
        scope: 'quirk',
        entityId: 'hero',
        encounter: resCrit.newEncounter,
      });
      expect(costNext.effectiveCost).toBe(6);

      // Y tras consumirse, el siguiente uso vuelve al coste normal
      const costAfter = calculateEffectiveCost({
        baseCost: 3,
        scope: 'quirk',
        entityId: 'hero',
        encounter: resCrit.newEncounter,
      });
      expect(costAfter.effectiveCost).toBe(3);
    });
  });

  // 21. Trauma
  describe('21. Trauma', () => {
    it('ant estímulo traumático RD 16: éxito no paraliza, fallo regular paraliza 1 turno, fallo grave (5+) paraliza 2 turnos', () => {
      const behaviors = getWeaknessBehaviors('weakness_trauma');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_trauma', behavior: b }));

      // Caso 1: Éxito (tirada 17 contra RD 16) -> sin efecto
      const resSuccess = dispatchMechanicalEvent({
        event: { kind: 'manual', sourceEntityId: 'hero', payload: { signalId: 'trauma_stimulus' } },
        world,
        encounter,
        ownedBehaviors: owned,
        rollResult: 17,
      });
      expect(resSuccess.newWorld.hero.statuses.some((s) => s.statusElementId === 'core.status.paralyzed')).toBe(false);

      // Caso 2: Fallo regular (tirada 14 contra RD 16, margen -2) -> Paralizado 1 turno
      const resFail = dispatchMechanicalEvent({
        event: { kind: 'manual', sourceEntityId: 'hero', payload: { signalId: 'trauma_stimulus' } },
        world,
        encounter,
        ownedBehaviors: owned,
        rollResult: 14,
      });
      const st1 = resFail.newWorld.hero.statuses.find((s) => s.statusElementId === 'core.status.paralyzed');
      expect(st1).toBeDefined();
      expect(st1?.expiresAt).toBe(encounter.turn + 1);

      // Caso 3: Fallo grave (tirada 10 contra RD 16, margen -6 >= 5) -> Paralizado 2 turnos
      const resSevere = dispatchMechanicalEvent({
        event: { kind: 'manual', sourceEntityId: 'hero', payload: { signalId: 'trauma_stimulus' } },
        world,
        encounter,
        ownedBehaviors: owned,
        rollResult: 10,
      });
      const st2 = resSevere.newWorld.hero.statuses.find((s) => s.statusElementId === 'core.status.paralyzed');
      expect(st2).toBeDefined();
      expect(st2?.expiresAt).toBe(encounter.turn + 2);
    });
  });

  // 22. Zona Vulnerable (TEST CRÍTICO)
  describe('22. Zona Vulnerable (Test crítico)', () => {
    it('participa en el pipeline del mismo daño con +5 si es crítico (doble 9 o 10 / tag: critical); daño normal +0', () => {
      const behaviors = getWeaknessBehaviors('weakness_zona_vulnerable');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_zona_vulnerable', behavior: b }));

      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.incomingDamageModifiers).toEqual([{ tagFilter: 'critical', amount: 5, operation: 'add' }]);

      // Daño normal (base 6, sin crítico) -> 6 daño
      const resNormal = processDamagePipeline({
        baseDamage: 6,
        targetId: 'hero',
        world,
        encounter,
        targetContinuousModifiers: cont.incomingDamageModifiers,
      });
      expect(resNormal.finalDamage).toBe(6);
      expect(resNormal.newWorld.hero.resources.SA.current).toBe(14); // 20 - 6

      // Daño crítico por tag (base 6, tag: critical) -> 6 + 5 = 11 daño
      const resCritTag = processDamagePipeline({
        baseDamage: 6,
        targetId: 'hero',
        tags: ['critical'],
        world,
        encounter,
        targetContinuousModifiers: cont.incomingDamageModifiers,
      });
      expect(resCritTag.finalDamage).toBe(11);
      expect(resCritTag.newWorld.hero.resources.SA.current).toBe(9); // 20 - 11

      // Daño crítico por dados doble 9 (base 6, dice: [9, 9]) -> 6 + 5 = 11 daño en el mismo pipeline
      const resCrit9 = processDamagePipeline({
        baseDamage: 6,
        targetId: 'hero',
        dice: [9, 9],
        world,
        encounter,
        targetContinuousModifiers: cont.incomingDamageModifiers,
      });
      expect(resCrit9.finalDamage).toBe(11);

      // Daño crítico por dados doble 10 (base 6, dice: [10, 10]) -> 6 + 5 = 11 daño en el mismo pipeline
      const resCrit10 = processDamagePipeline({
        baseDamage: 6,
        targetId: 'hero',
        dice: [10, 10],
        world,
        encounter,
        targetContinuousModifiers: cont.incomingDamageModifiers,
      });
      expect(resCrit10.finalDamage).toBe(11);
    });
  });

  // 23. Vulnerable al fuego
  describe('23. Vulnerable al fuego', () => {
    it('incrementa daño entrante en +4 solo cuando el ataque tiene tag "fire"', () => {
      const behaviors = getWeaknessBehaviors('weakness_vulnerable_al_fuego');
      const owned = behaviors.map((b) => ({ elementId: 'weakness_vulnerable_al_fuego', behavior: b }));

      const cont = getActiveContinuousModifiers(owned, world.hero, encounter.participants.hero);
      expect(cont.incomingDamageModifiers).toEqual([{ tagFilter: 'fire', amount: 4, operation: 'add' }]);

      // Daño con tag 'fire' (base 6) -> 6 + 4 = 10 daño
      const resFire = processDamagePipeline({
        baseDamage: 6,
        targetId: 'hero',
        tags: ['fire'],
        world,
        encounter,
        targetContinuousModifiers: cont.incomingDamageModifiers,
      });
      expect(resFire.finalDamage).toBe(10);
      expect(resFire.newWorld.hero.resources.SA.current).toBe(10); // 20 - 10

      // Daño sin tag 'fire' (base 6) -> 6 daño
      const resNormal = processDamagePipeline({
        baseDamage: 6,
        targetId: 'hero',
        tags: ['slashing'],
        world,
        encounter,
        targetContinuousModifiers: cont.incomingDamageModifiers,
      });
      expect(resNormal.finalDamage).toBe(6);
      expect(resNormal.newWorld.hero.resources.SA.current).toBe(14); // 20 - 6
    });
  });
});
