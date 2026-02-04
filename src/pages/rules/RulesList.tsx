import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography, Switch, IconButton, Tooltip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/init';
import { formatDistanceToNow } from 'date-fns';

export const RulesList: React.FC = () => {
  const navigate = useNavigate();
  const navigateTo = (path: string) => navigate(path); 
  const [rules, setRules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{open:boolean;id?:string;name?:string}>({open:false});
  // navigation helper available via navigateTo above

  useEffect(() => {
    const rulesRef = collection(db, 'rules');
    const q = query(rulesRef, orderBy('enabled', 'desc'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      setRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });

    const tplRef = collection(db, 'templates');
    const unsubTpl = onSnapshot(tplRef, (snap) => {
      const map: Record<string,string> = {};
      snap.docs.forEach(d => { map[d.id] = d.data().name || d.data().subject || d.id; });
      setTemplates(map);
    });

    return () => { unsub(); unsubTpl(); };
  }, []);

  const toggleEnabled = async (id:string, newValue:boolean) => {
    try {
      await updateDoc(doc(db, 'rules', id), { enabled: newValue });
    } catch (err) { console.error('toggle error', err); }
  };

  const onDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteDoc(doc(db, 'rules', confirmDelete.id));
      setConfirmDelete({open:false});
    } catch (err) { console.error(err); alert('Delete failed: '+(err as Error).message); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Email Rules</Typography>
        <Button variant="contained" onClick={() => navigateTo('/rules/new')}>Create Rule</Button>
      </Stack>

      {loading ? (
        <Card><CardContent sx={{display:'flex',justifyContent:'center'}}><CircularProgress/></CardContent></Card>
      ) : rules.length === 0 ? (
        <Card><CardContent><Typography>No rules yet. Create your first rule!</Typography></CardContent></Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Enabled</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Last Triggered</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map(r => (
                <TableRow key={r.id} hover onClick={() => navigateTo(`/rules/${r.id}/edit`)} sx={{cursor:'pointer'}}>
                  <TableCell onClick={(e)=>e.stopPropagation()}>
                    <Switch checked={!!r.enabled} onChange={(e)=>{ e.stopPropagation(); toggleEnabled(r.id, e.target.checked); }} />
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.trigger?.collection} {r.trigger?.event}</TableCell>
                  <TableCell>{`Template: ${templates[r.emailConfig?.templateId] || r.emailConfig?.templateId || '—'}, Send: +${r.emailConfig?.relativeTime?.value || '?'} ${r.emailConfig?.relativeTime?.unit || ''}`}</TableCell>
                  <TableCell>{r.lastTriggeredAt ? formatDistanceToNow(r.lastTriggeredAt.toDate ? r.lastTriggeredAt.toDate() : new Date(r.lastTriggeredAt), { addSuffix: true }) : 'Never'}</TableCell>
                  <TableCell>
                    {r.lastError ? (
                      <Tooltip title={r.lastError}><span style={{color:'red',display:'inline-flex',alignItems:'center'}}><ErrorOutlineIcon fontSize="small"/> {r.lastError.slice(0,40)}</span></Tooltip>
                    ) : (
                      <span style={{color:'green',display:'inline-flex',alignItems:'center'}}><CheckCircleIcon fontSize="small"/> OK</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e)=>e.stopPropagation()}>
                    <IconButton size="small" onClick={()=>navigateTo(`/rules/${r.id}/edit`)} aria-label="edit"><EditIcon fontSize="small"/></IconButton>
                    <IconButton size="small" onClick={()=>setConfirmDelete({open:true,id:r.id,name:r.name})} aria-label="delete"><DeleteIcon fontSize="small"/></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={confirmDelete.open} onClose={()=>setConfirmDelete({open:false})}>
        <DialogTitle>Delete rule</DialogTitle>
        <DialogContent>Delete “{confirmDelete.name}”? This cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={()=>setConfirmDelete({open:false})}>Cancel</Button>
          <Button color="error" variant="contained" onClick={onDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default RulesList;
