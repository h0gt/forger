import { describe, expect, test } from 'bun:test';
import { MessageComponentTypes } from 'discordeno';
import { buildRuneComponents, formatRuneRange } from './runePresentation';

const content = (components: any[]): string =>
  components
    .map((component) => [component.content ?? '', component.components ? content(component.components) : ''].join('\n'))
    .join('\n');
const fixture = {
  name: 'Flame Spark II',
  rarity: 'Rare',
  type: 'Weapon',
  image: 'https://example.com/rune.png',
  source: { tier: 2, min_subtraits: 1, max_subtraits: 2, configuration_supported: true },
  display: { summary: 'Applies Burning on hit.', mechanics: ['Repeated procs extend the existing burn.'] },
  roll_fields: [{ key: 'fire_damage', label: 'Fire Damage', min: 10, max: 22, unit: '%', source_verified: true }],
  subtraits: { Lethality: { min: 5, max: 15, key: 'physical_damage', source_verified: false } },
  obtainment: ['Blight Pyromancer', 'Blight Pyromancer'],
  tier2_notes: 'Old duplicate tier notes',
  allowed_subtrait_groups: ['Weapon'],
};

describe('rune information presentation', () => {
  test('renders named secondary stats, correct tier counts, and no repeated warning clutter', () => {
    const output = content(buildRuneComponents(fixture));
    expect(output).toContain('Lethality (weapon damage): **5–15%**');
    expect(output).toContain('1–2 different rolls');
    expect(output.match(/Blight Pyromancer/g)?.length).toBe(1);
    expect(output.match(/not verified/g)?.length).toBe(1);
    expect(output).not.toMatch(/undefined|⚠|â|Subtrait groups|Old duplicate/);
  });
  test('shows primary data and mechanics once and removes inert dropdowns', () => {
    const components = buildRuneComponents({
      ...fixture,
      roll_fields: [...fixture.roll_fields, ...fixture.roll_fields],
    });
    expect(content(components).match(/Fire Damage:/g)?.length).toBe(1);
    expect(content(components)).toContain('Repeated procs extend');
    const encoded = JSON.stringify(components);
    expect(encoded).not.toContain('customId');
    expect((components[0] as any).type).toBe(MessageComponentTypes.Container);
  });
  test('keeps unavailable calculator support clear without dropping known stats', () => {
    const output = content(
      buildRuneComponents({ ...fixture, source: { tier: 1, max_subtraits: 0, configuration_supported: false } }),
    );
    expect(output).toContain('Calculator configuration is unavailable');
    expect(output).toContain('This rune has no secondary traits');
    expect(output).toContain('Fire Damage');
    expect(output).not.toContain('Lethality');
  });
  test('formats fixed and ranged values without duplicated units', () => {
    expect(formatRuneRange(8, 8, 'seconds')).toBe('8s');
    expect(formatRuneRange(3, 6, 'studs')).toBe('3–6 studs');
    expect(formatRuneRange(1, 3, 'count')).toBe('1–3');
  });

  test('labels pickaxe-only rolls as extra traits and explains test-rune extras separately', () => {
    const miner = content(
      buildRuneComponents({
        ...fixture,
        type: 'Pickaxe',
        source: { tier: 2, primary_ids: [], min_subtraits: 1, max_subtraits: 2 },
        roll_fields: [{ key: 'mine_power', label: 'Mine Power', min: 8, max: 15, unit: '%' }],
        subtraits: {},
      }),
    );
    expect(miner).toContain('Possible extra traits** · 1–2 different rolls');
    expect(miner).not.toContain('Primary stats');

    const testMiner = content(
      buildRuneComponents({
        ...fixture,
        type: 'Pickaxe',
        source: { tier: 1, primary_ids: ['ExtraMineDrop'], min_subtraits: 1, max_subtraits: 1 },
        subtraits: {},
      }),
    );
    expect(testMiner).toContain('Primary stats');
    expect(testMiner).toContain('Extra traits** · 1 roll');
    expect(testMiner).toContain('does not contain complete numeric definitions');

    const minerThree = content(
      buildRuneComponents({
        ...fixture,
        name: 'Miner Shard III',
        type: 'Pickaxe',
        source: { tier: 3, primary_ids: [], min_subtraits: 2, max_subtraits: 3 },
        roll_fields: [],
        subtraits: {},
      }),
    );
    expect(minerThree).toContain('Extra traits** · 2–3 different rolls');
    expect(minerThree).toContain('does not contain complete numeric definitions');
  });
});
