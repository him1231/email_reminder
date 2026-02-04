import React, { useMemo, useState } from 'react';
import { Autocomplete, Checkbox, TextField, Typography } from '@mui/material';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

interface Props {
  staff: any[];
  value: string[];
  onChange: (v: string[]) => void;
}

const StaffSelector: React.FC<Props> = ({ staff, value, onChange }) => {
  const [input, setInput] = useState('');

  const options = useMemo(() => {
    if (!input) return staff;
    const q = input.toLowerCase();
    return staff.filter(s => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
  }, [staff, input]);

  const selectedCount = value.length;

  return (
    <div>
      <Typography variant="body2">Recipients ({selectedCount} selected)</Typography>
      <Autocomplete
        multiple
        options={options}
        getOptionLabel={(opt) => `${opt.name || ''} <${opt.email || ''}>`}
        value={staff.filter(s => value.includes(s.id))}
        onChange={(_, v) => onChange(v.map((x:any) => x.id))}
        inputValue={input}
        onInputChange={(_, v) => setInput(v)}
        renderOption={(props, option, { selected }) => (
          <li {...props}>
            <Checkbox
              icon={icon}
              checkedIcon={checkedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option.name} <span style={{ color: '#666', marginLeft: 8 }}>{option.email}</span>
          </li>
        )}
        renderInput={(params) => <TextField {...params} label="Select staff" placeholder="Search by name or email" />}
      />
    </div>
  );
};

export default StaffSelector;
