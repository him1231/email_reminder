import React from 'react';
import { render, screen } from '@testing-library/react';
import StaffGroupsTree from '../../src/components/StaffGroupsTree';

describe('StaffGroupsTree cycle handling', () => {
  const items = [
    { id: 'a', name: 'A', parentId: 'b', order: 0 },
    { id: 'b', name: 'B', parentId: 'a', order: 0 },
    { id: 'r', name: 'Root', parentId: null, order: 0 },
  ];

  test('renders warning and excludes cyclic nodes from tree', () => {
    render(<StaffGroupsTree items={items as any} onEdit={jest.fn()} onDelete={jest.fn()} onMove={jest.fn()} />);
    expect(screen.getByText(/Invalid group relationships detected/i)).toBeDefined();
    // cyclic nodes should not appear as tree children; root should be present
    expect(screen.getByText('Root')).toBeDefined();
    expect(screen.queryByText('A')).toBeNull();
    expect(screen.queryByText('B')).toBeNull();
  });
});