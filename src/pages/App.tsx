import React, { useState } from "react";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { SignInPage } from "./auth/SignInPage";
import { StaffList } from "./staff/StaffList";
import { TemplateEditor } from "./templates/TemplateEditor";
import { RuleList } from "./rules/RuleList";

export const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [route, setRoute] = useState<"staff" | "templates" | "rules">("staff");

  if (loading) return <div>Loading…</div>;
  if (!user) return <SignInPage />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Email Reminder — Demo</Typography>
          <Divider orientation="vertical" flexItem />
          <Button variant={route === "staff" ? "contained" : "text"} onClick={() => setRoute("staff")}>Staff</Button>
          <Button variant={route === "templates" ? "contained" : "text"} onClick={() => setRoute("templates")}>Templates</Button>
          <Button variant={route === "rules" ? "contained" : "text"} onClick={() => setRoute("rules")}>Rules</Button>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">{user.email}</Typography>
          <Button onClick={() => signOut()}>Sign out</Button>
        </Stack>
      </Stack>

      {/* dev setup banner (appears when required VITE_ vars are missing) */}
      <Box>
        {/* component imported lazily to keep test-time behaviour predictable */}
        <React.Suspense fallback={null}>
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore - conditional import is safe */}
          {require('../components/DevSetupBanner').DevSetupBanner()}
        </React.Suspense>
      </Box>

      <Box>
        {route === "staff" && <StaffList />}
        {route === "templates" && <TemplateEditor />}
        {route === "rules" && <RuleList />}
      </Box>
    </Container>
  );
};
