import React from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";

export const RuleList: React.FC = () => {
  return (
    <Box>
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography variant="h6">Rules (Phase‑1 — manual)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Rules are saved but automatic scheduling is deferred to Phase‑2. Use manual send for now.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};
