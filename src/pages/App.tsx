import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Box, Button, Container, Divider, Stack, Typography, CircularProgress } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { SignInPage } from "./auth/SignInPage";

// Lazy load pages
const StaffList = lazy(() => import('./staff/StaffList').then(m => ({ default: m.StaffList })));
const StaffEdit = lazy(() => import('./staff/StaffEdit').then(m => ({ default: m.StaffEdit })));
const StaffGroups = lazy(() => import('./staff/StaffGroups').then(m => ({ default: m.StaffGroups })));
const TemplateEditor = lazy(() => import('./templates/TemplateEditor').then(m => ({ default: m.TemplateEditor })));
const EmailQueue = lazy(() => import('./email/EmailQueue').then(m => ({ default: m.EmailQueue })));
const ComposeEmail = lazy(() => import('./email/ComposeEmail').then(m => ({ default: m.ComposeEmail })));
const RulesList = lazy(() => import('./rules/RulesList').then(m => ({ default: m.RulesList })));
const RuleEditor = lazy(() => import('./rules/RuleEditor').then(m => ({ default: m.RuleEditor })));

// Lazy-load the dev banner so the main app and tests don't eagerly execute browser-only code.
const DevSetupBanner = lazy(() => import('../components/DevSetupBanner').then(m => ({ default: m.DevSetupBanner })));

function Navigation() {
  const location = useLocation();
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="h6">Email Reminder — Demo</Typography>
      <Divider orientation="vertical" flexItem />
      <Button component={Link} to="/staff" variant={location.pathname === '/staff' ? 'contained' : 'text'}>Staff</Button>
      <Button component={Link} to="/staff-groups" variant={location.pathname === '/staff-groups' ? 'contained' : 'text'}>Staff Groups</Button>
      <Button component={Link} to="/templates" variant={location.pathname === '/templates' ? 'contained' : 'text'}>Templates</Button>
      <Button component={Link} to="/compose" variant={location.pathname === '/compose' ? 'contained' : 'text'}>Compose</Button>
      <Button component={Link} to="/rules" variant={location.pathname.startsWith('/rules') ? 'contained' : 'text'}>Rules</Button>
      <Button component={Link} to="/queue" variant={location.pathname === '/queue' ? 'contained' : 'text'}>Email Queue</Button>
    </Stack>
  );
}

export const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading…</div>;
  if (!user) return <SignInPage />;

  return (
    <HashRouter>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Navigation />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">{user.email}</Typography>
            <Button onClick={() => signOut()}>Sign out</Button>
          </Stack>
        </Stack>

        {/* dev setup banner (appears when required VITE_ vars are missing) */}
        <Box>
          <Suspense fallback={null}>
            <DevSetupBanner />
          </Suspense>
        </Box>

        <Box>
          <Suspense fallback={<CircularProgress />}>
            <Routes>
              <Route path="/" element={<Navigate to="/staff" replace />} />
              <Route path="/staff" element={<StaffList />} />
              <Route path="/staff/:id/edit" element={<StaffEdit />} />
              <Route path="/staff-groups" element={<StaffGroups />} />
              <Route path="/templates" element={<TemplateEditor />} />
              <Route path="/queue" element={<EmailQueue />} />
              <Route path="/compose" element={<ComposeEmail />} />
              <Route path="/rules" element={<RulesList />} />
              <Route path="/rules/new" element={<RuleEditor />} />
              <Route path="/rules/:id/edit" element={<RuleEditor />} />
              <Route path="*" element={<Navigate to="/staff" replace />} />
            </Routes>
          </Suspense>
        </Box>
      </Container>
    </HashRouter>
  );
};
