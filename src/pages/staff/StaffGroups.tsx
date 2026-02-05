import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Grid, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayRemove, getDocs } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/init';

export const StaffGroups: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'staff_groups'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error(err));
    return () => unsub();
  }, []);

  const save = async () => {
    if (!auth.currentUser) return alert('not authenticated');
    try {
      if (editing) {
        await updateDoc(doc(db, 'staff_groups', editing.id), { name, description: desc, updatedAt: serverTimestamp() });
        setEditing(null);
      } else {
        await addDoc(collection(db, 'staff_groups'), { name, description: desc, createdBy: auth.currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setName(''); setDesc(''); setCreating(false);
    } catch (err:any) {
      alert('Unable to save group: ' + err.message);
    }
  };

  const remove = async (g:any) => {
    if (!confirm(`Delete group "${g.name}"? This will remove the group from any staff but will not delete staff records.`)) return;
    try {
      // remove group id from any staff documents
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

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Staff groups</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>New group</Button>
      </Stack>

      {creating && (
        <Card sx={{ mb: 2 }}><CardContent>
          <Stack spacing={2}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="text" onClick={() => { setCreating(false); setName(''); setDesc(''); }}>Cancel</Button>
              <Button variant="contained" onClick={save}>Save</Button>
            </Stack>
          </Stack>
        </CardContent></Card>
      )}

      <Grid container spacing={2}>
        {items.map(g => (
          <Grid item xs={12} sm={6} md={4} key={g.id}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1">{g.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{g.description}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" onClick={() => { setEditing(g); setName(g.name||''); setDesc(g.description||''); setCreating(true); }}><EditIcon fontSize="small"/></IconButton>
                    <IconButton size="small" onClick={() => remove(g)}><DeleteIcon fontSize="small"/></IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
