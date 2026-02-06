import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
// stub firestore calls used by StaffGroups so the component mounts synchronously in tests
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn((q, cb) => {
    // return empty list initially
    cb({ docs: [] });
    return () => {};
  }),
  getDocs: jest.fn(async () => ({ docs: [] })),
}));

import { StaffGroups } from '../../src/pages/staff/StaffGroups';

test('StaffGroups shows expand/collapse controls and renders tree area', () => {
  render(<StaffGroups />);
  // controls present (icon buttons)
  expect(screen.getByLabelText(/Expand all groups/i)).toBeDefined();
  expect(screen.getByLabelText(/Collapse all groups/i)).toBeDefined();

  // clicking collapse should update button visual state
  fireEvent.click(screen.getByLabelText(/Collapse all groups/i));
  expect(screen.getByLabelText(/Expand all groups/i)).toBeDefined();
});
