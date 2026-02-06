import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StaffGroupsTest from '../../src/pages/staff/StaffGroupsTest';

test('StaffGroupsTest shows tree and switches datasets', () => {
  render(<StaffGroupsTest />);
  // title contains the same base text
  expect(screen.getByText(/Staff Groups \(test\)/i)).toBeDefined();
  expect(screen.getByText('Root 1')).toBeDefined();
  // items render as individual treeitems
  expect(screen.getByTestId('treeitem-a')).toBeDefined();
  expect(screen.getByTestId('treeitem-b')).toBeDefined();

  // collapse all using the control (icon button)
  fireEvent.click(screen.getByLabelText(/Collapse all groups/i));
  // collapsing hides the child treeitems from the tree role
  expect(screen.queryByTestId('treeitem-a')).toBeNull();

  // expand all using the control
  fireEvent.click(screen.getByLabelText(/Expand all groups/i));
  expect(screen.getByTestId('treeitem-a')).toBeDefined();

  // switch to cyclic dataset — playground shows items from the dataset (non-destructive)
  fireEvent.click(screen.getByText(/Cyclic dataset/i));
  expect(screen.getByText('Good')).toBeDefined();
});

test('StaffGroupsTest supports in-memory DnD (simulate move)', async () => {
  const { screen, within } = await import('@testing-library/react');
  render(<StaffGroupsTest />);

  // precondition: A starts present in the tree
  expect(screen.getAllByTestId('treeitem-a').length).toBeGreaterThan(0);

  // ensure A appears after Root 1 in DOM order
  const orderedBefore = Array.from(document.querySelectorAll('[data-testid^="treeitem-"]')) as HTMLElement[];
  const idxABefore = orderedBefore.findIndex(el => el.dataset?.testid === 'treeitem-a');
  const idxR1Before = orderedBefore.findIndex(el => el.dataset?.testid === 'treeitem-r1');
  expect(idxABefore).toBeGreaterThan(idxR1Before);

  // perform programmatic/simulated move
  fireEvent.click(screen.getByTestId('simulate-move-btn'));

  // A should now appear after Root 2 in DOM order
  const orderedAfter = Array.from(document.querySelectorAll('[data-testid^="treeitem-"]')) as HTMLElement[];
  const idxAAfter = orderedAfter.findIndex(el => el.dataset?.testid === 'treeitem-a');
  const idxR2After = orderedAfter.findIndex(el => el.dataset?.testid === 'treeitem-r2');
  expect(idxAAfter).toBeGreaterThan(idxR2After);
});

test('tree items expose a drag handle (pointer & keyboard target)', () => {
  render(<StaffGroupsTest />);
  // playground exposes a visible drag handle for each item
  const handle = screen.getByTestId('drag-handle-a');
  expect(handle).toBeDefined();
  // focusable for keyboard users
  handle.focus();
  expect(document.activeElement).toBe(handle);
});
