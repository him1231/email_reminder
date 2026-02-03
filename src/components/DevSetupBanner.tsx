import React from 'react';
import { Alert, AlertTitle, Box, Button, Link, Typography } from '@mui/material';
import { firebaseConfigIsValid } from '../lib/firebase/init';

// Friendly banner shown in dev when required VITE_ Firebase vars are missing.
export const DevSetupBanner: React.FC = () => {
  if (firebaseConfigIsValid) return null;

  const snippet = `# .env.local (local only)\nVITE_FIREBASE_API_KEY=YOUR_WEB_API_KEY\nVITE_FIREBASE_PROJECT_ID=your-project-id\nVITE_FIREBASE_APP_ID=1:123456:web:abcdef`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      // best-effort user feedback via alert (keeps component dependency-free)
      // eslint-disable-next-line no-alert
      alert('Example env copied to clipboard — paste into .env.local and restart the dev server.');
    } catch (err) {
      // ignore — clipboard may be unavailable in some test envs
      // eslint-disable-next-line no-console
      console.warn('clipboard not available', err);
    }
  };

  return (
    <Box mb={2} data-testid="dev-setup-banner">
      <Alert severity="warning" variant="outlined">
        <AlertTitle>Local Firebase config missing</AlertTitle>
        <Typography sx={{ mb: 1 }}>The app requires client Firebase config (VITE_* env vars) to run in the browser.</Typography>
        <Typography component="div" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.9rem', mb: 1 }}>{snippet}</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button size="small" onClick={copy} data-testid="dev-setup-copy">Copy example</Button>
          <Link href="/README.md#local-development---firebase-setup" target="_blank" rel="noreferrer" underline="hover">Setup docs</Link>
        </Box>
      </Alert>
    </Box>
  );
};
