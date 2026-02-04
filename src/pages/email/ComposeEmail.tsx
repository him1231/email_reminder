import React, { useEffect, useState } from 'react';
import { Box, Button, Checkbox, CircularProgress, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { collection, getDocs, addDoc, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Mustache from 'mustache';
import { db } from '../../lib/firebase/init';
import StaffSelector from '../../components/StaffSelector';

export const ComposeEmail: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduledForNow, setScheduledForNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<string>(new Date().toISOString().slice(0,16));

  useEffect(() => {
    // load staff
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'staff'));
        const arr: any[] = [];
        snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
        setStaff(arr);
      } catch (e) {
        console.error('failed to load staff', e);
      }
    };
    load();

    const loadTemplates = async () => {
      try {
        const snap = await getDocs(collection(db, 'templates'));
        const arr: any[] = [];
        snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
        setTemplates(arr);
      } catch (e) {
        console.error('failed to load templates', e);
      }
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const t = templates.find(t => t.id === selectedTemplate);
      if (t) {
        // copy template subject/htmlBody into form state so validation and preview work
        setSubject(t.subject || '');
        // support existing templates that may have used 'body' previously
        setBody(t.htmlBody || t.body || '');
      }
    } else {
      // if template cleared, allow manual editing
      setSubject('');
      setBody('');
    }
  }, [selectedTemplate, templates]);

  const handlePreview = () => {
    if (!selected.length) return alert('Select at least one staff to preview');
    const s = staff.find(st => st.id === selected[0]);
    const renderedSubj = Mustache.render(subject, s || {});
    const renderedBody = Mustache.render(body, s || {});
    alert('Preview:\n\nSubject:\n' + renderedSubj + '\n\nBody:\n' + renderedBody);
  };

  const handleSubmit = async () => {
    if (!selected.length) return alert('Select at least one recipient');
    // if a template is selected, subject/body come from template so allow
    if (!selectedTemplate && (!subject || !body)) return alert('Subject and body are required');
    if (saveAsTemplate && !templateName) return alert('Template name required');

    // auth check
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert('Please sign in to schedule emails');
      return;
    }

    setLoading(true);
    try {
      const now = Timestamp.now();
      const sched = scheduledForNow ? now : Timestamp.fromDate(new Date(scheduledAt));

      const batch = writeBatch(db as any);
      const queueCol = collection(db, 'email_queue');

      // if saving template
      if (saveAsTemplate) {
        // use serverTimestamp and htmlBody and createdBy to satisfy Firestore rules
        await addDoc(collection(db, 'templates'), { name: templateName, subject, htmlBody: body, createdAt: serverTimestamp(), createdBy: user.uid });
      }

      for (const id of selected) {
        const st = staff.find(s => s.id === id);
        const rendered_subject = Mustache.render(subject, st || {});
        const rendered_body = Mustache.render(body, st || {});
        const docData = {
          to: st.email,
          subject: rendered_subject,
          body: rendered_body,
          status: 'pending',
          createdAt: now,
          scheduledFor: sched,
          sentAt: null,
          error: null,
        };
        // debug logging to help troubleshoot Firestore rules issues
        console.log('Writing to email_queue:', { user: user.uid, docData });
        try {
          await addDoc(queueCol, docData);
        } catch (writeErr) {
          console.error('Failed to write email_queue doc', writeErr);
          throw writeErr;
        }
      }

      setLoading(false);
      alert(`${selected.length} emails scheduled`);
      // reset
      setSelected([]);
      setSubject('');
      setBody('');
      setSaveAsTemplate(false);
      setTemplateName('');
    } catch (e) {
      console.error('schedule error', e);
      setLoading(false);
      alert('Failed to schedule emails. See console for details.');
    }
  };

  return (
    <Box>
      <Typography variant="h5" mb={2}>Compose Email</Typography>
      <Stack spacing={2}>
        <StaffSelector staff={staff} value={selected} onChange={setSelected} />

        <TextField select fullWidth label="Template" value={selectedTemplate || ''} onChange={(e) => setSelectedTemplate(e.target.value || null)}>
          <MenuItem value="">(none)</MenuItem>
          {templates.map(t => (
            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
          ))}
        </TextField>

        {/* hide manual inputs if template selected */}
        {!selectedTemplate && (
          <>
            <TextField label="Subject" fullWidth value={subject} onChange={e => setSubject(e.target.value)} />
            <TextField label="Body" fullWidth multiline minRows={6} value={body} onChange={e => setBody(e.target.value)} />
            <FormControlLabel control={<Checkbox checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />} label="Save as template" />
            {saveAsTemplate && <TextField label="Template name" value={templateName} onChange={e => setTemplateName(e.target.value)} />}
          </>
        )}

        {/* when a template is selected, hide subject/body fields entirely (template mode) */}
        {selectedTemplate && (
          <></>
        )}

        <FormControlLabel control={<Checkbox checked={scheduledForNow} onChange={e => setScheduledForNow(e.target.checked)} />} label="Send now" />
        {!scheduledForNow && (
          <TextField
            label="Schedule for"
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        )}

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={handlePreview}>Preview</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? <CircularProgress size={20} /> : 'Schedule Email'}</Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ComposeEmail;
