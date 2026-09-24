import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../components/ui/select';
import {
  MECHANICAL_LABELS,
  getMechanicalLabel,
  getAttributeLabel,
  getSourceTypeLabel,
  getCounterLabel,
  getConditionLogicLabel,
  resolveDomainLabel,
} from '../mechanicalLabels';
import {
  describeMechanicalBehavior,
  describeMechanicalEffect,
  describeMechanicalCondition,
} from '../mechanicalDescription';
import { createDefaultMechanicalBehavior } from '../mechanicalBehavior';
import { resolveCharacterDisplayName } from '../coreProfileFields';

/**
 * Helper to extract only the visible text inside the combobox trigger button
 */
function getVisibleTriggerText(html: string): string {
  const triggerMatch = html.match(/<button[^>]*>([\s\S]*?)<\/button>/);
  if (!triggerMatch) return '';
  // Strip tags and svg arrows to get only inner human-readable text
  return triggerMatch[1].replace(/<[^>]+>/g, '').replace(/▼/g, '').trim();
}

/**
 * Helper to extract internal hidden input value
 */
function getInternalHiddenValue(html: string): string | null {
  const inputMatch = html.match(/<input[^>]*value="([^"]*)"/);
  return inputMatch ? inputMatch[1] : null;
}

describe('TAREA 33.5 — Auditoría real de valores técnicos expuestos en UI', () => {
  describe('1. Selector de Personaje (Caso 38 vs Himiko Toga)', () => {
    it('renderiza Himiko Toga como texto visible, valor interno 38, y el texto visible NO contiene "38"', () => {
      const character = {
        id: 38,
        name: 'Himiko Toga',
        profileData: {
          basic_name: 'Himiko',
          last_name: 'Toga',
        },
      };

      const charName = resolveCharacterDisplayName(character);
      expect(charName).toBe('Himiko Toga');

      const html = ReactDOMServer.renderToString(
        <Select value={String(character.id)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar personaje..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(character.id)}>{charName}</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      const internalValue = getInternalHiddenValue(html);

      // Contract checks:
      expect(internalValue).toBe('38');
      expect(visibleText).toBe('Himiko Toga');
      expect(visibleText).not.toContain('38');
      expect(visibleText).not.toContain(String(character.id));
    });

    it('cuando el personaje no está en la lista o está cargando, NUNCA expone el ID numérico "38"', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="38">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar personaje..." />
          </SelectTrigger>
          <SelectContent>
            {/* Empty during loading */}
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      expect(visibleText).toBe('Seleccionar personaje...');
      expect(visibleText).not.toContain('38');
    });
  });

  describe('2. Filtros de Sistema → Técnicas (all -> localized text)', () => {
    it('filtro de personaje muestra "Todos los personajes" y no "all"', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos los personajes">Todos los personajes</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los personajes</SelectItem>
            <SelectItem value="38">Himiko Toga</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      expect(visibleText).toBe('Todos los personajes');
      expect(visibleText).not.toBe('all');
    });

    it('filtro de origen muestra "Todos los orígenes" y no "all"', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="all">
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Todos los orígenes">Todos los orígenes</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            <SelectItem value="quirk">Don</SelectItem>
            <SelectItem value="physical">Física</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      expect(visibleText).toBe('Todos los orígenes');
      expect(visibleText).not.toBe('all');
    });

    it('filtro de categoría muestra "Todas las categorías" y no "all"', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="all">
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Todas las categorías">Todas las categorías</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="offensive">Ofensiva</SelectItem>
            <SelectItem value="support">Soporte</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      expect(visibleText).toBe('Todas las categorías');
      expect(visibleText).not.toBe('all');
    });
  });

  describe('3. Disparador en MechanicalBehavior (receive_damage -> Recibir daño)', () => {
    it('renderiza "Recibir daño" en el Select cerrado y el valor interno es "receive_damage"', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="receive_damage">
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="receive_damage">Recibir daño</SelectItem>
            <SelectItem value="deal_damage">Infligir daño</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      const internalValue = getInternalHiddenValue(html);

      expect(internalValue).toBe('receive_damage');
      expect(visibleText).toBe('Recibir daño');
      expect(visibleText).not.toBe('receive_damage');
    });
  });

  describe('4. Lógica de Condiciones (all -> Todas (AND), any -> Alguna (OR))', () => {
    it('renderiza "Todas (AND)" cuando el valor es "all"', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="all">
          <SelectTrigger className="h-7 w-32">
            <SelectValue>{getConditionLogicLabel('all')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas (AND)</SelectItem>
            <SelectItem value="any">Alguna (OR)</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      expect(visibleText).toBe('Todas (AND)');
      expect(visibleText).not.toBe('all');
    });

    it('renderiza "Alguna (OR)" cuando el valor es "any"', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="any">
          <SelectTrigger className="h-7 w-32">
            <SelectValue>{getConditionLogicLabel('any')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas (AND)</SelectItem>
            <SelectItem value="any">Alguna (OR)</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      expect(visibleText).toBe('Alguna (OR)');
      expect(visibleText).not.toBe('any');
    });
  });

  describe('5. ID de Contador (combat_counter -> Contador de combate)', () => {
    it('renderiza "Contador de combate" en el selector de contador', () => {
      const html = ReactDOMServer.renderToString(
        <Select value="combat_counter">
          <SelectTrigger className="h-7 w-40">
            <SelectValue>{getCounterLabel('combat_counter')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="combat_counter">Contador de combate</SelectItem>
            <SelectItem value="charges">Cargas</SelectItem>
          </SelectContent>
        </Select>
      );

      const visibleText = getVisibleTriggerText(html);
      const internalValue = getInternalHiddenValue(html);

      expect(internalValue).toBe('combat_counter');
      expect(visibleText).toBe('Contador de combate');
      expect(visibleText).not.toBe('combat_counter');
    });

    it('la descripción generada para efecto counter_modifier usa "Contador de combate" y no "combat_counter"', () => {
      const mb = {
        ...createDefaultMechanicalBehavior('beh_counter_test'),
        mode: 'reactive' as const,
        trigger: { kind: 'receive_damage' },
        effects: [
          {
            id: 'eff_cnt_1',
            type: 'counter_modifier' as const,
            counterId: 'combat_counter',
            value: 1,
            operation: 'increment' as const,
          },
        ],
      };

      const result = describeMechanicalBehavior(mb);
      expect(result.text).toContain('contador Contador de combate');
      expect(result.text).not.toContain('combat_counter');
    });

    it('la descripción generada para condición counter usa "Contador de combate" y no "combat_counter"', () => {
      const cond = {
        type: 'counter' as const,
        counterId: 'combat_counter',
        comparison: '>=' as const,
        value: 3,
      };

      const result = describeMechanicalCondition(cond);
      expect(result.text).toContain('contador Contador de combate');
      expect(result.text).not.toContain('combat_counter');
    });
  });

  describe('6. Capa Universal de Presentación (resolveDomainLabel)', () => {
    it('resuelve disparadores canónicos a español', () => {
      expect(resolveDomainLabel('receive_damage')).toBe('Recibir daño');
      expect(resolveDomainLabel('deal_damage')).toBe('Infligir daño');
      expect(resolveDomainLabel('turn_start')).toBe('Inicio del turno');
      expect(resolveDomainLabel('turn_end')).toBe('Fin del turno');
      expect(resolveDomainLabel('combat_start')).toBe('Inicio del combate');
    });

    it('resuelve acciones y modos canónicos', () => {
      expect(resolveDomainLabel('action')).toBe('Acción estándar');
      expect(resolveDomainLabel('quick_action')).toBe('Acción rápida');
      expect(resolveDomainLabel('free_action')).toBe('Acción libre');
      expect(resolveDomainLabel('voluntary_reaction')).toBe('Reacción voluntaria');
    });

    it('resuelve contadores del sistema', () => {
      expect(resolveDomainLabel('combat_counter')).toBe('Contador de combate');
      expect(resolveDomainLabel('charges')).toBe('Cargas');
      expect(resolveDomainLabel('combo')).toBe('Combo');
      expect(resolveDomainLabel('uses')).toBe('Usos');
      expect(resolveDomainLabel('focus')).toBe('Concentración');
      expect(resolveDomainLabel('heat')).toBe('Calor / Tensión');
    });

    it('resuelve operadores y conectores lógicos', () => {
      expect(resolveDomainLabel('all')).toBe('Todos');
      expect(resolveDomainLabel('any')).toBe('Alguna');
      expect(resolveDomainLabel('and')).toBe('Todas (AND)');
      expect(resolveDomainLabel('or')).toBe('Alguna (OR)');
    });

    it('conserva atributos oficiales del sistema', () => {
      expect(resolveDomainLabel('FUE')).toBe('Fuerza (FUE)');
      expect(resolveDomainLabel('DES')).toBe('Destreza (DES)');
      expect(resolveDomainLabel('RES')).toBe('Resistencia (RES)');
      expect(resolveDomainLabel('INT')).toBe('Inteligencia (INT)');
      expect(resolveDomainLabel('VOL')).toBe('Voluntad (VOL)');
      expect(resolveDomainLabel('VEL')).toBe('Velocidad (VEL)');
    });
  });
});
