import React from "react";
import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from "../../hooks/useAuth";

export const SignInPage: React.FC = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="76vh">
      <Card sx={{ width: 420 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Sign in</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>Sign in with Google to manage staff and templates.</Typography>
          <Button startIcon={<GoogleIcon />} variant="outlined" fullWidth onClick={() => signInWithGoogle()}>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
