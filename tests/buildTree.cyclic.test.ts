import { buildTree } from '../src/pages/staff/StaffGroups';

test('buildTree handles cycles without throwing', () => {
  // Create malformed items with a cycle A -> B -> C -> A
  const items: any[] = [
    { id: 'A', name: 'A', parentId: 'C', order: 0, createdAt: null, createdBy: 'x' },
    { id: 'B', name: 'B', parentId: 'A', order: 0, createdAt: null, createdBy: 'x' },
    { id: 'C', name: 'C', parentId: 'B', order: 0, createdAt: null, createdBy: 'x' },
  ];

  expect(() => buildTree(items)).not.toThrow(RangeError);
  const tree = buildTree(items);
  // Should return something (treat as roots or skip)
  expect(Array.isArray(tree)).toBe(true);
});
