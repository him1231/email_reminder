import React, { useEffect, useState } from "react";
import GroupCheckboxTree from '../../components/GroupCheckboxTree';
import { Button, Grid, Stack, TextField, MenuItem, Select, InputLabel, FormControl, Chip, Box } from "@mui/material";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../lib/firebase/init";

const StaffSchema = Yup.object().shape({
  groupIds: Yup.array(),
  name: Yup.string().required("Name is required"),
  staffNo: Yup.string().required("Staff number is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  contractEffectiveDate: Yup.date().required("Contract effective date is required"),
});

export const StaffForm: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [groups, setGroups] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const q = query(collection(db, "staff_groups"), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  // build tree handled by shared `GroupCheckboxTree` component — pass `groups` directly to it
  // (keeps fetching logic here; rendering delegated to shared component)

  return (
    <Formik
      initialValues={{ name: "", staffNo: "", email: "", contractEffectiveDate: "", groupIds: [] }}
      validationSchema={StaffSchema}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          if (!auth.currentUser) throw new Error('not-authenticated');
          await addDoc(collection(db, "staff"), {
            name: values.name,
            staffNo: values.staffNo,
            email: values.email,
            contractEffectiveDate: new Date(values.contractEffectiveDate),
                groupIds: values.groupIds || [],
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid,
          });
          onClose?.();
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, touched, errors, handleChange, values, setFieldValue }) => (
        <Form>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Full name"
                value={values.name}
                onChange={handleChange}
                error={Boolean(touched.name && errors.name)}
                helperText={touched.name && errors.name}
                fullWidth
                size="small"
              />
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
              <Box>
                <InputLabel id="groups-label">Groups</InputLabel>
                <Box sx={{ border: '1px solid #eee', borderRadius: 1, p:1, maxHeight: 300, overflow: 'auto' }}>
                  <GroupCheckboxTree groups={groups} values={values} setFieldValue={setFieldValue} />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="text" onClick={() => onClose?.()}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} variant="contained">Save</Button>
              </Stack>
            </Grid>
          </Grid>
        </Form>
      )}
    </Formik>
  );
};
