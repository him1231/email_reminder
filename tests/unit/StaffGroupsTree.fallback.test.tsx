import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StaffGroupsTree from '../../src/components/StaffGroupsTree';

test('fallback tree is collapsible and shows nested children on toggle', () => {
  const items = [
    { id: 'r1', name: 'Root 1', parentId: null, order: 0 },
    { id: 'a', name: 'A', parentId: 'r1', order: 0 },
    { id: 'b', name: 'B', parentId: 'a', order: 0 },
    { id: 'r2', name: 'Root 2', parentId: null, order: 1 },
  ];

  render(<StaffGroupsTree items={items as any} onEdit={jest.fn()} onDelete={jest.fn()} onMove={jest.fn()} />);

  // children should be hidden by default
  expect(screen.queryByText('A')).toBeNull();
  expect(screen.queryByText('B')).toBeNull();

  // expand root (use node id)
  const toggleRoot = screen.getByLabelText(/toggle-r1/i);
  fireEvent.click(toggleRoot);
  expect(screen.getByText('A')).toBeDefined();
  expect(screen.queryByText('B')).toBeNull();

  // expand A (by node id)
  const toggleA = screen.getByLabelText(/toggle-a/i);
  fireEvent.click(toggleA);
  expect(screen.getByText('B')).toBeDefined();
});