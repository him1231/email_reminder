const MAX_TREE_DEPTH = 50;

function buildTree(items) {
  const nodesById = new Map();
  items.forEach(it => nodesById.set(it.id, Object.assign({}, it, { children: [] })));
  const roots = [];
  for (const it of items) {
    const node = nodesById.get(it.id);
    const parentId = it.parentId || null;
    if (parentId && nodesById.has(parentId)) {
      const parent = nodesById.get(parentId);
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function isDescendant(items, ancestorId, descendantId) {
  if (ancestorId === descendantId) return true;
  const childrenMap = new Map();
  items.forEach(it => {
    const p = it.parentId || null;
    if (p) {
      if (!childrenMap.has(p)) childrenMap.set(p, []);
      childrenMap.get(p).push(it.id);
    }
  });
  const stack = [ancestorId];
  const visited = new Set();
  let depth = 0;
  while (stack.length > 0) {
    const cur = stack.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (cur === descendantId) return true;
    if (depth++ > MAX_TREE_DEPTH) break;
    const children = childrenMap.get(cur) || [];
    for (const c of children) if (!visited.has(c)) stack.push(c);
  }
  return false;
}

function wouldCreateCycle(items, movingId, newParentId) {
  if (!newParentId) return false;
  if (movingId === newParentId) return true;
  return isDescendant(items, movingId, newParentId);
}

module.exports = { MAX_TREE_DEPTH, buildTree, isDescendant, wouldCreateCycle };
