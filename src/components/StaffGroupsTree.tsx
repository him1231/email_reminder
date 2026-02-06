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
  // fallback implementation used only in tests / environments where @mui/x-tree-view
  // isn't available/usable. Keeps DOM structure predictable for unit tests.
  TreeView = ({ children }: any) => <div>{children}</div>;
  TreeItem = ({ label, children }: any) => (
    <div data-testid={typeof label === 'string' ? `treeitem-${label}` : undefined}>
      <div>{label}</div>
      <div>{children}</div>
    </div>
  );
}
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DndContext, DragOverlay } from '@dnd-kit/core';

import { buildForestSafe } from '../lib/staffTree';

type Group = { id: string; name: string; parentId?: string | null; order?: number };

type Props = {
  items: Group[];
  onEdit: (g: Group)=>void;
  onDelete: (g: Group)=>void;
  onMove: (id: string, newParentId: string|null, newIndex: number)=>Promise<void>;
};

export const StaffGroupsTree: React.FC<Props> = ({ items, onEdit, onDelete, onMove }) => {
  const { tree, cycles } = React.useMemo(() => buildForestSafe(items), [items]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  return (
    <DndContext
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

        <TreeView defaultCollapseIcon={<span>-</span>} defaultExpandIcon={<span>+</span>}>
          {tree.map(node=> (
            <TreeNode key={node.id} node={node} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </TreeView>
        <DragOverlay>{activeId ? <Box sx={{p:1, bgcolor:'background.paper', border:1}}>{items.find(i=>i.id===activeId)?.name}</Box> : null}</DragOverlay>
      </Box>
    </DndContext>
  );
};

const TreeNode: React.FC<{ node: any; onEdit: any; onDelete: any }> = ({ node, onEdit, onDelete }) => {
  return (
    <TreeItem nodeId={node.id} label={(
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{width:'100%'}}>
        <Typography>{node.name}</Typography>
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); onEdit(node); }}><EditIcon fontSize="small"/></IconButton>
          <IconButton size="small" onClick={(e)=>{ e.stopPropagation(); onDelete(node); }}><DeleteIcon fontSize="small"/></IconButton>
        </Stack>
      </Stack>
    )}>
      {node.children.map((c:any)=> <TreeNode key={c.id} node={c} onEdit={onEdit} onDelete={onDelete} />)}
    </TreeItem>
  );
};

export default StaffGroupsTree;
