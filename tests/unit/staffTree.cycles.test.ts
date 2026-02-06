import { detectCycles, buildForestSafe } from '../../src/lib/staffTree';

describe('staffTree.detectCycles / buildForestSafe', () => {
  test('detects simple 2-node cycle', () => {
    const items = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: null },
    ];
    const cycles = detectCycles(items as any);
    expect(new Set(cycles)).toEqual(new Set(['a','b']));
    const { tree } = buildForestSafe(items as any);
    // tree should include 'c' only
    expect(tree.map(n => n.id)).toEqual(['c']);
  });

  test('detects self-cycle', () => {
    const items = [{ id: 'x', parentId: 'x' }];
    expect(detectCycles(items as any)).toEqual(['x']);
  });
});