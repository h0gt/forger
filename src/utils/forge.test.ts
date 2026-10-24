import { describe, expect, test } from 'bun:test';
import { createForgeQualityInput, parseForgeOreAmount, parseForgeRecipeInput } from './forge';

const ores = ['Galaxite', 'Darkryte', 'Aetherit', 'Copper', 'Iron', 'Gulabite'];

describe('parseForgeOreAmount', () => {
  test('accepts non-negative whole numbers', () => {
    expect(parseForgeOreAmount('0')).toBe(0);
    expect(parseForgeOreAmount('42')).toBe(42);
  });

  test('rejects invalid amounts', () => {
    expect(parseForgeOreAmount('-1')).toBeUndefined();
    expect(parseForgeOreAmount('1.5')).toBeUndefined();
    expect(parseForgeOreAmount('abc')).toBeUndefined();
  });
});

describe('createForgeQualityInput', () => {
  test('preserves an explicit 0 quality', () => {
    expect(createForgeQualityInput(0)).toEqual({ craft_quality: 0 });
  });

  test('omits an unset quality', () => {
    expect(createForgeQualityInput(undefined)).toEqual({});
  });
});

describe('parseForgeRecipeInput', () => {
  test('parses quantity-first recipes', () => {
    expect(parseForgeRecipeInput('10 Galaxite, 5 Darkryte', ores)).toEqual({
      ok: true,
      ores: { Galaxite: 10, Darkryte: 5 },
      total: 15,
    });
  });

  test('parses name-first and multiline recipes', () => {
    expect(parseForgeRecipeInput('Galaxite: 10\nDarkryte 5', ores)).toEqual({
      ok: true,
      ores: { Galaxite: 10, Darkryte: 5 },
      total: 15,
    });
  });

  test('supports x notation and unique prefixes', () => {
    expect(parseForgeRecipeInput('10x Gala + 5x Dark', ores)).toEqual({
      ok: true,
      ores: { Galaxite: 10, Darkryte: 5 },
      total: 15,
    });
  });

  test('merges duplicate ores', () => {
    expect(parseForgeRecipeInput('3 Copper, 2 Copper', ores)).toEqual({
      ok: true,
      ores: { Copper: 5 },
      total: 5,
    });
  });

  test('enforces game-visible recipe limits', () => {
    expect(parseForgeRecipeInput('1 Copper, 1 Iron', ores)).toEqual({
      ok: false,
      error: 'A forge recipe needs at least 3 total ores.',
    });
    expect(parseForgeRecipeInput('1 Galaxite, 1 Darkryte, 1 Aetherit, 1 Copper, 1 Iron', ores)).toEqual({
      ok: false,
      error: 'A forge recipe can contain at most 4 different ores.',
    });
  });
});
