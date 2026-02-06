import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StaffGroupsTest from '../../src/pages/staff/StaffGroupsTest';

test('StaffGroupsTest shows tree and detects cycle dataset', () => {
  render(<StaffGroupsTest />);
  // default is clean dataset and should be expanded by default
  expect(screen.getByText('Staff Groups (test)')).toBeDefined();
  expect(screen.getByText('Root 1')).toBeDefined();
  expect(screen.getByText('A')).toBeDefined();
  expect(screen.getByText('B')).toBeDefined();
  // switch to cyclic dataset
  fireEvent.click(screen.getByText(/Cyclic dataset/i));
  expect(screen.getByText(/Invalid group relationships detected/i)).toBeDefined();
  expect(screen.getByText('Good')).toBeDefined();
});
