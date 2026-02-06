import React, { lazy, Suspense, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Box, Button, Container, Divider, Stack, Typography, CircularProgress, IconButton, Drawer, List, ListItemButton, ListItemText, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
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

function NavigationItems({ onClick }: { onClick?: () => void }) {
  const location = useLocation();
  const items = [
    { to: '/staff', label: 'Staff' },
    { to: '/staff-groups', label: 'Staff Groups' },
    { to: '/templates', label: 'Templates' },
    { to: '/compose', label: 'Compose' },
    { to: '/rules', label: 'Rules' },
    { to: '/queue', label: 'Email Queue' },
  ];

  return (
    <List disablePadding>
      {items.map(i => (
        <ListItemButton
          key={i.to}
          component={Link}
          to={i.to}
          onClick={onClick}
          selected={location.pathname === i.to || (i.to === '/rules' && location.pathname.startsWith('/rules'))}
          sx={{ minHeight: 44, px: 2 }}
        >
          <ListItemText primary={i.label} />
        </ListItemButton>
      ))}
    </List>
  );
}

function Navigation() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);

  if (isSmall) {
    return (
      <>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => setOpen(true)} aria-label="Open menu" sx={{ width: 48, height: 48 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">Email Reminder — Demo</Typography>
        </Stack>
        <Drawer open={open} onClose={() => setOpen(false)}>
          <Box sx={{ width: 280, p: 2 }} role="presentation">
            <Typography variant="h6" sx={{ mb: 1 }}>Menu</Typography>
            <Divider />
            <NavigationItems onClick={() => setOpen(false)} />
          </Box>
        </Drawer>
      </>
    );
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="h6">Email Reminder — Demo</Typography>
      <Divider orientation="vertical" flexItem />
      <NavigationItems />
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
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={{ xs: 2, md: 0 }}>
          <Navigation />
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</Typography>
            <Button onClick={() => signOut()} sx={{ minWidth: 44, height: 44, px: 2 }}>Sign out</Button>
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
