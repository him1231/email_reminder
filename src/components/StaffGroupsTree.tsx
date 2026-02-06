import React from 'react';
import { Box, IconButton, Stack, Typography, Alert, AlertTitle } from '@mui/material';
// Try to load the MUI tree components; fall back to a lightweight renderer in test / constrained environments
let TreeView: any;
let TreeItem: any;
try {
  const mod = require('@mui/x-tree-view') as any;
  // some environments (jest + typings mismatch) expose the package but not the
  // named React components — guard against that and fall back if missing.
  if (mod && mod.TreeView && mod.TreeItem) {
    TreeView = mod.TreeView;
    TreeItem = mod.TreeItem;
  } else {
    throw new Error('incomplete @mui/x-tree-view');
  }
} catch (err) {
  // fallback implementation used only in tests / constrained dev environments.
  // Provide a fully interactive, accessible disclosure tree so the UI behaves
  // like the real MUI TreeView even when the package can't be resolved.
  const FallbackItem: React.FC<{ nodeId?: string; label: React.ReactNode; children?: React.ReactNode; defaultOpen?: boolean }> = ({ nodeId, label, children, defaultOpen }) => {
    const [open, setOpen] = React.useState(Boolean(defaultOpen));
    const hasChildren = Boolean(children);
    const toggleLabel = nodeId ? `toggle-${nodeId}` : (typeof label === 'string' ? `toggle-${label}` : 'toggle');
    return (
      <div data-testid={nodeId ? `treeitem-${nodeId}` : undefined} style={{ paddingLeft: 8, marginBottom: 6, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}>
          {hasChildren ? (
            <button aria-expanded={open} onClick={() => setOpen(s => !s)} aria-label={toggleLabel} style={{ background: 'none', border: 0, padding: 4, cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none' }}>▸</span>
            </button>
          ) : <span style={{ width: 20 }} />}
          <div style={{ flex: 1 }}>{label}</div>
        </div>
        {hasChildren && open ? <div style={{ marginLeft: 20 }}>{children}</div> : null}
      </div>
    );
  };

  TreeView = ({ children }: any) => <div role="tree">{children}</div>;
  TreeItem = FallbackItem as any;
}
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DndContext, DragOverlay, useDraggable, useDroppable, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// Prefer a synchronous require in Node/jest environments; fall back to dynamic import in the browser dev server.
let buildForestSafeSync: ((items: any[]) => { tree: any[]; cycles: string[] }) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../lib/staffTree') as any;
  if (mod && typeof mod.buildForestSafe === 'function') buildForestSafeSync = mod.buildForestSafe;
} catch (err) {
  buildForestSafeSync = null;
}

type Group = { id: string; name: string; parentId?: string | null; order?: number };

type Props = {
  items: Group[];
  // accept a loose object so callers with richer types (StaffGroup) are supported
  onEdit: (g: any)=>void;
  onDelete: (g: any)=>void;
  onMove: (id: string, newParentId: string|null, newIndex: number)=>Promise<void>;
  /** when true, expand all nodes initially */
  defaultExpandAll?: boolean;
};

export const StaffGroupsTree: React.FC<Props> = ({ items, onEdit, onDelete, onMove, defaultExpandAll = false }) => {
  // If sync loader is available (jest/node), use it for immediate rendering (keeps tests simple).
  // Otherwise perform dynamic import at runtime and render a friendly error/placeholder on failure.
  const [asyncState, setAsyncState] = React.useState<{ tree: any[]; cycles: string[]; loadError?: string | null } | null>(
    buildForestSafeSync ? { tree: buildForestSafeSync(items).tree, cycles: buildForestSafeSync(items).cycles, loadError: null } : null
  );

  React.useEffect(() => {
    if (buildForestSafeSync) return; // already computed synchronously
    let mounted = true;
    (async () => {
      try {
        const mod = await import('../lib/staffTree');
        const res = mod.buildForestSafe(items);
        if (!mounted) return;
        setAsyncState({ tree: res.tree, cycles: res.cycles, loadError: null });
      } catch (err: any) {
        if (!mounted) return;
        setAsyncState({ tree: [], cycles: [], loadError: err?.message || String(err) });
      }
    })();
    return () => { mounted = false; };
  }, [items]);

  const tree = buildForestSafeSync ? buildForestSafeSync(items).tree : (asyncState?.tree || []);
  const cycles = buildForestSafeSync ? buildForestSafeSync(items).cycles : (asyncState?.cycles || []);
  const loadError = asyncState?.loadError ?? null;

  const allIds = items.map(i => i.id);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (loadError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Tree failed to load</AlertTitle>
          The groups tree module failed to initialize: <strong>{String(loadError)}</strong>. The UI is showing a safe, read-only view. Check the console for details.
        </Alert>
        <Box sx={{ p: 1, border: '1px dashed', borderColor: 'divider' }}>
          {items.map(i => (
            <div key={i.id} style={{ padding: 6 }}>{i.name} <span style={{ color: '#666' }}>({i.id})</span></div>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e)=>setActiveId(e.active.id as string)}
      onDragEnd={async (e)=>{
        setActiveId(null);
        const active = e.active.id as string;
        const over = e.over?.id as string | undefined;
        if (!over || active===over) return;
        const overItem = items.find(i=>i.id===over);
        if (!overItem) return;
        const newParentId = overItem.parentId ?? null;
        const siblings = items.filter(i=> (i.parentId||null) === newParentId).sort((a,b)=>(a.order||0)-(b.order||0));
        const overIndex = siblings.findIndex(s=>s.id===over);
        const newIndex = overIndex + 1;
        // guard - moving into/around cyclic nodes should be prevented by caller using wouldCreateCycle
        await onMove(active, newParentId, newIndex);
      }}
    >
      <Box>
        {cycles.length > 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Invalid group relationships detected</AlertTitle>
            Detected <strong>{cycles.length}</strong> group(s) that form a cycle — the tree view excludes these nodes. Please inspect and repair them in the <em>Staff Groups</em> admin. (IDs: {cycles.join(', ')})
          </Alert>
        ) : null}

        <TreeView defaultCollapseIcon={<span>-</span>} defaultExpandIcon={<span>+</span>} defaultExpanded={defaultExpandAll ? allIds : undefined}>
          {tree.map(node=> (
            <TreeNodeDraggable key={node.id} node={node} onEdit={onEdit} onDelete={onDelete} defaultExpandAll={defaultExpandAll} />
          ))}
        </TreeView>
        <DragOverlay>{activeId ? <Box sx={{p:1, bgcolor:'background.paper', border:1}}>{items.find(i=>i.id===activeId)?.name}</Box> : null}</DragOverlay>
      </Box>
    </DndContext>
  );
};

const TreeNode: React.FC<{ node: any; onEdit: any; onDelete: any; defaultExpandAll?: boolean }> = ({ node, onEdit, onDelete, defaultExpandAll }) => {
  return (
    <TreeItem nodeId={node.id} defaultOpen={defaultExpandAll} label={(
      <Box data-testid={`treeitem-${node.id}`} sx={{ width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, py: 1, px: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{width:'100%'}}>
          <Typography>{node.name}</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); onEdit(node); }}><EditIcon fontSize="small"/></IconButton>
            <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); onDelete(node); }}><DeleteIcon fontSize="small"/></IconButton>
          </Stack>
        </Stack>
      </Box>
    )}>
      {node.children.map((c:any)=> <TreeNode key={c.id} node={c} onEdit={onEdit} onDelete={onDelete} defaultExpandAll={defaultExpandAll} />)}
    </TreeItem>
  );
};

const TreeNodeDraggable: React.FC<{ node: any; onEdit: any; onDelete: any; defaultExpandAll?: boolean }> = ({ node, onEdit, onDelete, defaultExpandAll }) => {
  const { attributes, listeners, setNodeRef: setDragRef } = useDraggable({ id: node.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: node.id });

  // Minimal, reversible hide toggle for the visual drag handle. Set to true to hide the handle.
  const hideDragHandle = true;

  return (
    <TreeItem nodeId={node.id} defaultOpen={defaultExpandAll} label={(
      <Box ref={setDropRef} data-testid={`treeitem-${node.id}`} sx={{ width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, py: 1, px: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{width:'100%'}}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {!hideDragHandle && (
              <IconButton size="small" ref={setDragRef as any} {...attributes} {...listeners} aria-label={`drag-${node.id}`}>
                <DragIndicatorIcon fontSize="small" />
              </IconButton>
            )}
            {/* stable marker for tests (MUI may clone/transform label content) */}
            <span data-testid={`drag-handle-marker-${node.id}`} style={{ display: 'none' }} aria-hidden />
            <Typography>{node.name}</Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); onEdit(node); }}><EditIcon fontSize="small"/></IconButton>
            <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); onDelete(node); }}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        </Stack>
      </Box>
    )}>
      {node.children.map((c:any)=> <TreeNodeDraggable key={c.id} node={c} onEdit={onEdit} onDelete={onDelete} defaultExpandAll={defaultExpandAll} />)}
    </TreeItem>
  );
};

export default StaffGroupsTree;
