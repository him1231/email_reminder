import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Grid, IconButton, MenuItem, Select, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase/init";
import { renderTemplate } from "../../utils/templateRenderer";
import { ManualSendButton } from "../../components/ManualSendButton";
import { TemplatePreview } from "../../components/TemplatePreview";

export const RuleList: React.FC = () => {
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // editor form state
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [tag, setTag] = useState("");
  const [state, setState] = useState<'manual' | 'draft'>('manual');

  // preview dialog for saved-rule preview action
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('Preview');

  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('forceLoading') === '1') {
      setLoading(true);
      return () => {};
    }

    const unsubTpl = onSnapshot(collection(db, 'templates'), (snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});

    const unsub = onSnapshot(collection(db, 'rules'), (snap) => {
      setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('rules snapshot error', err);
      setLoading(false);
    });

    return () => { unsub(); unsubTpl(); };
  }, []);

  const resetForm = () => { setName(''); setTemplateId(''); setTag(''); setState('manual'); };

  const save = async () => {
    if (!auth.currentUser) throw new Error('not-authenticated');
    await addDoc(collection(db, 'rules'), {
      name,
      templateId,
      filter: { tag: tag || undefined },
      state,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid,
    });
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Rules (Phase‑1 — manual)</Typography>
              <Button data-testid="add-rule-btn" variant="contained" onClick={() => setCreating(true)}>Add rule</Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Rules are saved but automatic scheduling is deferred to Phase‑2. Use manual send for now.
            </Typography>
          </CardContent>
        </Card>

        {creating && (
          <Card data-testid="rule-editor-form">
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <TextField label="Rule name" value={name} onChange={(e) => setName(e.target.value)} size="small" fullWidth autoFocus />
                    <TextField label="Tag (filter)" value={tag} onChange={(e) => setTag(e.target.value)} size="small" fullWidth placeholder="e.g. beta-users" />
                    <Select value={templateId} onChange={(e) => setTemplateId(String(e.target.value))} displayEmpty size="small">
                      <MenuItem value="">Select template</MenuItem>
                      {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.subject || t.name}</MenuItem>)}
                    </Select>
                    <Select value={state} onChange={(e) => setState(e.target.value as any)} size="small">
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="draft">Draft</MenuItem>
                    </Select>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Template preview</Typography>
                  {templateId ? (
                    <TemplatePreview safeHtml={renderTemplate((templates.find(t=>t.id===templateId)?.htmlBody)||'', { name: 'Asha', unsubscribeUrl: 'https://example.com/unsubscribe?token=tok-demo-123' }).safeHtml} />
                  ) : (
                    <Card sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary">Select a template to preview</Typography>
                    </Card>
                  )}
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button color="inherit" onClick={() => { setCreating(false); resetForm(); }}>Cancel</Button>
                <Button variant="contained" onClick={async () => { await save(); setCreating(false); resetForm(); }}>Save rule</Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Box>
          <Typography variant="subtitle2">Saved rules</Typography>

          {loading && !rules.length ? (
            <Card data-testid="rules-list-loading" sx={{ mt: 1 }}>
              <CardContent>
                <Box data-testid="rules-placeholder" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ width: '40%', height: 14, bgcolor: 'action.hover', borderRadius: 1 }} />
                  <Box sx={{ width: '70%', height: 12, bgcolor: 'action.hover', borderRadius: 1 }} />
                </Box>
              </CardContent>
            </Card>
          ) : (
            rules.map((r) => (
              <Card sx={{ mt: 1 }} key={r.id}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography>{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.filter?.tag ? `tag: ${r.filter.tag}` : 'all'}</Typography>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" onClick={() => {
                      const tpl = templates.find(t => t.id === r.templateId);
                      const rendered = renderTemplate(tpl?.htmlBody || tpl?.html || '', { name: 'Asha Tan', unsubscribeUrl: 'https://example.com/unsubscribe?token=tok-demo-123' });
                      setPreviewHtml(rendered.safeHtml);
                      setPreviewSubject(tpl?.subject || tpl?.name || 'Preview');
                      setPreviewOpen(true);
                    }} data-testid={`preview-rule-${r.id}`}>Preview</Button>

                    {/* Manual send: demo only — pick first matching recipient for UI */}
                    <ManualSendButton templateHtml={(templates.find(t=>t.id===r.templateId)?.htmlBody) || ''} subject={(templates.find(t=>t.id===r.templateId)?.subject) || 'No subject'} recipient={{ name: 'Asha Tan', email: 'asha@example.com' }} />

                    {auth.currentUser?.uid === r.createdBy && (
                      <IconButton size="small" onClick={async () => {
                        const ok = window.confirm(`Delete rule “${r.name}”?`);
                        if (!ok) return;
                        try { await deleteDoc(doc(db, 'rules', r.id)); } catch (err) { console.error(err); alert('Unable to delete: '+(err as Error).message); }
                      }} aria-label={`delete-rule-${r.id}`}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Box>

        {/* preview dialog for saved-rule preview action */}
        <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} fullWidth maxWidth="md" data-testid="rule-preview-dialog" aria-label="rule preview dialog">
          <DialogTitle>{previewSubject}</DialogTitle>
          <DialogContent dividers>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

      </Stack>
    </Box>
  );
};
