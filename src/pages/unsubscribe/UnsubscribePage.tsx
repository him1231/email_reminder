import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/init";

export const UnsubscribePage: React.FC = () => {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setMessage("Missing token");
      setStatus("error");
      return;
    }

    (async () => {
      setStatus("working");
      try {
        const tokenRef = doc(db, "unsubscribeTokens", token);
        await runTransaction(db, async (tx) => {
          const tSnap = await tx.get(tokenRef);
          if (!tSnap.exists()) throw new Error("Invalid or expired token");
          const tokenDoc = tSnap.data() as any;
          if (tokenDoc.used) throw new Error("Token already used");
          if (tokenDoc.expiresAt && tokenDoc.expiresAt.toMillis && tokenDoc.expiresAt.toMillis() < Date.now()) throw new Error("Token expired");

          const suppressionRef = doc(db, "suppressions", tokenDoc.email);
          tx.set(suppressionRef, { email: tokenDoc.email, reason: "user_unsubscribe", createdAt: serverTimestamp() });
          tx.update(tokenRef, { used: true });
        });

        setStatus("done");
        setMessage("You have been unsubscribed.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || "Unable to unsubscribe");
      }
    })();
  }, []);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <Card sx={{ width: 520 }}>
        <CardContent>
          {status === "working" && <Box display="flex" alignItems="center" gap={2}><CircularProgress size={20} /> <Typography>Processing unsubscribe…</Typography></Box>}
          {status === "done" && <Typography>{message}</Typography>}
          {status === "error" && <Typography color="error">{message}</Typography>}
          <Box mt={2}><Button href="/">Return to app</Button></Box>
        </CardContent>
      </Card>
    </Box>
  );
};
