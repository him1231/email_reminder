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
    // provide snapshots: first call -> groups, second call -> tasks
    (mockOnSnapshot as jest.Mock).mockImplementation((q, cb) => {
      // emulate a Firestore snapshot with one group for the groups listener
      cb({ docs: [ { id: 'g-1', data: () => ({ name: 'HR' }) } ] });
      return jest.fn();
    });

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

    // select the mocked group (MUI Select -> open listbox, then click option)
    fireEvent.mouseDown(screen.getByLabelText(/group/i));
    const listbox = await screen.findByRole('listbox');
    const { within } = require('@testing-library/react');
    fireEvent.click(within(listbox).getByText('HR'));

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => expect(mockAddDoc).toHaveBeenCalled());

    // assert the payload passed to addDoc has normalized dueDate and includes createdBy
    const payload = (mockAddDoc as jest.Mock).mock.calls[0][1];
    expect(payload.title).toBe('Prepare welcome pack');
    expect(payload.groupId).toBe('g-1');
    expect(payload.dueDate).toBeNull();
    expect(payload.createdBy).toBe('user-1');
  });
});
