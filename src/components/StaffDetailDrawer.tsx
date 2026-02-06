import React, { useEffect, useState } from 'react';
import { Drawer, Box, Typography, Stack, Divider, IconButton, Switch, FormControlLabel, List, ListItem, ListItemText } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/init';
import { computeDueDate } from '../utils/dueUtils';

type Props = { open: boolean; staffId: string; onClose: () => void };

const StaffDetailDrawer: React.FC<Props> = ({ open, staffId, onClose }) => {
  const [staff, setStaff] = useState<any | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!staffId) return;
    const unsub = onSnapshot(doc(db, 'staff', staffId), (snap) => {
      const data = snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null;
      setStaff(data);
    }, (err) => { console.error('staff drawer snapshot', err); setStaff(null); });
    return () => unsub();
  }, [staffId]);

  useEffect(() => {
    if (!staff) return;
    // load groups (assumes staff has groupIds array)
    const gid = staff.groupIds || [];
    if (!gid.length) { setGroups([]); return; }
    const q = query(collection(db, 'staff_groups'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setGroups(all.filter(g => gid.includes(g.id)));
    });
    return () => unsub();
  }, [staff]);

  useEffect(() => {
    if (!staff) return;
    const gid = staff.groupIds || [];
    if (!gid.length) { setTasks([]); return; }
    // Firestore 'in' supports up to 10 values; do a simple request for up to 10
    const chunk = gid.slice(0,10);
    (async () => {
      try {
        const q = query(collection(db, 'group_tasks'), where('groupId', 'in', chunk));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setTasks(docs);
      } catch (err) {
        console.error('load group tasks for staff', err);
        setTasks([]);
      }
    })();
  }, [staff]);

  const visibleTasks = tasks.filter(t => showCompleted ? true : !t.completed);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 420, p: 2 }} role="dialog" aria-label="Staff details">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Staff details</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Divider sx={{ my: 1 }} />
        {!staff ? (
          <Typography>Loading…</Typography>
        ) : (
          <Box>
            <Typography variant="subtitle1">{staff.name}</Typography>
            <Typography variant="body2" color="text.secondary">{staff.email}</Typography>

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Groups</Typography>
            {groups.length ? (
              <Stack spacing={1} sx={{ mb: 1 }}>
                {groups.map(g => <Typography key={g.id} variant="body2">{g.name}</Typography>)}
              </Stack>
            ) : <Typography variant="body2" color="text.secondary">No groups</Typography>}

            <Divider sx={{ my: 1 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2">Tasks</Typography>
              <FormControlLabel control={<Switch checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />} label="Show completed" />
            </Stack>

            <List>
              {visibleTasks.map(t => {
                const dueLabel = t.dueType === 'fixed' ? (t.dueDate ? (t.dueDate.toDate ? t.dueDate.toDate().toISOString().slice(0,10) : String(t.dueDate)) : 'No due date') : (() => {
                  const base = staff[t.relative?.field];
                  const computed = computeDueDate(base, t.relative?.value || 0, t.relative?.unit || 'days');
                  return computed ? computed.toISOString().slice(0,10) : 'No base date';
                })();
                return (
                  <ListItem key={t.id} secondaryAction={<IconButton edge="end" aria-label="edit" onClick={() => console.log('edit task', t.id)}><EditIcon /></IconButton>}>
                    <ListItemText primary={t.title} secondary={t.dueType ? `${t.dueType} • ${dueLabel}` : dueLabel} />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default StaffDetailDrawer;
