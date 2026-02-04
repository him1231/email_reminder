import React, { useState } from "react";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { SignInPage } from "./auth/SignInPage";
import { StaffList } from "./staff/StaffList";
import { TemplateEditor } from "./templates/TemplateEditor";
import { RuleList } from "./rules/RuleList";
const EmailQueue = React.lazy(() => import('./email/EmailQueue').then(m => ({ default: m.EmailQueue })));
const ComposeEmail = React.lazy(() => import('./email/ComposeEmail').then(m => ({ default: m.ComposeEmail })));



// Lazy-load the dev banner so the main app and tests don't eagerly execute browser-only code.
const DevSetupBanner = React.lazy(() => import('../components/DevSetupBanner').then(m => ({ default: m.DevSetupBanner })));

export const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [route, setRoute] = useState<"staff" | "templates" | "rules" | "emails" | "compose">("staff");

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
          <Button variant={route === "compose" ? "contained" : "text"} onClick={() => setRoute("compose")}>Compose</Button>
          <Button variant={route === "rules" ? "contained" : "text"} onClick={() => setRoute("rules")}>Rules</Button>
          <Button variant={route === "emails" ? "contained" : "text"} onClick={() => setRoute("emails")}>Email Queue</Button>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2">{user.email}</Typography>
          <Button onClick={() => signOut()}>Sign out</Button>
        </Stack>
      </Stack>

      {/* dev setup banner (appears when required VITE_ vars are missing) */}
      <Box>
        <React.Suspense fallback={null}>
          <DevSetupBanner />
        </React.Suspense>
      </Box>

      <Box>
        {route === "staff" && <StaffList />}
        {route === "templates" && <TemplateEditor />}
        {route === "compose" && (
          <React.Suspense fallback={<div>Loading…</div>}>
            <ComposeEmail />
          </React.Suspense>
        )}
        {route === "rules" && <RuleList />}
        {route === "emails" && (
          <React.Suspense fallback={<div>Loading…</div>}>
            <EmailQueue />
          </React.Suspense>
        )}
      </Box>
    </Container>
  );
};
