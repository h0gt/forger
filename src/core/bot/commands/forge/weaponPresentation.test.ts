import { expect, test } from 'bun:test';
import { weaponLocationComponents } from './weaponPresentation';

test('weapons without forge locations never produce an empty Discord select', () => {
  const components = weaponLocationComponents([]);
  expect(components).toHaveLength(1);
  expect(components[0]).toHaveProperty('content');
});

test('weapon locations are deduplicated and limited to Discord option limits', () => {
  const components = weaponLocationComponents(['Guild Island', 'Guild Island']);
  expect((components[0] as any).components[0].options).toHaveLength(1);
});
