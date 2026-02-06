import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupCheckboxTree from '../../src/components/GroupCheckboxTree';

describe('GroupCheckboxTree', () => {
  const groups = [
    { id: 'parent', name: 'Parent', order: 1 },
    { id: 'child', name: 'Child', parentId: 'parent', order: 2 },
  ];

  test('child checkbox is rendered only when parent is selected and parent check calls setFieldValue', () => {
    const setFieldValue = jest.fn();
    const { rerender } = render(<GroupCheckboxTree groups={groups} values={{ groupIds: [] }} setFieldValue={setFieldValue} />);

    const parent = screen.getByLabelText('Parent') as HTMLInputElement;
    expect(parent.checked).toBe(false);
    expect(screen.queryByLabelText('Child')).toBeNull();

    // when parent is selected the child appears
    rerender(<GroupCheckboxTree groups={groups} values={{ groupIds: ['parent'] }} setFieldValue={setFieldValue} />);
    const child = screen.getByLabelText('Child') as HTMLInputElement;
    expect(child).not.toBeNull();

    // clicking parent checkbox should call setFieldValue
    fireEvent.click(parent);
    expect(setFieldValue).toHaveBeenCalledWith('groupIds', expect.any(Array));
  });
});
