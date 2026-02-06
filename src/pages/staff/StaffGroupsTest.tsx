import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography, Tooltip, IconButton } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import StaffGroupsTree from '../../components/StaffGroupsTree';

// Small test page to exercise the StaffGroupsTree UI with sample datasets.
export const StaffGroupsTest: React.FC = () => {
  const clean = [
    { id: 'r1', name: 'Root 1', parentId: null, order: 0 },
    { id: 'a', name: 'A', parentId: 'r1', order: 0 },
    { id: 'b', name: 'B', parentId: 'a', order: 0 },
    { id: 'r2', name: 'Root 2', parentId: null, order: 1 },
  ];

  const cyclic = [
    { id: 'x', name: 'X', parentId: 'y', order: 0 },
    { id: 'y', name: 'Y', parentId: 'x', order: 0 },
    { id: 'good', name: 'Good', parentId: null, order: 0 },
  ];

  const [useCyclic, setUseCyclic] = useState(false);
  const [expanded, setExpanded] = useState(true);
  // force remount when expand state changes so uncontrolled TreeView honors defaultExpandAll
  const treeKey = `${expanded ? 'expanded' : 'collapsed'}-${useCyclic ? 'cy' : 'cl'}`;
  const data = useCyclic ? cyclic : clean;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Staff Groups (test)</Typography>
      <Stack direction="row" spacing={1} mb={2}>
        <Button variant={useCyclic ? 'outlined' : 'contained'} onClick={() => setUseCyclic(false)}>Clean dataset</Button>
        <Button variant={useCyclic ? 'contained' : 'outlined'} color="warning" onClick={() => setUseCyclic(true)}>Cyclic dataset</Button>

        <Box sx={{ width: 16 }} />
        <Tooltip title="Expand all groups"><IconButton aria-label="Expand all groups" onClick={() => setExpanded(true)} size="small"><UnfoldMoreIcon /></IconButton></Tooltip>
        <Tooltip title="Collapse all groups"><IconButton aria-label="Collapse all groups" onClick={() => setExpanded(false)} size="small"><UnfoldLessIcon /></IconButton></Tooltip>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This page is a lightweight playground for the staff-groups tree component. It does not mutate Firestore.
          </Typography>
          <StaffGroupsTree key={treeKey} defaultExpandAll={expanded} items={data as any} onEdit={() => {}} onDelete={() => {}} onMove={async () => { /* noop */ }} />
        </CardContent>
      </Card>
    </Box>
  );
};

export default StaffGroupsTest;
