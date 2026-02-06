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
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

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

// formik + yup
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

// components
import StaffGroupsTree from '../../components/StaffGroupsTree';

// TODO: Temporary change — render a flat/raw list of staff groups instead of the recursive tree
// This avoids recursion/loops in production data. Revert this change once the cycle issue is fixed and tree rendering is safe.

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

const sgLog = (...args: any[]) => {
  try {
    const ts = new Date().toISOString();
    // include unique marker [SG-LOG] for easy searching
    // eslint-disable-next-line no-console
    console.debug(`[SG-LOG] ${ts}`, ...args);
  } catch (e) {
    // ignore logging errors
  }
};

export const StaffGroups: React.FC = () => {
  const [items, setItems] = useState<StaffGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<StaffGroup | null>(null);
  const [deleting, setDeleting] = useState<StaffGroup | null>(null);

  // snack
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' | 'info' }>(
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
      sgLog('onSnapshot loaded docs', docs.map(d=>d.id));
      setItems(docs);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setSnack({ open: true, message: 'Unable to load groups', severity: 'error' });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (g: StaffGroup) => { setEditing(g); setFormOpen(true); };
  const openDelete = (g: StaffGroup) => { setDeleting(g); setConfirmOpen(true); };

  const handleCloseForm = () => setFormOpen(false);
  const handleCloseConfirm = () => { setConfirmOpen(false); setDeleting(null); };

  // visual/testing helpers: control tree expansion (remount to honor uncontrolled defaultExpanded)
  const [expanded, setExpanded] = useState(true);
  const treeKey = `${expanded ? 'expanded' : 'collapsed'}-${items.length}`;

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


  const handleMove = async (id: string, newParentId: string|null, newIndex: number) => {
    try {
      const batch = writeBatch(db);
      const snap = await getDocs(query(collection(db, 'staff_groups'), orderBy('order', 'asc')));
      const docs = snap.docs.map(d=>({ id: d.id, ref: d.ref, data: d.data() }));
      const targetDoc = docs.find(d=>d.id===id);
      if (!targetDoc) return;
      const siblings = docs.filter(d=> (d.data.parentId || null) === newParentId && d.id !== id).sort((a,b)=>(a.data.order||0)-(b.data.order||0));
      siblings.splice(newIndex, 0, { id, ref: targetDoc.ref, data: { ...targetDoc.data } });
      siblings.forEach((s, idx)=> batch.update(s.ref, { order: idx }));
      batch.update(targetDoc.ref, { parentId: newParentId, updatedAt: serverTimestamp() });
      await batch.commit();
      setSnack({ open:true, message:'Group moved', severity:'success' });
    } catch (e:any) { console.error(e); setSnack({ open:true, message:e.message||'Move failed', severity:'error' }); }
  };

  // simple flat rendering (temporary)
  const renderFlatList = () => {
    return (
      <Stack spacing={1}>
        {items.map(i => (
          <Box key={i.id} sx={{ p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1">{i.name} <Typography component="span" variant="caption" color="text.secondary">(id: {i.id})</Typography></Typography>
                <Typography variant="body2" color="text.secondary">Parent: {i.parentId ?? 'Top level'} • Order: {i.order ?? 0}</Typography>
                {i.description ? <Typography variant="caption" color="text.secondary">{i.description}</Typography> : null}
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Edit"><IconButton size="small" onClick={()=>openEdit(i)}><EditIcon fontSize="small"/></IconButton></Tooltip>
                <Tooltip title="Delete"><IconButton size="small" onClick={()=>openDelete(i)}><DeleteIcon fontSize="small"/></IconButton></Tooltip>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Stack direction="row" spacing={1}>
            <Typography variant="h4">Staff Groups</Typography>
            <Tooltip title="Expand all groups"><IconButton aria-label="Expand all groups" onClick={() => setExpanded(true)} size="small"><UnfoldMoreIcon /></IconButton></Tooltip>
            <Tooltip title="Collapse all groups"><IconButton aria-label="Collapse all groups" onClick={() => setExpanded(false)} size="small"><UnfoldLessIcon /></IconButton></Tooltip>
          </Stack>
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
            {/* Tree view (safe) — use the shared StaffGroupsTree. Keep flat list helper available as fallback. */}
            <StaffGroupsTree key={treeKey} defaultExpandAll={expanded} items={items} onEdit={openEdit} onDelete={openDelete} onMove={handleMove} />
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
