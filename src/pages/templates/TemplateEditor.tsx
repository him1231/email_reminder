import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Grid, TextField, Typography } from "@mui/material";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/init";
import { renderTemplate } from "../../utils/templateRenderer";

export const TemplateEditor: React.FC = () => {
  const [html, setHtml] = useState("<p>Hi {{name}}</p>\n<p><a href=\"{{unsubscribeUrl}}\">Unsubscribe</a></p>");
  const [subject, setSubject] = useState("Hello {{name}}");
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "templates"), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const preview = renderTemplate(html, { name: "Asha Tan", unsubscribeUrl: "https://example.com/unsubscribe?token=tok-demo-123" });

  const save = async () => {
    await addDoc(collection(db, "templates"), { name: subject, subject, htmlBody: html, placeholders: ["name", "unsubscribeUrl"], createdAt: serverTimestamp() });
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <TextField label="Subject" fullWidth size="small" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ mb: 2 }} />
            <TextField label="HTML body" value={html} onChange={(e) => setHtml(e.target.value)} fullWidth multiline minRows={12} />
            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button variant="contained" onClick={save}>Save template</Button>
            </Box>
          </CardContent>
        </Card>

        <Box mt={2}>
          <Typography variant="subtitle2">Saved templates</Typography>
          {items.map((t) => (
            <Card sx={{ mt: 1 }} key={t.id}><CardContent><Typography>{t.subject}</Typography></CardContent></Card>
          ))}
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>Preview</Typography>
            <div dangerouslySetInnerHTML={{ __html: preview.safeHtml }} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
