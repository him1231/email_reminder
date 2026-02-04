import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Grid, TextField, Typography, Switch, FormControl, InputLabel, Select, MenuItem, RadioGroup, FormControlLabel, Radio, Checkbox, Stack, Dialog, DialogTitle, DialogContent, DialogActions, FormHelperText } from '@mui/material';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/init';
import { useNavigate, useParams } from 'react-router-dom';

// Field schemas for collections
const COLLECTION_SCHEMAS: any = {
  staff: {
    fields: [
      'name', 'email', 'contractEffectiveDate', 'contractEndDate',
      'status', 'department', 'createdAt', 'updatedAt'
    ],
    dateFields: ['contractEffectiveDate', 'contractEndDate', 'createdAt', 'updatedAt'],
    triggerableFields: ['contractEffectiveDate', 'contractEndDate', 'status', 'department'] // Fields that commonly change
  },
  // Add more collections as needed
};

export const RuleEditor: React.FC = () => {
  const { id } = useParams();
  const isNew = id === 'new' || !id;
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [collectionName, setCollectionName] = useState('staff');
  const [eventType, setEventType] = useState<'created'|'updated'>('created');
  const [triggerField, setTriggerField] = useState('');

  const [hasCondition, setHasCondition] = useState(false);
  const [condField, setCondField] = useState('');
  const [condOp, setCondOp] = useState('==');
  const [condValue, setCondValue] = useState('');

  const [templateId, setTemplateId] = useState('');
  const [recipientField, setRecipientField] = useState('email');
  const [useTriggeredStaff, setUseTriggeredStaff] = useState(false);
  const [hasBcc, setHasBcc] = useState(false);
  const [bccRecipients, setBccRecipients] = useState('');
  const [relativeValue, setRelativeValue] = useState<number | ''>(3);
  const [relativeUnit, setRelativeUnit] = useState<'days'|'weeks'|'months'|'years'>('days');
  const [baseTimeField, setBaseTimeField] = useState('createdAt');

  const [tracking, setTracking] = useState<any>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(()=>{
    const unsubTpl = onSnapshot(collection(db,'templates'), snap=>{
      setTemplates(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    });

    if (!isNew) {
      (async ()=>{
        const d = await getDoc(doc(db,'rules',id!));
        if (d.exists()) {
          const data:any = d.data();
          setName(data.name||'');
          setEnabled(data.enabled!==false);
          setCollectionName(data.trigger?.collection||'staff');
          setEventType(data.trigger?.event||'created');
          setTriggerField(data.trigger?.field||'');
          if (data.condition) { setHasCondition(true); setCondField(data.condition.field || ''); setCondOp(data.condition.operator || '=='); setCondValue(String(data.condition.value || '')); }
          setTemplateId(data.emailConfig?.templateId || '');
          setRecipientField(data.emailConfig?.recipientField || 'email');
          setUseTriggeredStaff(Boolean(data.emailConfig?.useTriggeredStaff));
          setHasBcc(Boolean(data.emailConfig?.bcc));
          setBccRecipients(typeof data.emailConfig?.bcc === 'string' ? data.emailConfig.bcc : '');
          setRelativeValue(data.emailConfig?.relativeTime?.value || 3);
          setRelativeUnit(data.emailConfig?.relativeTime?.unit || 'days');
          setBaseTimeField(data.emailConfig?.baseTimeField || 'createdAt');
          setTracking({ lastTriggeredAt: data.lastTriggeredAt || null, lastTriggeredStaff: data.lastTriggeredStaff || [], lastError: data.lastError });
        }
        setLoading(false);
      })();
    } else {
      setLoading(false);
    }

    return ()=>{ unsubTpl(); };
  }, [id]);

  const validate = ()=>{
    if (!name.trim()) return 'Name is required';
    if (!collectionName) return 'Collection is required';
    if (!eventType) return 'Event is required';
    if (!templateId) return 'Template is required';
    if (!useTriggeredStaff && !recipientField.trim()) return 'Recipient field is required';
    if (!relativeValue || Number(relativeValue) <= 0) return 'Relative time must be > 0';
    if (!baseTimeField.trim()) return 'Base time field is required';
    // optional: basic BCC format check
    if (hasBcc && bccRecipients.trim()) {
      const parts = bccRecipients.split(',').map(s=>s.trim()).filter(Boolean);
      const invalid = parts.some(p=>!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p));
      if (invalid) return 'One or more BCC addresses look invalid';
    }
    return null;
  };

  const onSave = async ()=>{
    const err = validate();
    if (err) return alert(err);
    if (!auth.currentUser) return alert('Not authenticated');
    setSubmitting(true);

    const payload:any = {
      name: name.trim(),
      enabled,
      trigger: { collection: collectionName, event: eventType, ...(eventType==='updated' && triggerField ? { field: triggerField } : {}) },
      emailConfig: { templateId, recipientField: recipientField || 'email', useTriggeredStaff, bcc: hasBcc ? bccRecipients : undefined, relativeTime: { value: Number(relativeValue), unit: relativeUnit }, baseTimeField },
    };
    if (hasCondition) payload.condition = { field: condField, operator: condOp, value: condValue };

    try {
      if (isNew) {
        await addDoc(collection(db,'rules'), { ...payload, lastTriggeredAt: serverTimestamp(), lastTriggeredStaff: [], createdAt: serverTimestamp(), createdBy: auth.currentUser.uid });
      } else {
        await updateDoc(doc(db,'rules',id!), payload);
      }
      navigate('/rules');
    } catch (e) { console.error(e); alert('Save failed: '+(e as Error).message); }
    setSubmitting(false);
  };

  const onResetTracking = async ()=>{
    if (!id) return;
    setResetConfirmOpen(false);
    try { await updateDoc(doc(db,'rules',id), { lastTriggeredAt: null, lastTriggeredStaff: [] }); setTracking({ lastTriggeredAt: null, lastTriggeredStaff: [] }); alert('Tracking reset'); }
    catch(e){ console.error(e); alert('Reset failed: '+(e as Error).message); }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{isNew ? 'Create Rule' : 'Edit Rule'}</Typography>
      </Stack>

      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Rule Name" value={name} onChange={(e)=>setName(e.target.value)} fullWidth required />
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack direction="row" alignItems="center" spacing={1}><Typography>Enabled</Typography><Switch checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} /></Stack>
            </Grid>

            <Grid item xs={12}><Typography variant="subtitle1">Trigger</Typography></Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Collection</InputLabel>
                <Select value={collectionName} label="Collection" onChange={(e)=>setCollectionName(String(e.target.value))}>
                  <MenuItem value="staff">staff</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl>
                <RadioGroup row value={eventType} onChange={(e)=>setEventType(e.target.value as any)}>
                  <FormControlLabel value="created" control={<Radio />} label="Created" />
                  <FormControlLabel value="updated" control={<Radio />} label="Updated" />
                </RadioGroup>
              </FormControl>
            </Grid>
            {eventType === 'updated' && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Field to Monitor (optional)</InputLabel>
                  <Select
                    value={triggerField}
                    onChange={(e)=>setTriggerField(String(e.target.value))}
                    label="Field to Monitor (optional)"
                  >
                    <MenuItem value=""><em>Any field change</em></MenuItem>
                    {COLLECTION_SCHEMAS[collectionName]?.triggerableFields?.map((field:string)=> (
                      <MenuItem key={field} value={field}>{field}</MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Leave empty to trigger on any update, or select a specific field</FormHelperText>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}><Typography variant="subtitle1">Condition (optional)</Typography></Grid>
            <Grid item xs={12}>
              <FormControlLabel control={<Checkbox checked={hasCondition} onChange={(e)=>setHasCondition(e.target.checked)} />} label="Add condition" />
            </Grid>
            {hasCondition && (
              <>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Condition Field</InputLabel>
                    <Select value={condField} onChange={(e)=>setCondField(String(e.target.value))}>
                      {COLLECTION_SCHEMAS[collectionName]?.fields?.map((field:string)=> (
                        <MenuItem key={field} value={field}>{field}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Operator</InputLabel>
                    <Select value={condOp} onChange={(e)=>setCondOp(String(e.target.value))}>
                      <MenuItem value="==">equals (==)</MenuItem>
                      <MenuItem value="!=">not equals (!=)</MenuItem>
                      <MenuItem value=">">greater than (&gt;)</MenuItem>
                      <MenuItem value="<">less than (&lt;)</MenuItem>
                      <MenuItem value=">=">greater or equal (&gt;=)</MenuItem>
                      <MenuItem value="<=">less or equal (&lt;=)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Value" value={condValue} onChange={(e)=>setCondValue(e.target.value)} fullWidth />
                </Grid>
              </>
            )}

            <Grid item xs={12}><Typography variant="subtitle1">Email Configuration</Typography></Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Template</InputLabel>
                <Select value={templateId} label="Template" onChange={(e)=>setTemplateId(String(e.target.value))}>
                  <MenuItem value="">Select template</MenuItem>
                  {templates.map(t=> <MenuItem key={t.id} value={t.id}>{t.subject || t.name || t.id}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>

            {/* Smart recipient mode: only for staff collection */}
            {collectionName === 'staff' && (
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useTriggeredStaff}
                      onChange={(e)=>{
                        setUseTriggeredStaff(e.target.checked);
                        if (e.target.checked) setRecipientField('email');
                      }}
                    />
                  }
                  label="Send to triggered staff member"
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField label="Recipient Field" value={recipientField} onChange={(e)=>setRecipientField(e.target.value)} placeholder="email" fullWidth required disabled={useTriggeredStaff} helperText={useTriggeredStaff ? 'Will use the email of the staff member who triggered this rule' : 'Field containing recipient email address'} />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={<Checkbox checked={hasBcc} onChange={(e)=>setHasBcc(e.target.checked)} />}
                label="Add BCC recipients (optional)"
              />
              {hasBcc && (
                <TextField fullWidth margin="normal" label="BCC Recipients" value={bccRecipients} onChange={(e)=>setBccRecipients(e.target.value)} placeholder="email1@example.com, email2@example.com" helperText="Comma-separated email addresses for BCC" />
              )}
            </Grid>

            <Grid item xs={12} md={4}><TextField type="number" label="Send After" value={relativeValue} onChange={(e)=>setRelativeValue(e.target.value === '' ? '' : Number(e.target.value))} fullWidth /></Grid>
            <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Unit</InputLabel><Select value={relativeUnit} label="Unit" onChange={(e)=>setRelativeUnit(e.target.value as any)}><MenuItem value="days">days</MenuItem><MenuItem value="weeks">weeks</MenuItem><MenuItem value="months">months</MenuItem><MenuItem value="years">years</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Base Time Field</InputLabel>
                <Select value={baseTimeField} onChange={(e)=>setBaseTimeField(String(e.target.value))}>
                  {COLLECTION_SCHEMAS[collectionName]?.dateFields?.map((field:string)=> (
                    <MenuItem key={field} value={field}>{field}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>Date field to calculate send time from</FormHelperText>
              </FormControl>
            </Grid>

            {!isNew && (
              <Grid item xs={12}>
                <Card variant="outlined"><CardContent>
                  <Typography variant="subtitle2">Tracking Info</Typography>
                  <Typography>Last triggered: {tracking?.lastTriggeredAt ? String(tracking.lastTriggeredAt) : 'Never'}</Typography>
                  <Typography>Triggered staff count: {Array.isArray(tracking?.lastTriggeredStaff) ? tracking.lastTriggeredStaff.length : 0}</Typography>
                  {tracking?.lastError && <Typography color="error">Last error: {tracking.lastError}</Typography>}
                </CardContent></Card>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display:'flex', gap:1, justifyContent:'flex-end' }}>
                {!isNew && <Button color="warning" variant="outlined" onClick={()=>setResetConfirmOpen(true)}>Reset Tracking</Button>}
                <Button onClick={()=>navigate('/rules')}>Cancel</Button>
                <Button variant="contained" onClick={onSave} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Dialog open={resetConfirmOpen} onClose={()=>setResetConfirmOpen(false)}>
        <DialogTitle>Reset tracking</DialogTitle>
        <DialogContent>This will reset tracking data. The rule will process documents again. Continue?</DialogContent>
        <DialogActions>
          <Button onClick={()=>setResetConfirmOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={onResetTracking}>Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default RuleEditor;
