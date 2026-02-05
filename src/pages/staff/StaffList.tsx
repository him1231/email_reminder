import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Grid, IconButton, Stack, TextField, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase/init";
import { StaffForm } from "./StaffForm";

export const StaffList: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test/dev override: allow forcing a loading state via URL param (e.g. ?forceLoading=1)
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('forceLoading') === '1') {
      setLoading(true);
      // return a no-op unsubscribe so the component doesn't try to read Firestore in CI snapshots
      return () => {};
    }

    const q = query(collection(db, "staff"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('staff list snapshot error', err);
        setError(err?.message || 'Unable to load staff');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const visible = items.filter((i) => i.name?.toLowerCase().includes(filter.toLowerCase()) || i.email?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" mb={2} spacing={2}>
        <TextField label="Search staff" size="small" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ width: 320 }} />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreating(true)}>Add staff</Button>
        </Stack>
      </Stack>

      {creating && <Card sx={{ mb: 2 }}><CardContent><StaffForm onClose={() => setCreating(false)} /></CardContent></Card>}

      <Grid container spacing={2}>
        {loading && !items.length ? (
          <Grid item xs={12} data-testid="staff-list-loading">
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Loading staff…</Typography>
                <Box sx={{ mt: 1, display: 'grid', gap: 1 }}>
                  {[1,2,3].map((n) => (
                    <Box key={n} data-testid={`staff-placeholder-${n}`} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'action.hover' }} />
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ width: '40%', height: 12, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5 }} />
                        <Box sx={{ width: '60%', height: 10, bgcolor: 'action.hover', borderRadius: 1 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          visible.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Box>
                      <Typography variant="subtitle1">{s.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.staffNo} • {s.email}</Typography>
                      <Typography variant="caption" color="text.secondary">Contract: {s.contractEffectiveDate?.toDate ? s.contractEffectiveDate.toDate().toISOString().slice(0,10) : s.contractEffectiveDate}</Typography>
                    </Box>
                    <Box>
                      <Button size="small" onClick={async () => {
                        try {
                          // Add an email document to the Firestore queue collection
                          const payload = {
                            to: s.email,
                            subject: 'Test Email from Email Reminder',
                            body: `Hello ${s.name},\n\nThis is a test email added to the queue from the Email Reminder demo.`,
                            status: 'pending',
                            createdAt: new Date(),
                            scheduledFor: new Date(),
                            sentAt: null,
                            error: null,
                          } as any;
                          // use addDoc to write to 'email_queue'
                          const { addDoc, collection } = await import('firebase/firestore');
                          await addDoc(collection(db, 'email_queue'), payload);
                          alert('Email added to queue.');
                        } catch (err) {
                          console.error('add to queue failed', err);
                          alert('Unable to add email to queue: ' + (err as Error).message);
                        }
                      }}>Add to queue</Button>

                      <Button size="small" onClick={() => window.location.hash = `#/staff/${s.id}/edit`}>Edit</Button>

                      {auth.currentUser?.uid === s.createdBy && (
                        <IconButton aria-label="delete-staff" size="small" onClick={async () => {
                          const ok = window.confirm(`Delete staff “${s.name}”? This cannot be undone.`);
                          if (!ok) return;
                          try {
                            await deleteDoc(doc(db, 'staff', s.id));
                          } catch (err) {
                            console.error('delete staff failed', err);
                            alert('Unable to delete staff: ' + (err as Error).message);
                          }
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}

        {!visible.length && !loading && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">No staff found. Use the "Add staff" button to create a new record.</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
