import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert, IconButton, Skeleton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { Formik, Form } from 'formik';
import * as Yup from 'yup';

import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/init';

type GroupTask = {
  id: string;
  title: string;
  description?: string;
  groupId: string;
  dueType?: 'fixed' | 'relative';
  dueDate?: any; // timestamp|null for fixed
  // when dueType === 'relative' store a compact specification to evaluate per-staff
  relative?: { field: string; value: number; unit: 'days'|'weeks'|'months'|'years' } | null;
  completed?: boolean;
  createdAt?: any;
  createdBy?: string;
};


export const GroupTasks: React.FC = () => {
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupTask | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<GroupTask | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' }
  );

  // fields available on a staff record that can be used as a base time for relative due dates
  const RELATIVE_BASE_FIELDS = [ 'contractEffectiveDate', 'contractEndDate' ];


  useEffect(() => {
    const qg = query(collection(db, 'staff_groups'), orderBy('order', 'asc'));
    const unsubG = onSnapshot(qg, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).name || 'Untitled' })));
    }, (err) => { console.error(err); });

    const qt = query(collection(db, 'group_tasks'), orderBy('createdAt', 'desc'));
    const unsubT = onSnapshot(qt, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as GroupTask[];
      setTasks(docs);
      setLoading(false);
    }, (err) => { console.error(err); setSnack({ open: true, message: 'Unable to load tasks', severity: 'error' }); setLoading(false); });

    return () => { unsubG(); unsubT(); };
  }, []);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: GroupTask) => { setEditing(t); setFormOpen(true); };
  const openDelete = (t: GroupTask) => { setDeleting(t); setConfirmOpen(true); };

  const saveTask = async (values: any, helpers: any) => {
    helpers.setSubmitting(true);
    try {
      if (!auth.currentUser) throw new Error('not-authenticated');

      // Normalize client values so Firestore rules receive a consistent shape:
      // - empty date string -> null
      // - ensure `completed` is boolean
      // - require a non-empty groupId (client should validate, but guard here too)
      const payload: any = {
        title: values.title,
        description: values.description || null,
        groupId: values.groupId,
        completed: typeof values.completed === 'boolean' ? values.completed : false,
      };

      if (values.dueType === 'fixed') {
        payload.dueType = 'fixed';
        payload.dueDate = values.dueDate ? new Date(values.dueDate) : null;
        payload.relative = null;
      } else if (values.dueType === 'relative' && values.relativeField) {
        payload.dueType = 'relative';
        payload.dueDate = null;
        payload.relative = { field: values.relativeField, value: Number(values.relativeValue) || 0, unit: values.relativeUnit };
      } else {
        // guard: default to fixed if relative not properly provided
        payload.dueType = 'fixed';
        payload.dueDate = null;
        payload.relative = null;
      }

      if (!payload.groupId) throw new Error('Group is required');

      if (editing) {
        await updateDoc(doc(db, 'group_tasks', editing.id), { ...payload, updatedAt: serverTimestamp() });
        setSnack({ open: true, message: 'Task updated', severity: 'success' });
      } else {
        await addDoc(collection(db, 'group_tasks'), { ...payload, createdBy: auth.currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        setSnack({ open: true, message: 'Task created', severity: 'success' });
      }
      setFormOpen(false);
    } catch (err:any) {
      console.error(err);
      // surface permission errors with a clearer message for debugging
      if (err?.code === 'permission-denied' || /permission/i.test(err?.message || '')) {
        setSnack({ open: true, message: 'Permission denied — check group selection and authentication', severity: 'error' });
      } else {
        setSnack({ open: true, message: err?.message || 'Save failed', severity: 'error' });
      }
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteDoc(doc(db, 'group_tasks', deleting.id));
      setSnack({ open: true, message: 'Task deleted', severity: 'success' });
    } catch (err:any) {
      console.error(err);
      setSnack({ open: true, message: err?.message || 'Delete failed', severity: 'error' });
    } finally {
      setConfirmOpen(false);
      setDeleting(null);
    }
  };

  const GroupName = ({ id }: { id: string }) => {
    const g = groups.find(s => s.id === id);
    return <>{g ? g.name : <em>Unknown group</em>}</>;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Group Tasks</Typography>
        <Button data-testid="add-task-btn" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Create Task</Button>
      </Stack>

      {loading ? (
        <Card><CardContent><Skeleton variant="rectangular" height={220} /></CardContent></Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent>
            <Stack alignItems="center" spacing={2} py={6}>
              <Typography>No tasks yet</Typography>
              <Button variant="contained" onClick={openCreate}>Create your first task</Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              {tasks.map(t => (
                <Box key={t.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{t.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        <GroupName id={t.groupId} /> • {t.dueType === 'relative' ? `${t.relative?.value || ''} ${t.relative?.unit || ''} after ${t.relative?.field || ''}` : (t.dueDate ? String(t.dueDate).slice(0,10) : 'No due date')}
                      </Typography>
                      {t.description ? <Typography variant="body2" color="text.secondary">{t.description}</Typography> : null}
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" aria-label={`edit-${t.id}`} onClick={() => openEdit(t)}><EditIcon fontSize="small"/></IconButton>
                      <IconButton size="small" aria-label={`delete-${t.id}`} onClick={() => openDelete(t)}><DeleteIcon fontSize="small"/></IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Task' : 'Create Task'}</DialogTitle>
        <Formik
          enableReinitialize
          initialValues={{
            title: editing?.title || '',
            description: editing?.description || '',
            groupId: editing?.groupId || (groups[0]?.id || ''),
            dueDate: editing?.dueDate ? (editing.dueDate as any).toDate ? (editing.dueDate as any).toDate().toISOString().slice(0,10) : editing.dueDate : '',
            dueType: editing?.dueType || 'fixed',
            relativeField: editing?.relative?.field || '',
            relativeValue: editing?.relative?.value ?? 0,
            relativeUnit: editing?.relative?.unit || 'days'
          }}
          validationSchema={Yup.object({ title: Yup.string().required('Required'), groupId: Yup.string().required('Group is required') })}
          onSubmit={(vals, helpers) => saveTask(vals, helpers)}
        >
          {({ values, handleChange, isSubmitting }) => (
            <Form data-testid="task-form">
              <DialogContent dividers>
                <Stack spacing={2}>
                  <TextField name="title" label="Title" value={values.title} onChange={handleChange} fullWidth />
                  <TextField name="description" label="Description" value={values.description} onChange={handleChange} fullWidth multiline rows={3} />
                  <TextField select label="Group" name="groupId" value={values.groupId} onChange={handleChange} fullWidth>
                    {groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                  </TextField>

                  <TextField select label="Due type" name="dueType" value={values.dueType} onChange={handleChange} fullWidth>
                    <MenuItem value="fixed">Fixed date</MenuItem>
                    <MenuItem value="relative">Relative to staff field</MenuItem>
                  </TextField>

                  {values.dueType === 'fixed' ? (
                    <TextField name="dueDate" label="Due date" type="date" value={values.dueDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
                  ) : (
                    <Stack direction="row" spacing={2}>
                      <TextField select label="Base field" name="relativeField" value={values.relativeField} onChange={handleChange} fullWidth>
                        <MenuItem value="">-- select field --</MenuItem>
                        {RELATIVE_BASE_FIELDS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                      </TextField>
                      <TextField name="relativeValue" label="Offset" type="number" value={values.relativeValue} onChange={handleChange} />
                      <TextField select label="Unit" name="relativeUnit" value={values.relativeUnit} onChange={handleChange}>
                        <MenuItem value="days">days</MenuItem>
                        <MenuItem value="weeks">weeks</MenuItem>
                        <MenuItem value="months">months</MenuItem>
                        <MenuItem value="years">years</MenuItem>
                      </TextField>
                    </Stack>
                  )}

                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setFormOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete task</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleting?.title}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};
