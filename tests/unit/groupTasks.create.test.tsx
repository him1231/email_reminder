/**
 * Unit tests for GroupTasks create-flow UI.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => Date.now()),
}));

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/material';

import { onSnapshot as mockOnSnapshot, addDoc as mockAddDoc } from 'firebase/firestore';
import { GroupTasks } from '../../src/pages/staff/GroupTasks';

describe('GroupTasks — create flow', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows Add button and creates a task when saved', async () => {
    // no-op snapshots (groups + tasks)
    (mockOnSnapshot as jest.Mock).mockImplementation(() => jest.fn());

    render(
      <ThemeProvider theme={theme}>
        <GroupTasks />
      </ThemeProvider>
    );

    expect(screen.getByTestId('add-task-btn')).toBeVisible();
    fireEvent.click(screen.getByTestId('add-task-btn'));
    expect(await screen.findByTestId('task-form')).toBeVisible();

    // fake authenticated user so save() doesn't throw
    // @ts-ignore - test helper stub
    const fb = require('../../src/lib/firebase/init');
    fb.auth = { currentUser: { uid: 'user-1' } };

    (mockAddDoc as jest.Mock).mockResolvedValueOnce({ id: 'task-1' });
    // provide required fields so form validation allows submit
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Prepare welcome pack' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(mockAddDoc).toHaveBeenCalled());
  });
});
