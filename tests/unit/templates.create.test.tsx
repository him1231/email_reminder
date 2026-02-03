/**
 * Unit tests for TemplateEditor create-flow UI.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => Date.now()),
}));

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/material';

import { onSnapshot as mockOnSnapshot, addDoc as mockAddDoc } from 'firebase/firestore';
import { TemplateEditor } from '../../src/pages/templates/TemplateEditor';

describe('TemplateEditor — create flow', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows Add button and reveals editor when clicked', async () => {
    // make onSnapshot a no-op (snapshot arrives later)
    (mockOnSnapshot as jest.Mock).mockImplementation(() => jest.fn());

    render(
      <ThemeProvider theme={theme}>
        <TemplateEditor />
      </ThemeProvider>
    );

    // Add button visible, editor form hidden initially
    expect(screen.getByTestId('add-template-btn')).toBeVisible();
    expect(screen.queryByTestId('template-editor-form')).toBeNull();

    // Click to reveal the editor
    fireEvent.click(screen.getByTestId('add-template-btn'));
    expect(await screen.findByTestId('template-editor-form')).toBeVisible();

    // provide a fake authenticated user so save() doesn't throw
    // @ts-ignore - test helper stub
    const fb = require('../../src/lib/firebase/init');
    fb.auth = { currentUser: { uid: 'user-1' } };

    // ensure Save triggers addDoc
    (mockAddDoc as jest.Mock).mockResolvedValueOnce({ id: 'tpl-1' });
    const saveBtn = screen.getByRole('button', { name: /save template/i });
    fireEvent.click(saveBtn);
    expect(mockAddDoc).toHaveBeenCalled();
  });
});
