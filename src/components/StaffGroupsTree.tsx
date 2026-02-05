import React from 'react';
import { TreeView, TreeItem } from '@mui/x-tree-view';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDroppable, useDraggable, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';

type Group = { id: string; name: string; parentId?: string | null; order?: number };

type Props = {
  items: Group[];
  onEdit: (g: Group)=>void;
  onDelete: (g: Group)=>void;
  onMove: (id: string, newParentId: string|null, newIndex: number)=>Promise<void>;
};

const buildTree = (items: Group[]) => {
  const map = new Map<string, Group & { children: Group[] }>();
  items.forEach(i => map.set(i.id, { ...i, children: [] }));
  const roots: (Group & { children: Group[] })[] = [];
  map.forEach(v => {
    if (v.parentId) {
      const p = map.get(v.parentId);
      if (p) p.children.push(v);
      else roots.push(v);
    } else roots.push(v);
  });
  const sortRec = (arr: (Group & { children: Group[] })[]) => {
    arr.sort((a,b)=> (a.order||0)-(b.order||0));
    arr.forEach(x=>sortRec(x.children));
  };
  sortRec(roots);
  return roots;
};

export const StaffGroupsTree: React.FC<Props> = ({ items, onEdit, onDelete, onMove }) => {
  const tree = React.useMemo(()=>buildTree(items), [items]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  return (
    <DndContext
      onDragStart={(e)=>setActiveId(e.active.id as string)}
      onDragEnd={async (e)=>{
        setActiveId(null);
        const active = e.active.id as string;
        const over = e.over?.id as string | undefined;
        if (!over || active===over) return;
        // simple: place as sibling after 'over' in same parent
        const overItem = items.find(i=>i.id===over);
        if (!overItem) return;
        const newParentId = overItem.parentId ?? null;
        // compute index among siblings
        const siblings = items.filter(i=> (i.parentId||null) === newParentId).sort((a,b)=>(a.order||0)-(b.order||0));
        const overIndex = siblings.findIndex(s=>s.id===over);
        const newIndex = overIndex + 1;
        await onMove(active, newParentId, newIndex);
      }}
    >
      <Box>
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
