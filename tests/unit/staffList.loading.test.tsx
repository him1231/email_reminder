/**
 * Unit tests for StaffList loading behavior.
 * - verifies a loading indicator is shown while onSnapshot hasn't returned
 * - verifies data is rendered and loading removed after snapshot callback
 */

jest.mock('firebase/firestore', () => {
  return {
    collection: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn(),
    deleteDoc: jest.fn(),
    doc: jest.fn(),
  };
});

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/material';

// import after mock
import { onSnapshot as mockOnSnapshot } from 'firebase/firestore';
import { StaffList } from '../../src/pages/staff/StaffList';

describe('StaffList — loading UI', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows loading indicator while snapshot has not returned', async () => {
    // explicitly control onSnapshot for this test: delay calling callback
    let cb: Function | null = null;
    (mockOnSnapshot as jest.Mock).mockImplementationOnce((_q: any, callback: Function) => {
      cb = callback;
      return jest.fn();
    });

    render(
      <ThemeProvider theme={theme}>
        <StaffList />
      </ThemeProvider>
    );

    // loading placeholder should be present while snapshot is pending
    expect(screen.getByTestId('staff-list-loading')).toBeTruthy();
    expect(screen.getByTestId('staff-placeholder-1')).toBeVisible();

    // now simulate snapshot delivering data (wrap in act via waitFor)
    const fakeSnap = { docs: [{ id: 'staff-1', data: () => ({ name: 'Asha Tan', staffNo: 'HR-1001', email: 'asha@example.com' }) }] };
    // @ts-ignore - call the captured callback
    await waitFor(() => { cb?.(fakeSnap); });

    await waitFor(() => expect(screen.queryByTestId('staff-list-loading')).not.toBeInTheDocument());
    expect(screen.getByText('Asha Tan')).toBeInTheDocument();
  });
});
