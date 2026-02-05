import React, { useEffect, useState, useMemo } from 'react';
import { Box, Button, Card, CardContent, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayRemove, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/init';

// dnd-kit
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Group = { id: string; name: string; description?: string; parentId?: string | null; order?: number };

export const StaffGroups: React.FC = () => {
  const [items, setItems] = useState<Group[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  // dnd state
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'staff_groups'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))), (err) => console.error(err));
    return () => unsub();
  }, []);

  const tree = useMemo(() => {
    const map = new Map<string, Group & { children: Group[] }>();
    items.forEach(i => map.set(i.id, { ...i, children: [] } as any));
    const roots: (Group & { children: Group[] })[] = [];
    map.forEach(v => {
      const pid = v.parentId || null;
      if (pid && map.has(pid)) map.get(pid)!.children.push(v);
      else roots.push(v);
    });
    const sortRec = (nodes: any[]) => nodes.sort((a,b)=> (a.order||0)-(b.order||0)).forEach(n=>n.children && sortRec(n.children));
    sortRec(roots);
    return roots;
  }, [items]);

  const [parentId, setParentId] = useState<string | null>(null);

  const save = async () => {
    if (!auth.currentUser) return alert('not authenticated');
    try {
      if (editing) {
        await updateDoc(doc(db, 'staff_groups', editing.id), { name, description: desc, parentId: parentId || null, updatedAt: serverTimestamp() });
        setEditing(null);
      } else {
        // determine order: append to end of siblings
        const siblingsQ = query(collection(db, 'staff_groups'), orderBy('order', 'asc'));
        const snap = await getDocs(siblingsQ);
        // find max order among siblings with same parent
        let maxOrder = -1;
        snap.docs.forEach(d => {
          const data:any = d.data();
          if ((data.parentId || null) === (parentId || null)) {
            if (typeof data.order === 'number' && data.order > maxOrder) maxOrder = data.order;
          }
        });
        const newOrder = maxOrder + 1;
        await addDoc(collection(db, 'staff_groups'), { name, description: desc, parentId: parentId || null, order: newOrder, createdBy: auth.currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setName(''); setDesc(''); setParentId(null); setCreating(false);
    } catch (err:any) {
      alert('Unable to save group: ' + err.message);
    }
  };

  const remove = async (g:Group) => {
    if (!confirm(`Delete group "${g.name}"? This will remove the group from any staff but will not delete staff records.`)) return;
    try {
      const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
      const q = query(collection(db, 'staff'), where('groupIds', 'array-contains', g.id));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { groupIds: arrayRemove(g.id) }));
      await batch.commit();
      await deleteDoc(doc(db, 'staff_groups', g.id));
    } catch (err:any) {
      alert('Unable to delete group: ' + err.message);
    }
  };

  // helpers for dnd
  const findItem = (id: string) => items.find(i => i.id === id);

  const isDescendant = (potentialDescendant: string, ancestorId: string): boolean => {
    const item = items.find(i => i.id === potentialDescendant);
    if (!item) return false;
    if (item.parentId === ancestorId) return true;
    if (!item.parentId) return false;
    return isDescendant(item.parentId as string, ancestorId);
  };

  const getSiblings = (parent: string | null) => items.filter(i => (i.parentId||null) === parent).sort((a,b)=> (a.order||0)-(b.order||0));

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    if (active.id === over.id) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;
    const dragged = findItem(draggedId);
    const target = findItem(targetId);
    if (!dragged || !target) return;

    // prevent circular
    if (isDescendant(targetId, draggedId)) {
      alert('Cannot move parent into its own child');
      return;
    }

    try {
      const batch = writeBatch(db);
      // If dropping onto target -> make dragged child of target (change parent)
      const newParentId = target.id;
      if ((dragged.parentId||null) !== newParentId) {
        // append to end of target's children
        const targetChildren = getSiblings(newParentId);
        const newOrder = targetChildren.length;
        batch.update(doc(db, 'staff_groups', dragged.id), { parentId: newParentId, order: newOrder, updatedAt: serverTimestamp() });
        // if dragged had siblings in old parent, re-sequence them
        const oldSiblings = getSiblings(dragged.parentId || null).filter(s => s.id !== dragged.id);
        oldSiblings.forEach((s, idx) => batch.update(doc(db, 'staff_groups', s.id), { order: idx, updatedAt: serverTimestamp() }));
      } else {
        // same parent -> reorder among siblings based on target position
        const parent = dragged.parentId || null;
        const siblings = getSiblings(parent).filter(s => s.id !== dragged.id);
        // determine target index
        const targetIndex = siblings.findIndex(s => s.id === target.id);
        const newOrderList: Group[] = [];
        // build new ordering inserting dragged before targetIndex (we'll insert at targetIndex)
        siblings.forEach(s => newOrderList.push(s));
        newOrderList.splice(targetIndex, 0, dragged);
        // write sequential orders
        newOrderList.forEach((s, idx) => {
          const id = s.id;
          // if id === dragged.id then update parentId may not change
          batch.update(doc(db, 'staff_groups', id), { order: idx, updatedAt: serverTimestamp() });
        });
      }
      await batch.commit();
    } catch (err:any) {
      console.error(err);
      alert('Unable to reorder: ' + err.message);
    }
  };

  // Sortable wrapper component for TreeItem
  const SortableTreeItem: React.FC<{ node: Group & { children?: Group[] } }> = ({ node }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TreeItem nodeId={node.id} label={(
          <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
            <Box>
              <Typography variant="body1">{node.name}</Typography>
              <Typography variant="caption" color="text.secondary">{node.description}</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <IconButton size="small" onClick={(e:any)=>{ e.stopPropagation(); setEditing(node); setName(node.name||''); setDesc(node.description||''); setParentId(node.parentId||null); setCreating(true); }}><EditIcon fontSize="small"/></IconButton>
              <IconButton size="small" onClick={(e:any)=>{ e.stopPropagation(); remove(node); }}><DeleteIcon fontSize="small"/></IconButton>
            </Stack>
          </Stack>
        )}>
          {node.children?.map(c => <SortableTreeItem key={c.id} node={c as any} />)}
        </TreeItem>
      </div>
    );
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Staff groups</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setCreating(true); setEditing(null); setName(''); setDesc(''); setParentId(null); }}>New group</Button>
      </Stack>

      {creating && (
        <Card sx={{ mb: 2 }}><CardContent>
          <Stack spacing={2}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <TextField select label="Parent group (optional)" value={parentId ?? ''} onChange={(e) => setParentId(e.target.value || null)} SelectProps={{ native: true }}>
              <option value="">Top level</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </TextField>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="text" onClick={() => { setCreating(false); setName(''); setDesc(''); setParentId(null); }}>Cancel</Button>
              <Button variant="contained" onClick={save}>Save</Button>
            </Stack>
            <Button variant="text" color="inherit" onClick={async () => {
              // migration helper: backfill missing parentId/order
              if (!confirm('Run migration to backfill missing parentId/order for all groups?')) return;
              try {
                const { collection, getDocs, writeBatch } = await import('firebase/firestore');
                const snap = await getDocs(collection(db, 'staff_groups'));
                const batch = writeBatch(db);
                snap.docs.forEach((d, idx) => {
                  const data:any = d.data();
                  if (!data.hasOwnProperty('parentId') || data.parentId === undefined) {
                    batch.update(d.ref, { parentId: null, order: idx });
                  }
                });
                await batch.commit();
                alert('Migration complete');
              } catch (err:any) {
                alert('Migration failed: ' + err.message);
              }
            }}>Run migration (backfill parentId/order)</Button>
          </Stack>
        </CardContent></Card>
      )}

      <Card>
        <CardContent>
          <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i=>i.id)} strategy={verticalListSortingStrategy}>
              <TreeView
                defaultCollapseIcon={<ExpandMoreIcon />}
                defaultExpandIcon={<ChevronRightIcon />}
              >
                {tree.map(r => <SortableTreeItem key={r.id} node={r} />)}
              </TreeView>
            </SortableContext>
            <DragOverlay>{activeId ? <Card sx={{p:1}}><Typography>{findItem(activeId)?.name}</Typography></Card> : null}</DragOverlay>
          </DndContext>
        </CardContent>
      </Card>
    </Box>
  );
};
