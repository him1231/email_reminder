import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Grid, IconButton, Stack, TextField, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase/init";
import { StaffForm } from "./StaffForm";

export const StaffList: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "staff"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
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
        {visible.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.id}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Typography variant="subtitle1">{s.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{s.staffNo} • {s.email}</Typography>
                    <Typography variant="caption" color="text.secondary">Contract: {s.contractEffectiveDate?.toDate ? s.contractEffectiveDate.toDate().toISOString().slice(0,10) : s.contractEffectiveDate}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {!visible.length && (
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
