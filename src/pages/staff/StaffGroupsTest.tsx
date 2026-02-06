import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography, Tooltip, IconButton, Alert } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

// Pragmatic-dnd-backed playground (non-destructive):
// - Uses @atlaskit/pragmatic-drag-and-drop (if available at runtime)
// - Falls back to a simulate button in CI/jsdom

type Item = { id: string; name: string; parentId: string | null; order?: number };

const buildTree = (items: Item[]) => {
  const map = new Map(items.map(i => [i.id, { ...i, children: [] as Item[] }]));
  const roots: any[] = [];
  for (const v of map.values()) {
    if (v.parentId == null) roots.push(v);
    else {
      const p = map.get(v.parentId);
      if (p) p.children.push(v);
      else roots.push(v);
    }
  }
  const sortRec = (arr: any[]) => { arr.sort((a,b)=>(a.order||0)-(b.order||0)); arr.forEach(x=>sortRec(x.children)); };
  sortRec(roots);
  return roots;
};

export const StaffGroupsTest: React.FC = () => {
  const clean: Item[] = [
    { id: 'r1', name: 'Root 1', parentId: null, order: 0 },
    { id: 'a', name: 'A', parentId: 'r1', order: 0 },
    { id: 'b', name: 'B', parentId: 'a', order: 0 },
    { id: 'r2', name: 'Root 2', parentId: null, order: 1 },
  ];
  const cyclic: Item[] = [
    { id: 'x', name: 'X', parentId: 'y', order: 0 },
    { id: 'y', name: 'Y', parentId: 'x', order: 0 },
    { id: 'good', name: 'Good', parentId: null, order: 0 },
  ];

  const [useCyclic, setUseCyclic] = useState(false);
  const [items, setItems] = useState<Item[]>(clean);
  const [expanded, setExpanded] = useState(true);
  const [adapterLoaded, setAdapterLoaded] = useState<boolean | null>(null);
  const handlesRef = useRef(new Map<string, HTMLElement | null>());
  const containersRef = useRef(new Map<string, HTMLElement | null>());
  const disposersRef = useRef<Array<() => void>>([]);

  useEffect(() => setItems(useCyclic ? cyclic : clean), [useCyclic]);

  // try to initialize pragmatic-dnd (optional). Defensive: silently fall back if the package is absent.
  useEffect(() => {
    let mounted = true;
    disposersRef.current.forEach(d => d());
    disposersRef.current = [];

    try {
      // dynamic require so tests/dev that don't install the package won't break
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const adapter = require('@atlaskit/pragmatic-drag-and-drop/element/adapter') as any;
      if (!adapter) throw new Error('adapter not found');

      // register draggables/droppables
      const registered: Array<() => void> = [];

      items.forEach(it => {
        const handle = handlesRef.current.get(it.id);
        const container = containersRef.current.get(it.id);
        if (handle && typeof adapter.draggable === 'function') {
          const dispose = adapter.draggable(handle, { elementId: it.id, getDragData: () => ({ id: it.id }) }) || (() => {});
          registered.push(dispose);
        }
        if (container && typeof adapter.droppable === 'function') {
          const dispose = adapter.droppable(container, {
            elementId: it.id,
            // receive a drop payload from the adapter (shape may vary between versions)
            onDrop: (payload: any) => {
              const srcId = payload?.source?.elementId || payload?.drag?.id || payload?.data?.id;
              const destId = payload?.destination?.elementId || payload?.drop?.id || it.id;
              const index = (payload?.destination?.index ?? payload?.drop?.index) ?? 0;
              if (!srcId) return;
              // perform same in-memory move as the real page's handler
              setItems(prev => {
                const without = prev.filter(x => x.id !== srcId).map(x => ({ ...x }));
                const moving = prev.find(x => x.id === srcId);
                if (!moving) return prev;
                moving.parentId = destId === it.id ? (it.id || null) : moving.parentId;
                const siblings = without.filter(o => (o.parentId ?? null) === (moving.parentId ?? null)).sort((a,b)=>(a.order||0)-(b.order||0));
                siblings.splice(index, 0, moving);
                const siblingIds = siblings.map(s => s.id);
                const updated = without.map(u => {
                  const idx = siblingIds.indexOf(u.id);
                  return idx === -1 ? u : { ...u, order: idx };
                });
                const moved = { ...moving, order: siblingIds.indexOf(moving.id) };
                return updated.filter(u => u.id !== moved.id).concat(moved);
              });
            }
          }) || (() => {});
          registered.push(dispose);
        }
      });

      if (!mounted) return;
      disposersRef.current = registered;
      setAdapterLoaded(true);
    } catch (err) {
      // pragmatic-dnd not installed or initialization failed — fall back to simulate button
      if (mounted) setAdapterLoaded(false);
    }

    return () => {
      mounted = false;
      disposersRef.current.forEach(d => d());
      disposersRef.current = [];
    };
  }, [items]);

  const onMove = async (id: string, newParentId: string | null, newIndex: number) => {
    const without = items.filter(g => g.id !== id).map(g => ({ ...g }));
    const moving = items.find(g => g.id === id);
    if (!moving) return;
    moving.parentId = newParentId;
    const siblings = without.filter(o => (o.parentId ?? null) === (newParentId ?? null)).sort((a,b)=>(a.order||0)-(b.order||0));
    siblings.splice(newIndex, 0, moving);
    const siblingIds = siblings.map(s => s.id);
    const updated = without.map(u => {
      const idx = siblingIds.indexOf(u.id);
      return idx === -1 ? u : { ...u, order: idx };
    });
    const moved = { ...moving, order: siblingIds.indexOf(moving.id) };
    setItems(updated.filter(u => u.id !== moved.id).concat(moved));
  };

  const simulateMove = async () => onMove('a', 'r2', 0);

  const renderNode = (node: Item) => (
    <div key={node.id} style={{ paddingLeft: 8, marginBottom: 6, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}>
        <div
          ref={el => handlesRef.current.set(node.id, el)}
          data-testid={`drag-handle-${node.id}`}
          style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}
          aria-label={`drag-${node.id}`}
          tabIndex={0}
        >
          ≡
        </div>
        <div style={{ flex: 1 }} ref={el => containersRef.current.set(node.id, el)} data-testid={`treeitem-${node.id}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>{node.name}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="small" onClick={() => { /* noop edit */ }}>Edit</Button>
              <Button size="small" onClick={() => { /* noop delete */ }}>Delete</Button>
            </div>
          </div>
        </div>
      </div>
      {expanded ? (
        <div style={{ marginLeft: 20 }}>
          {items.filter(i => i.parentId === node.id).sort((a,b)=>(a.order||0)-(b.order||0)).map(child => renderNode(child))}
        </div>
      ) : null}
    </div>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Staff Groups (test) — pragmatic-dnd</Typography>

      <Stack direction="row" spacing={1} mb={2} alignItems="center">
        <Button variant={useCyclic ? 'outlined' : 'contained'} onClick={() => setUseCyclic(false)}>Clean dataset</Button>
        <Button variant={useCyclic ? 'contained' : 'outlined'} color="warning" onClick={() => setUseCyclic(true)}>Cyclic dataset</Button>

        <Box sx={{ width: 16 }} />
        <Tooltip title="Expand all groups"><IconButton aria-label="Expand all groups" onClick={() => setExpanded(true)} size="small"><UnfoldMoreIcon /></IconButton></Tooltip>
        <Tooltip title="Collapse all groups"><IconButton aria-label="Collapse all groups" onClick={() => setExpanded(false)} size="small"><UnfoldLessIcon /></IconButton></Tooltip>

        <Box sx={{ width: 16 }} />
        <Button data-testid="simulate-move-btn" onClick={simulateMove}>Simulate move A → Root 2</Button>

        <Box sx={{ width: 16 }} />
        {adapterLoaded === null ? null : adapterLoaded ? (
          <Alert severity="success" sx={{ ml: 1, py: 0.5 }}>pragmatic-dnd available</Alert>
        ) : (
          <Alert severity="info" sx={{ ml: 1, py: 0.5 }}>pragmatic-dnd not available — using fallback</Alert>
        )}
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This playground demonstrates pragmatic-drag-and-drop integration. It never writes to Firestore.
          </Typography>

          <div role="tree">
            {buildTree(items).map((r:any) => renderNode(r))}
          </div>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StaffGroupsTest;