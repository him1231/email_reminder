export const MAX_TREE_DEPTH = 50;

export type Item = { id: string; parentId?: string | null };

export type TreeNode = Item & { children: TreeNode[] };

// Iterative buildTree to avoid recursion depth issues
export function buildTree(items: Item[]): TreeNode[] {
  const nodesById = new Map<string, TreeNode>();
  items.forEach(it => nodesById.set(it.id, { ...it, children: [] }));

  const roots: TreeNode[] = [];

  for (const it of items) {
    const node = nodesById.get(it.id)!;
    const parentId = it.parentId ?? null;
    if (parentId && nodesById.has(parentId)) {
      // Attach to parent
      const parent = nodesById.get(parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // To avoid very deep trees, we can optionally prune beyond MAX_TREE_DEPTH when rendering
  return roots;
}

// isDescendant: check whether possible descendantId is under ancestorId using iterative traversal and visited set
export function isDescendant(items: Item[], ancestorId: string, descendantId: string): boolean {
  if (ancestorId === descendantId) return true;
  // build parent map
  const childrenMap = new Map<string, string[]>();
  items.forEach(it => {
    const p = it.parentId ?? null;
    if (p) {
      if (!childrenMap.has(p)) childrenMap.set(p, []);
      childrenMap.get(p)!.push(it.id);
    }
  });

  const stack = [ancestorId];
  const visited = new Set<string>();
  let depth = 0;
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (cur === descendantId) return true;
    if (depth++ > MAX_TREE_DEPTH) break;
    const children = childrenMap.get(cur) || [];
    for (const c of children) {
      if (!visited.has(c)) stack.push(c);
    }
  }
  return false;
}

// Simple helper to compute wouldCreateCycle if moving node under newParentId
export function wouldCreateCycle(items: Item[], movingId: string, newParentId: string | null): boolean {
  if (!newParentId) return false;
  if (movingId === newParentId) return true;
  // if newParentId is descendant of movingId, then cycle
  return isDescendant(items, movingId, newParentId);
}
