import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import StaffGroupsTest from '../../src/pages/staff/StaffGroupsTest';

test('StaffGroupsTest shows tree and detects cycle dataset', () => {
  render(<StaffGroupsTest />);
  // default is clean dataset and should be expanded by default
  expect(screen.getByText('Staff Groups (test)')).toBeDefined();
  expect(screen.getByText('Root 1')).toBeDefined();
  expect(screen.getByText('A')).toBeDefined();
  expect(screen.getByText('B')).toBeDefined();

  // collapse all using the control (icon button)
  fireEvent.click(screen.getByLabelText(/Collapse all groups/i));
  expect(screen.queryByText('A')).toBeNull();

  // expand all using the control
  fireEvent.click(screen.getByLabelText(/Expand all groups/i));
  expect(screen.getByText('A')).toBeDefined();

  // switch to cyclic dataset
  fireEvent.click(screen.getByText(/Cyclic dataset/i));
  expect(screen.getByText(/Invalid group relationships detected/i)).toBeDefined();
  expect(screen.getByText('Good')).toBeDefined();
});

test('StaffGroupsTest supports in-memory DnD (simulate move)', async () => {
  const { screen, within } = await import('@testing-library/react');
  render(<StaffGroupsTest />);

  // precondition: A starts under Root 1
  const r1Candidates = screen.getAllByTestId('treeitem-r1');
  const root1 = r1Candidates.find(el => within(el).queryByText('Root 1'))!;
  expect(root1).toBeDefined();
  expect(screen.getAllByTestId('treeitem-a').length).toBeGreaterThan(0);
  expect(within(root1).getByText('A')).toBeDefined();

  // perform programmatic/simulated move
  fireEvent.click(screen.getByTestId('simulate-move-btn'));

  // A should now be a child of Root 2
  const r2Candidates = screen.getAllByTestId('treeitem-r2');
  const root2 = r2Candidates.find(el => within(el).queryByText('Root 2'))!;
  expect(within(root2).getByText('A')).toBeDefined();
});

test('per-item append control adds DnD button into the item action list', () => {
  render(<StaffGroupsTest />);
  const r1 = screen.getAllByTestId('treeitem-r1').find(el => within(el).queryByText('Root 1'))!;
  const appendBtn = within(r1).getByTestId('append-dnd-r1');
  fireEvent.click(appendBtn);
  expect(within(r1).getByTestId('treeitem-r1-dnd-0')).toBeDefined();
});
