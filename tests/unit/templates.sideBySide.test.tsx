/**
 * Verifies the editor form and preview render side-by-side when creating is true.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
}));

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/material';

import { onSnapshot as mockOnSnapshot } from 'firebase/firestore';
import { TemplateEditor } from '../../src/pages/templates/TemplateEditor';

describe('TemplateEditor — side-by-side editor + preview', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows editor form and live preview side-by-side when Add is clicked', async () => {
    (mockOnSnapshot as jest.Mock).mockImplementation(() => jest.fn());

    render(
      <ThemeProvider theme={theme}>
        <TemplateEditor />
      </ThemeProvider>
    );

    // open editor
    fireEvent.click(screen.getByTestId('add-template-btn'));

    const form = await screen.findByTestId('template-editor-form');
    const preview = await screen.findByTestId('template-preview-inside-form');

    expect(form).toBeVisible();
    expect(preview).toBeVisible();
    expect(form).toContainElement(preview);

    // editing the HTML updates the preview
    const body = screen.getByLabelText(/HTML body/i);
    fireEvent.change(body, { target: { value: '<p>Hi Test</p>' } });
    expect(preview).toHaveTextContent('Hi Test');
  });
});
