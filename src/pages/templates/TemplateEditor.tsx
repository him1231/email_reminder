import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Grid, TextField, Typography, IconButton, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import DeleteIcon from '@mui/icons-material/Delete';
import { db, auth } from "../../lib/firebase/init";
import { renderTemplate } from "../../utils/templateRenderer";

export const TemplateEditor: React.FC = () => {
  const [html, setHtml] = useState("<p>Hi {{name}}</p>\n<p><a href=\"{{unsubscribeUrl}}\">Unsubscribe</a></p>");
  const [subject, setSubject] = useState("Hello {{name}}");
  const [items, setItems] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('forceLoading') === '1') {
      setLoading(true);
      return () => {};
    }

    const unsub = onSnapshot(
      collection(db, "templates"),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('templates snapshot error', err);
        setError(err?.message || 'Unable to load templates');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const preview = renderTemplate(html, { name: "Asha Tan", unsubscribeUrl: "https://example.com/unsubscribe?token=tok-demo-123" });

  // preview dialog state for saved-template preview action
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>(preview.safeHtml);
  const [previewSubject, setPreviewSubject] = useState<string>(subject);

  const save = async () => {
    if (!auth.currentUser) throw new Error('not-authenticated');
    await addDoc(collection(db, "templates"), { name: subject, subject, htmlBody: html, placeholders: ["name", "unsubscribeUrl"], createdAt: serverTimestamp(), createdBy: auth.currentUser.uid });
  };

  return (
    <Grid container spacing={2} alignItems="stretch">
      <Grid item xs={12} md={12}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="h6">Template</Typography>
          <Stack direction="row" spacing={1}>
            <Button data-testid="add-template-btn" variant="contained" onClick={() => setCreating(true)}>Add template</Button>
          </Stack>
        </Stack>

        {creating && (
          <Card data-testid="template-editor-form" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2} sx={{ height: '100%' }}>
                    <TextField label="Subject" fullWidth size="small" autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} />
                    <TextField label="HTML body" value={html} onChange={(e) => setHtml(e.target.value)} fullWidth multiline minRows={12} sx={{ flex: 1 }} />
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                  <Card variant="outlined" sx={{ flex: 1 }} data-testid="template-preview-inside-form">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>Preview</Typography>
                      <div dangerouslySetInnerHTML={{ __html: preview.safeHtml }} />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>

            <CardContent sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0 }}>
              <Box display="flex" gap={1}>
                <Button onClick={() => setCreating(false)} color="inherit">Cancel</Button>
                <Button variant="contained" onClick={async () => { await save(); setCreating(false); }}>Save template</Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Box mt={2}>
          <Typography variant="subtitle2">Saved templates</Typography>
          {loading && !items.length ? (
            <Card data-testid="templates-list-loading" sx={{ mt: 1 }}>
              <CardContent>
                <Box data-testid="templates-placeholder" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ width: '50%', height: 14, bgcolor: 'action.hover', borderRadius: 1 }} />
                  <Box sx={{ width: '80%', height: 12, bgcolor: 'action.hover', borderRadius: 1 }} />
                </Box>
              </CardContent>
            </Card>
          ) : (
            items.map((t) => (
              <Card sx={{ mt: 1 }} key={t.id}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography>{t.subject}</Typography>

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button data-testid={`preview-template-${t.id}`} size="small" onClick={() => {
                      const rendered = renderTemplate(t.htmlBody || t.html || '', { name: 'Asha Tan', unsubscribeUrl: 'https://example.com/unsubscribe?token=tok-demo-123' });
                      setPreviewHtml(rendered.safeHtml);
                      setPreviewSubject(t.subject || t.name || 'Preview');
                      setPreviewOpen(true);
                    }}>Preview</Button>

                    {auth.currentUser?.uid === t.createdBy && (
                      <IconButton size="small" aria-label={`delete-template-${t.id}`} onClick={async () => {
                        const ok = window.confirm(`Delete template “${t.subject}”?`);
                        if (!ok) return;
                        try {
                          await deleteDoc(doc(db, 'templates', t.id));
                        } catch (err) {
                          console.error('delete template failed', err);
                          alert('Unable to delete template: ' + (err as Error).message);
                        }
                      }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Grid>

      {/* preview dialog for saved templates */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="md"
        data-testid="template-preview-dialog"
        aria-label="template preview dialog"
      >
        <DialogTitle>{previewSubject}</DialogTitle>
        <DialogContent dividers>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};
