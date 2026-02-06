import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Tooltip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

/**
 * StaffGroupsDnd — experimental page that demonstrates a production-ready
 * tree view wired to @atlaskit/pragmatic-drag-and-drop (element adapter).
 *
 * - Optional runtime integration with pragmatic-dnd (dynamic require)
 * - In-memory preview of moves (non-destructive)
 * - "Commit changes" button to persist moves (noop by default — implement with Firestore)
 *
 * This page is intentionally conservative: the DnD wiring is enabled only
 * when the adapter is available at runtime; otherwise the UI still works
 * with a deterministic "Simulate move" and client-side preview.
 */

type Item = { id: string; name: string; parentId: string | null; order?: number };

const SAMPLE: Item[] = [
  { id: 'r1', name: 'Root 1', parentId: null, order: 0 },
  { id: 'a', name: 'A', parentId: 'r1', order: 0 },
  { id: 'b', name: 'B', parentId: 'a', order: 0 },
  { id: 'r2', name: 'Root 2', parentId: null, order: 1 },
];

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

export const StaffGroupsDnd: React.FC = () => {
  const [items, setItems] = useState<Item[]>(SAMPLE);
  const [expanded, setExpanded] = useState(true);
  const [adapterAvailable, setAdapterAvailable] = useState<boolean | null>(null);
  const [previewChanges, setPreviewChanges] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);

  const handlesRef = useRef(new Map<string, HTMLElement | null>());
  const containersRef = useRef(new Map<string, HTMLElement | null>());
  const disposersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    // attempt to wire pragmatic-dnd element adapter if present
    let mounted = true;
    disposersRef.current.forEach(d => d());
    disposersRef.current = [];

    try {
      // dynamic require — optional dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const adapter = require('@atlaskit/pragmatic-drag-and-drop/element/adapter') as any;
      const regs: Array<() => void> = [];
      let registeredAny = false;

      items.forEach(it => {
        const handle = handlesRef.current.get(it.id);
        const container = containersRef.current.get(it.id);

        // draggable: support both signatures (object-style and (el, opts))
        if (handle && typeof adapter?.draggable === 'function') {
          try {
            const maybeDispose = adapter.draggable(handle, { elementId: it.id, getDragData: () => ({ id: it.id }) });
            if (typeof maybeDispose === 'function') regs.push(maybeDispose);
            registeredAny = true;
          } catch (e) {
            // try object-style
            try {
              const maybeDispose = adapter.draggable({ element: handle, elementId: it.id, getDragData: () => ({ id: it.id }) });
              if (typeof maybeDispose === 'function') regs.push(maybeDispose);
              registeredAny = true;
            } catch (err) { /* ignore */ }
          }
        }

        // droppable: support both dropTargetForElements and droppable
        if (container) {
          if (typeof adapter?.dropTargetForElements === 'function') {
            try {
              const d = adapter.dropTargetForElements({ element: container, elementId: it.id, onDrop: (p: any) => {
                const src = p?.source?.elementId || p?.drag?.id || p?.data?.id;
                const dest = p?.destination?.elementId || p?.drop?.id || it.id;
                const index = (p?.destination?.index ?? p?.drop?.index) ?? 0;
                if (!src) return;
                moveInMemory(src, dest === it.id ? dest : null, index);
              } }) || (() => {});
              regs.push(d);
              registeredAny = true;
            } catch (e) { /* ignore */ }
          } else if (typeof adapter?.droppable === 'function') {
            try {
              const d = adapter.droppable(container, { elementId: it.id, onDrop: (p: any) => {
                const src = p?.source?.elementId || p?.drag?.id || p?.data?.id;
                const dest = p?.destination?.elementId || p?.drop?.id || it.id;
                const index = (p?.destination?.index ?? p?.drop?.index) ?? 0;
                if (!src) return;
                moveInMemory(src, dest === it.id ? dest : null, index);
              } }) || (() => {});
              regs.push(d);
              registeredAny = true;
            } catch (e) { /* ignore */ }
          }
        }
      });

      if (!mounted) return;
      disposersRef.current = regs;
      setAdapterAvailable(registeredAny);
    } catch (err) {
      setAdapterAvailable(false);
    }

    return () => {
      mounted = false;
      disposersRef.current.forEach(d => d());
      disposersRef.current = [];
    };
  }, [items]);

  const moveInMemory = (id: string, newParentId: string | null, newIndex: number) => {
    setItems(prev => {
      const without = prev.filter(g => g.id !== id).map(g => ({ ...g }));
      const moving = prev.find(g => g.id === id);
      if (!moving) return prev;
      moving.parentId = newParentId;
      const siblings = without.filter(o => (o.parentId ?? null) === (newParentId ?? null)).sort((a,b)=>(a.order||0)-(b.order||0));
      siblings.splice(newIndex, 0, moving);
      const siblingIds = siblings.map(s => s.id);
      const updated = without.map(u => {
        const idx = siblingIds.indexOf(u.id);
        return idx === -1 ? u : { ...u, order: idx };
      });
      const moved = { ...moving, order: siblingIds.indexOf(moving.id) };
      return updated.filter(u => u.id !== moved.id).concat(moved);
    });
    setPreviewChanges(true);
  };

  const simulateMove = async () => moveInMemory('a', 'r2', 0);

  const applyChangesToFirestore = async () => {
    // placeholder: real implementation should compute minimal writeBatch and commit
    // For safety the page only exposes the UI; writes must be confirmed by the admin.
    // Here we just close the dialog and mark preview as committed.
    setCommitOpen(false);
    setPreviewChanges(false);
    // TODO: implement server write using existing handleMove logic
    // e.g. call an exported helper that performs batched updates in Firestore
  };

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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h4">Staff Groups (dnd)</Typography>
          <Tooltip title="Expand all groups"><IconButton aria-label="Expand all groups" onClick={() => setExpanded(true)} size="small"><UnfoldMoreIcon /></IconButton></Tooltip>
          <Tooltip title="Collapse all groups"><IconButton aria-label="Collapse all groups" onClick={() => setExpanded(false)} size="small"><UnfoldLessIcon /></IconButton></Tooltip>
          <Button data-testid="simulate-move-btn" onClick={simulateMove}>Simulate move A → Root 2</Button>
          {adapterAvailable === null ? null : adapterAvailable ? (
            <Alert severity="success" sx={{ ml: 1, py: 0.5 }}>pragmatic-dnd enabled</Alert>
          ) : (
            <Alert severity="info" sx={{ ml: 1, py: 0.5 }}>pragmatic-dnd not present — using fallback</Alert>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" disabled={!previewChanges} onClick={() => setCommitOpen(true)}>Commit changes</Button>
        </Stack>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Experimental DnD tree using pragmatic-drag-and-drop (core). This UI only previews changes locally; use "Commit changes" to persist to Firestore (not enabled by default).
          </Typography>

          <div role="tree">
            {buildTree(items).map(r => renderNode(r))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={commitOpen} onClose={() => setCommitOpen(false)}>
        <DialogTitle>Commit changes</DialogTitle>
        <DialogContent>
          <Typography>Apply the in-memory ordering/parent changes to Firestore?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommitOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={applyChangesToFirestore}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffGroupsDnd;
