import { describe, expect, test } from 'bun:test';
import { getAvailableWeaponConditions, getWeaponRuntimeInput } from './forgeDamageModifiers';
import type { ForgeSelectionData } from './forgeTypes';

const weapon = (overrides: Partial<ForgeSelectionData> = {}): ForgeSelectionData => ({
  equipmentType: 'Weapon',
  category: 'Dagger',
  variant: 'Dagger',
  enhancement: 3,
  ores: { Copper: 3 },
  ...overrides,
});

describe('forge damage modifier guards', () => {
  test('Moon Boost only becomes available when Moon Stone reaches the 10% trait threshold', () => {
    expect(getAvailableWeaponConditions(weapon({ ores: { 'Moon Stone': 1, Copper: 10 } })).moon_boost).toBe(false);
    expect(getAvailableWeaponConditions(weapon({ ores: { 'Moon Stone': 1, Copper: 9 } })).moon_boost).toBe(true);
  });

  test("Bull's Fury is only exposed for Minotaur weapon builds", () => {
    expect(getAvailableWeaponConditions(weapon()).bulls_fury).toBe(false);
    expect(getAvailableWeaponConditions(weapon({ race: 'Minotaur' })).bulls_fury).toBe(true);
    expect(getAvailableWeaponConditions({ ...weapon({ race: 'Minotaur' }), equipmentType: 'Armor' }).bulls_fury).toBe(false);
  });

  test('weapon-rooted Berserker is only exposed when Fierce Jade reaches the trait threshold', () => {
    expect(getAvailableWeaponConditions(weapon({ ores: { 'Fierce Jade': 1, Copper: 10 } })).berserker).toBe(false);
    expect(getAvailableWeaponConditions(weapon({ ores: { 'Fierce Jade': 1, Copper: 9 } })).berserker).toBe(true);
  });

  test('runtime input clamps external Berserker and cleans stale conditions', () => {
    const data = weapon({
      lethality: 45,
      externalBerserker: 250,
      weaponConditions: { moon_boost: true, bulls_fury: true, berserker: true },
    });
    const runtime = getWeaponRuntimeInput(data);

    expect(runtime.external_berserker).toBe(200);
    expect(runtime.conditions).toEqual({ moon_boost: false, bulls_fury: false, berserker: false });
    expect('lethality' in runtime).toBe(false);
    expect(data.lethality).toBeUndefined();
  });

  test('Lethality stays on configured weapon rune subtraits instead of becoming a manual runtime input', () => {
    const data = weapon({
      lethality: 15,
      runes: [
        {
          id: 'test',
          name: 'Rune: Blast Chip',
          roll: { aoe_explosion: 0.2, aoe_explosion_chance: 0.08 },
          subtraits: [{ subtrait: 'Secondary: Lethality', roll: { physical_damage: 15 } }],
        },
      ],
    });

    const runtime = getWeaponRuntimeInput(data);
    expect('lethality' in runtime).toBe(false);
    expect(data.lethality).toBeUndefined();
    expect(data.runes?.[0]?.subtraits?.[0]?.subtrait).toBe('Secondary: Lethality');
  });

  test('available conditions survive cleanup when their exact source is still present', () => {
    const data = weapon({
      race: 'Minotaur',
      ores: { 'Moon Stone': 1, 'Fierce Jade': 1, Copper: 8 },
      weaponConditions: { moon_boost: true, bulls_fury: true, berserker: true },
    });

    expect(getWeaponRuntimeInput(data).conditions).toEqual({
      moon_boost: true,
      bulls_fury: true,
      berserker: true,
    });
  });
});
