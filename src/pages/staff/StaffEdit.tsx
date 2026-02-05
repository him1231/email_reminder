import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Grid, Stack, TextField, MenuItem, Select, InputLabel, FormControl, Chip } from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/init';

const StaffSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  staffNo: Yup.string().required('Staff number is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  contractEffectiveDate: Yup.date().required('Contract effective date is required'),
  groupIds: Yup.array(),
});

export const StaffEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const d = await getDoc(doc(db, 'staff', id));
      if (!d.exists()) {
        alert('Staff not found');
        navigate('/staff');
        return;
      }
      const data = d.data();
      setInitial({
        name: data.name || '',
        staffNo: data.staffNo || '',
        email: data.email || '',
        contractEffectiveDate: data.contractEffectiveDate?.toDate ? data.contractEffectiveDate.toDate().toISOString().slice(0,10) : data.contractEffectiveDate,
        groupIds: data.groupIds || [],
      });
    })();

    // load groups
    (async () => {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const q = query(collection(db, 'staff_groups'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, [id, navigate]);

  if (!initial) return <div>Loading…</div>;

  return (
    <Box>
      <Formik
        initialValues={initial}
        validationSchema={StaffSchema}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            if (!auth.currentUser) throw new Error('not-authenticated');
            await updateDoc(doc(db, 'staff', id!), {
              name: values.name,
              staffNo: values.staffNo,
              email: values.email,
              contractEffectiveDate: new Date(values.contractEffectiveDate),
              groupIds: values.groupIds || [],
              updatedAt: serverTimestamp(),
            });
            navigate('/staff');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, handleChange, setFieldValue, isSubmitting }) => (
          <Form>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField name="name" label="Full name" value={values.name} onChange={handleChange} fullWidth size="small" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField name="staffNo" label="Staff no." value={values.staffNo} onChange={handleChange} fullWidth size="small" />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField name="email" label="Email" value={values.email} onChange={handleChange} fullWidth size="small" />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField name="contractEffectiveDate" label="Contract effective date" type="date" value={values.contractEffectiveDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth size="small" />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel id="groups-label">Groups</InputLabel>
                  <Box sx={{ border: '1px solid #eee', borderRadius: 1, p:1, maxHeight: 300, overflow: 'auto' }}>
                    {/* simple checkbox tree - children visible/selectable only when parent checked */}
                    { /* build tree from groups */ }
                    {(() => {
                      const map = new Map<string, any>();
                      groups.forEach(g => map.set(g.id, { ...g, children: [] }));
                      const roots:any[] = [];
                      map.forEach(v => {
                        const pid = v.parentId || null;
                        if (pid && map.has(pid)) map.get(pid).children.push(v);
                        else roots.push(v);
                      });
                      const sortRec = (nodes:any[]) => nodes.sort((a,b)=> (a.order||0)-(b.order||0)).forEach(n=>n.children && sortRec(n.children));
                      sortRec(roots);

                      const render = (nodes:any[], values:any) => nodes.map((node:any)=>(
                        <Box key={node.id} sx={{ pl: 2 }}>
                          <label>
                            <input type="checkbox" checked={values.groupIds?.includes(node.id)} disabled={!!node.parentId && !(values.groupIds||[]).includes(node.parentId)} onChange={(e:any)=>{
                              if (e.target.checked) setFieldValue('groupIds', Array.from(new Set([...(values.groupIds||[]), node.id])));
                              else {
                                const remove:string[] = [];
                                const collect = (n:any)=>{ remove.push(n.id); n.children?.forEach((c:any)=>collect(c)); };
                                collect(node);
                                setFieldValue('groupIds', (values.groupIds||[]).filter((id:string)=>!remove.includes(id)));
                              }
                            }} /> {node.name}
                          </label>
                          {node.children && node.children.length>0 && (values.groupIds||[]).includes(node.id) && render(node.children, values)}
                        </Box>
                      ));

                      return render(roots, values);
                    })()}
                  </Box>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button variant="text" onClick={() => navigate('/staff')}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} variant="contained">Save</Button>
                </Stack>
              </Grid>
            </Grid>
          </Form>
        )}
      </Formik>
    </Box>
  );
};
