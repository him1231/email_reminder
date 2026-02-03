/**
 * Unit: saved-template Preview button opens dialog and shows rendered HTML
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => Date.now()),
}));

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/material';

import { onSnapshot as mockOnSnapshot } from 'firebase/firestore';
import { TemplateEditor } from '../../src/pages/templates/TemplateEditor';

describe('TemplateEditor — saved-template preview dialog', () => {
  afterEach(() => jest.clearAllMocks());

  it('opens preview dialog when Preview button is clicked and displays rendered HTML', async () => {
    // provide a snapshot with one saved template
    (mockOnSnapshot as jest.Mock).mockImplementation((_, onNext: any) => {
      onNext({ docs: [
        { id: 'tpl-1', data: () => ({ subject: 'Hello', htmlBody: '<p>Hi Test</p>', createdBy: 'user-1' }) }
      ] });
      return jest.fn();
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateEditor />
      </ThemeProvider>
    );

    // ensure the saved template card renders
    const previewBtn = await screen.findByTestId('preview-template-tpl-1');
    expect(previewBtn).toBeVisible();

    // click Preview -> dialog opens and shows rendered HTML
    fireEvent.click(previewBtn);
    const dialog = await screen.findByTestId('template-preview-dialog');
    expect(dialog).toBeVisible();
    expect(dialog).toHaveTextContent('Hi Test');

    // close the dialog
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(dialog).not.toBeVisible());
  });
});
