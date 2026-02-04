import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Grid, IconButton, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, onSnapshot, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/init';

export const EmailQueue: React.FC = () => {
  const [pending, setPending] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const qPending = query(collection(db, 'email_queue'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubP = onSnapshot(qPending, (snap) => setPending(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error(err));
    const qHistory = query(collection(db, 'email_queue'), where('status', '!=', 'pending'), orderBy('createdAt', 'desc'));
    const unsubH = onSnapshot(qHistory, (snap) => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error(err));
    return () => { unsubP(); unsubH(); };
  }, []);

  return (
    <Box>
      <Typography variant="h6">Email Queue</Typography>
      <Box mt={2}>
        <Typography variant="subtitle1">Pending</Typography>
        <Grid container spacing={2}>
          {pending.map(e => (
            <Grid item xs={12} key={e.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography>{e.to}</Typography>
                      <Typography variant="body2" color="text.secondary">{e.subject}</Typography>
                      <Typography variant="caption" color="text.secondary">Created: {e.createdAt?.toDate ? e.createdAt.toDate().toString() : String(e.createdAt)}</Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={async () => {
                        if (!confirm('Delete this queued email?')) return;
                        try { await deleteDoc(doc(db, 'email_queue', e.id)); } catch (err) { console.error(err); alert('Delete failed: ' + (err as Error).message); }
                      }}><DeleteIcon /></IconButton>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box mt={3}>
        <Typography variant="subtitle1">Sent / Failed history</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {history.map(e => (
            <Grid item xs={12} key={e.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography>{e.to}</Typography>
                      <Typography variant="body2" color="text.secondary">{e.subject}</Typography>
                      <Typography variant="caption" color="text.secondary">Status: {e.status} {e.sentAt?.toDate ? `• Sent: ${e.sentAt.toDate().toString()}` : ''}</Typography>
                      {e.error && <Typography variant="caption" color="error">Error: {e.error}</Typography>}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};
