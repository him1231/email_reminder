const { buildTree, isDescendant, wouldCreateCycle, MAX_TREE_DEPTH } = require('../src/lib/staffTree');

// simple test runner
function assert(cond, msg){ if(!cond) { console.error('FAIL:', msg); process.exit(1); } }

const items = [
  { id: 'a', parentId: null },
  { id: 'b', parentId: 'a' },
  { id: 'c', parentId: 'b' },
  { id: 'd', parentId: 'c' },
];

const tree = buildTree(items);
assert(tree.length === 1, 'root count');
assert(tree[0].children.length === 1, 'a->b');

assert(isDescendant(items, 'a', 'd') === true, 'a is ancestor of d');
assert(isDescendant(items, 'b', 'a') === false, 'b not ancestor of a');

// cycle detection
const itemsCycle = [
  { id: '1', parentId: '3' },
  { id: '2', parentId: '1' },
  { id: '3', parentId: '2' },
];
assert(wouldCreateCycle(itemsCycle, '1', '2') === true, 'moving 1 under 2 creates cycle');

console.log('All tests passed');
