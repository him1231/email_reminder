// Simple Node test to ensure buildTree logic handles cycles without throwing
const MAX_TREE_DEPTH = 100;

function buildTree(items) {
  const map = new Map();
  const roots = [];
  const validItems = items.filter(item => item && item.id && typeof item.id === 'string');
  const sorted = [...validItems].sort((a, b) => (a.order || 0) - (b.order || 0));
  sorted.forEach((item) => {
    if (item.id) {
      map.set(item.id, { ...item, children: [] });
    }
  });

  const wouldCreateCycle = (childId, parentId) => {
    if (!parentId) return false;
    let current = parentId;
    const visited = new Set();
    let depth = 0;
    while (current && depth < MAX_TREE_DEPTH) {
      if (visited.has(current)) return true;
      visited.add(current);
      if (current === childId) return true;
      const parentItem = items.find(i => i.id === current);
      if (!parentItem || !parentItem.parentId) break;
      current = parentItem.parentId;
      depth++;
    }
    return false;
  };

  sorted.forEach((item) => {
    if (!item.id) return;
    const node = map.get(item.id);
    if (item.parentId && map.has(item.parentId) && !wouldCreateCycle(item.id, item.parentId)) {
      map.get(item.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function runTest() {
  const items = [
    { id: 'A', name: 'A', parentId: 'C', order: 0 },
    { id: 'B', name: 'B', parentId: 'A', order: 0 },
    { id: 'C', name: 'C', parentId: 'B', order: 0 },
  ];
  try {
    const tree = buildTree(items);
    console.log('buildTree returned', JSON.stringify(tree, null, 2));
    console.log('OK: no RangeError');
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(2);
  }
}

runTest();
