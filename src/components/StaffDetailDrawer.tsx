import React, { useEffect, useState } from 'react';
import { Drawer, Box, Typography, Divider, Stack, IconButton, Switch, Grid, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { doc, onSnapshot, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/init';
import { computeDueDate } from '../utils/dueUtils';

type Props = { open: boolean; staffId: string; onClose: () => void };

export const StaffDetailDrawer: React.FC<Props> = ({ open, staffId, onClose }) => {
  const [staff, setStaff] = useState<any | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open || !staffId) return;
    const ref = doc(db, 'staff', staffId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setStaff(null); return; }
      setStaff({ id: snap.id, ...snap.data() });
    }, (e) => { console.error(e); setStaff(null); });
    return () => unsub();
  }, [open, staffId]);

  useEffect(() => {
    if (!staff) return;
    // load groups by ids stored on staff.groupIds
    const gids: string[] = Array.isArray(staff.groupIds) ? staff.groupIds : [];
    if (gids.length === 0) { setGroups([]); setTasks([]); return; }
    const q = query(collection(db, 'staff_groups')); // we will filter locally
    // onSnapshot for groups
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      const my = docs.filter((d:any)=> gids.includes(d.id));
      setGroups(my as any[]);
    }, (e)=>{ console.error(e); setGroups([]); });

    // load group_tasks where groupId in gids
    (async () => {
      try {
        // Firestore doesn't support 'in' with many items well; if gids length ===1 use where(...,'==') else where 'in'
        let tasksSnap;
        if (gids.length === 1) tasksSnap = await getDocs(query(collection(db, 'group_tasks'), where('groupId', '==', gids[0])));
        else tasksSnap = await getDocs(query(collection(db, 'group_tasks'), where('groupId', 'in', gids.slice(0,10))));
        const tdocs: any[] = tasksSnap.docs.map(d=>({ id:d.id, ...d.data() }));
        setTasks(tdocs);
      } catch (err) { console.error(err); setTasks([]); }
    })();

    return () => unsub();
  }, [staff]);

  const visibleTasks = tasks.filter(t => showAll ? true : !t.completed);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 480, p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Staff details</Typography>
          <IconButton onClick={onClose}><CloseIcon/></IconButton>
        </Stack>
        <Divider sx={{ my: 1 }} />
        {!staff ? (
          <Typography>Loading...</Typography>
        ) : (
          <Box>
            <Typography variant="subtitle1">{staff.name || staff.displayName || 'Unnamed'}</Typography>
            <Typography variant="body2" color="text.secondary">{staff.email}</Typography>
            <Box sx={{ mt:2 }}>
              <Typography variant="subtitle2">Groups</Typography>
              {groups.length===0 ? <Typography color="text.secondary">No groups</Typography> : (
                <Stack spacing={1} sx={{ mt:1 }}>
                  {groups.map(g=> <Typography key={g.id}>{g.name}</Typography>)}
                </Stack>
              )}
            </Box>

            <Box sx={{ mt:2 }}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item><Typography variant="subtitle2">Tasks</Typography></Grid>
                <Grid item sx={{ ml: 'auto' }}>
                  <Typography component="span" sx={{ mr:1 }}>Show completed</Typography>
                  <Switch checked={showAll} onChange={(e)=>setShowAll(e.target.checked)} />
                </Grid>
              </Grid>

              {visibleTasks.length===0 ? <Typography color="text.secondary">No tasks</Typography> : (
                <Stack spacing={1} sx={{ mt:1 }}>
                  {visibleTasks.map(t=> {
                    let dueLabel = '';
                    if (t.type === 'fixed') {
                      const d = (t.due && (t.due.toDate ? t.due.toDate() : (t.due instanceof Date ? t.due : null))) as Date | null;
                      dueLabel = d ? d.toLocaleDateString() : (t.due ? String(t.due) : 'No due date');
                    } else if (t.type === 'relative') {
                      const base = staff?.[t.relative?.field];
                      const computed = computeDueDate(base, t.relative?.value || 0, t.relative?.unit || 'days');
                      if (!base) dueLabel = 'No base date';
                      else dueLabel = computed ? computed.toLocaleDateString() : `${t.relative?.value||0} ${t.relative?.unit||'days'} after ${t.relative?.field}`;
                    }
                    return (
                      <Box key={t.id} sx={{ p:1, border: '1px solid', borderColor: 'divider', borderRadius:1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <Box>
                          <Typography>{t.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{dueLabel}</Typography>
                        </Box>
                        <Box>
                          <IconButton size="small"><EditIcon fontSize="small"/></IconButton>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Box>

            <Box sx={{ mt:2 }}>
              <Button variant="outlined" onClick={()=>{ /* route to edit staff - minimal: open staff doc in console */ console.log('edit staff', staff.id); }}>Edit staff</Button>
            </Box>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default StaffDetailDrawer;
