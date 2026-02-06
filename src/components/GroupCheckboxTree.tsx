import React, { useMemo } from 'react';
import { Box } from '@mui/material';

type Props = {
  groups: any[];
  values: { groupIds?: string[] };
  setFieldValue: (field: string, value: any) => void;
  sx?: any;
};

const GroupCheckboxTree: React.FC<Props> = ({ groups, values, setFieldValue, sx }) => {
  const tree = useMemo(() => {
    const map = new Map<string, any>();
    groups.forEach((g: any) => map.set(g.id, { ...g, children: [] }));
    const roots: any[] = [];
    map.forEach((v: any) => {
      const pid = v.parentId || null;
      if (pid && map.has(pid)) map.get(pid).children.push(v);
      else roots.push(v);
    });
    const sortRec = (nodes: any[]) =>
      nodes
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((n) => n.children && sortRec(n.children));
    sortRec(roots);
    return roots;
  }, [groups]);

  const renderRec = (nodes: any[], prefixChecked = true) =>
    nodes.map((node: any) => {
      const checked = Boolean(values.groupIds?.includes(node.id));
      const disabled = !prefixChecked; // children visible/selectable only if parent is checked

      const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          setFieldValue('groupIds', Array.from(new Set([...(values.groupIds || []), node.id])));
          return;
        }
        const removeIds: string[] = [];
        const collect = (n: any) => {
          removeIds.push(n.id);
          n.children?.forEach((c: any) => collect(c));
        };
        collect(node);
        setFieldValue('groupIds', (values.groupIds || []).filter((id: string) => !removeIds.includes(id)));
      };

      return (
        <Box key={node.id} sx={{ pl: 2 }}>
          <label>
            <input
              type="checkbox"
              aria-label={node.name}
              checked={checked}
              disabled={disabled}
              onChange={onChange}
            />{' '}
            {node.name}
          </label>
          {node.children && node.children.length > 0 && (values.groupIds || []).includes(node.id) && renderRec(node.children, true)}
        </Box>
      );
    });

  return (
    <Box sx={sx}>
      {renderRec(tree)}
    </Box>
  );
};

export default GroupCheckboxTree;
