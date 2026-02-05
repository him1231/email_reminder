import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Typography,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

// new TreeView package
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';

// firebase
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayRemove,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/init';

// dnd-kit
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// formik + yup
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

type StaffGroup = {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  order?: number;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
};

type TreeNode = StaffGroup & { children: TreeNode[] };

const buildTree = (items: StaffGroup[]): TreeNode[] => {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  // Filter out any invalid items without proper id
  const validItems = items.filter(item => item && item.id && typeof item.id === 'string');
  const sorted = [...validItems].sort((a, b) => (a.order || 0) - (b.order || 0));
  sorted.forEach((item) => {
    if (item.id) {
      map.set(item.id, { ...item, children: [] } as TreeNode);
    }
  });
  sorted.forEach((item) => {
    if (!item.id) return;
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const isDescendant = (childId: string, ancestorId: string, items: StaffGroup[]): boolean => {
  const item = items.find((i) => i.id === childId);
  if (!item || !item.parentId) return false;
  if (item.parentId === ancestorId) return true;
  return isDescendant(item.parentId, ancestorId, items);
};

export const StaffGroups: React.FC = () => {
  const [items, setItems] = useState<StaffGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<StaffGroup | null>(null);
  const [deleting, setDeleting] = useState<StaffGroup | null>(null);

  // dnd
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  // snack
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' }
  );

  useEffect(() => {
    const q = query(collection(db, 'staff_groups'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Untitled',
          description: data.description,
          parentId: data.parentId || null,
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          updatedAt: data.updatedAt,
        } as StaffGroup;
      }).filter(doc => doc.id); // filter out any items without valid id
      setItems(docs);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setSnack({ open: true, message: 'Unable to load groups', severity: 'error' });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const tree = useMemo(() => buildTree(items), [items]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (g: StaffGroup) => { setEditing(g); setFormOpen(true); };
  const openDelete = (g: StaffGroup) => { setDeleting(g); setConfirmOpen(true); };

  const handleCloseForm = () => setFormOpen(false);
  const handleCloseConfirm = () => { setConfirmOpen(false); setDeleting(null); };

  const saveGroup = async (values: { name: string; description?: string; parentId?: string | null }, helpers: any) => {
    helpers.setSubmitting(true);
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      if (editing) {
        // update
        await updateDoc(doc(db, 'staff_groups', editing.id), { ...values, updatedAt: serverTimestamp() });
        setSnack({ open: true, message: 'Group updated', severity: 'success' });
      } else {
        // create - compute order among siblings
        const snap = await getDocs(query(collection(db, 'staff_groups'), orderBy('order', 'asc')));
        let maxOrder = -1;
        snap.docs.forEach(d => {
          const data:any = d.data();
          if ((data.parentId || null) === (values.parentId || null)) {
            if (typeof data.order === 'number' && data.order > maxOrder) maxOrder = data.order;
          }
        });
        const newOrder = maxOrder + 1;
        await addDoc(collection(db, 'staff_groups'), { ...values, parentId: values.parentId || null, order: newOrder, createdBy: auth.currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        setSnack({ open: true, message: 'Group created', severity: 'success' });
      }
      setFormOpen(false);
    } catch (err:any) {
      console.error(err);
      setSnack({ open: true, message: err.message || 'Save failed', severity: 'error' });
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      // remove group id from staff.groupIds
      const q = query(collection(db, 'staff'), /* where('groupIds', 'array-contains', deleting.id) */);
      // because we imported only top-level helpers previously, we'll fetch with getDocs where needed
      const { where } = await import('firebase/firestore');
      const staffQuery = query(collection(db, 'staff'), where('groupIds', 'array-contains', deleting.id));
      const snap = await getDocs(staffQuery);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.update(d.ref, { groupIds: arrayRemove(deleting.id) }));
      await batch.commit();
      await deleteDoc(doc(db, 'staff_groups', deleting.id));
      setSnack({ open: true, message: 'Group deleted', severity: 'success' });
    } catch (err:any) {
      console.error(err);
      setSnack({ open: true, message: err.message || 'Delete failed', severity: 'error' });
    } finally {
      setConfirmOpen(false);
      setDeleting(null);
    }
  };

  // helpers
  const findItem = (id: string) => items.find(i => i.id === id);
  const getSiblings = (parent: string | null) => items.filter(i => (i.parentId || null) === parent).sort((a,b)=> (a.order||0)-(b.order||0));

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

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
    if (isDescendant(targetId, draggedId, items)) {
      setSnack({ open: true, message: 'Cannot move parent into its own child', severity: 'error' });
      return;
    }
    try {
      const batch = writeBatch(db);
      const newParentId = target.id; // dropping onto target makes it child
      if ((dragged.parentId||null) !== newParentId) {
        const targetChildren = getSiblings(newParentId);
        const newOrder = targetChildren.length;
        batch.update(doc(db, 'staff_groups', dragged.id), { parentId: newParentId, order: newOrder, updatedAt: serverTimestamp() });
        const oldSiblings = getSiblings(dragged.parentId || null).filter(s => s.id !== dragged.id);
        oldSiblings.forEach((s, idx) => batch.update(doc(db, 'staff_groups', s.id), { order: idx, updatedAt: serverTimestamp() }));
      } else {
        const parent = dragged.parentId || null;
        const siblings = getSiblings(parent).filter(s => s.id !== dragged.id);
        const targetIndex = siblings.findIndex(s => s.id === target.id);
        const newOrderList: StaffGroup[] = [];
        siblings.forEach(s => newOrderList.push(s));
        newOrderList.splice(targetIndex, 0, dragged);
        newOrderList.forEach((s, idx) => batch.update(doc(db, 'staff_groups', s.id), { order: idx, updatedAt: serverTimestamp() }));
      }
      await batch.commit();
      setSnack({ open: true, message: 'Reordered', severity: 'success' });
    } catch (err:any) {
      console.error(err);
      setSnack({ open: true, message: err.message || 'Reorder failed', severity: 'error' });
    }
  };

  // Sortable wrapper for TreeItem
  const SortableTreeNode: React.FC<{ node: TreeNode }> = ({ node }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      borderRadius: 8,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TreeItem
          nodeId={node.id}
          label={(
            <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
              <Stack direction="row" alignItems="center" spacing={1}>
                <FolderIcon color="primary" />
                <Box>
                  <Typography variant="body1">{node.name}</Typography>
                  {node.description ? <Typography variant="caption" color="text.secondary">{node.description}</Typography> : null}
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Edit"><IconButton size="small" onClick={(e:any)=>{ e.stopPropagation(); openEdit(node); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" onClick={(e:any)=>{ e.stopPropagation(); openDelete(node); }}><DeleteIcon fontSize="small"/></IconButton></Tooltip>
              </Stack>
            </Stack>
          )}
        >
          {node.children.map(c => <SortableTreeNode key={c.id} node={c} />)}
        </TreeItem>
      </div>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Staff Groups</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Create Group</Button>
      </Stack>

      {loading ? (
        <Card>
          <CardContent>
            <Skeleton variant="rectangular" height={300} />
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent>
            <Stack alignItems="center" spacing={2} py={6}>
              <MoreHorizIcon fontSize="large" color="disabled" />
              <Typography>No groups yet</Typography>
              <Button variant="contained" onClick={openCreate}>Create your first group</Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map(i=>i.id)} strategy={verticalListSortingStrategy}>
                <SimpleTreeView defaultExpandAll>
                  {tree.map(r => <SortableTreeNode key={r.id} node={r} />)}
                </SimpleTreeView>
              </SortableContext>
              <DragOverlay>{activeId ? (<Card sx={{ p: 1 }}><Typography>{findItem(activeId)?.name}</Typography></Card>) : null}</DragOverlay>
            </DndContext>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Group' : 'Create Group'}</DialogTitle>
        <Formik
          initialValues={{ name: editing?.name || '', description: editing?.description || '', parentId: editing?.parentId || null }}
          enableReinitialize
          validationSchema={Yup.object({ name: Yup.string().required('Required').min(2, 'Too short') })}
          onSubmit={(vals, helpers) => saveGroup(vals, helpers)}
        >
          {({ values, handleChange, isSubmitting, touched, errors, setFieldValue }) => (
            <Form>
              <DialogContent dividers>
                <Stack spacing={2}>
                  <TextField name="name" label="Name" value={values.name} onChange={handleChange} error={Boolean(touched.name && errors.name)} helperText={touched.name && errors.name} fullWidth />
                  <TextField name="description" label="Description" value={values.description} onChange={handleChange} fullWidth />

                  <TextField select label="Parent (optional)" name="parentId" value={values.parentId ?? ''} onChange={(e)=>{ const v = e.target.value || null; setFieldValue('parentId', v); }} fullWidth>
                    <MenuItem value="">Top level</MenuItem>
                    {items.filter(i => i.id !== editing?.id).map(i => (
                      <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseForm} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={confirmOpen} onClose={handleCloseConfirm}>
        <DialogTitle>Delete group</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleting?.name}</strong>? This will remove the group from any staff.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirm}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={()=>setSnack(s=>({ ...s, open:false }))}>
        <Alert severity={snack.severity} onClose={()=>setSnack(s=>({ ...s, open:false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};
