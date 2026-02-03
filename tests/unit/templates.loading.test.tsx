jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
}));

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/material';

import { onSnapshot as mockOnSnapshot } from 'firebase/firestore';
import { TemplateEditor } from '../../src/pages/templates/TemplateEditor';

describe('TemplateEditor — loading UI', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows templates loading state while snapshot is pending', async () => {
    let cb: Function | null = null;
    (mockOnSnapshot as jest.Mock).mockImplementation((_col: any, callback: Function) => {
      cb = callback;
      return jest.fn();
    });

    render(
      <ThemeProvider theme={theme}>
        <TemplateEditor />
      </ThemeProvider>
    );

    expect(screen.getByTestId('templates-list-loading')).toBeInTheDocument();
    expect(screen.getByTestId('templates-placeholder')).toBeVisible();

    // Preview should be hidden until the editor is opened
    expect(screen.queryByText(/Hi Asha Tan/)).toBeNull();

    // open editor and ensure preview appears
    const addBtn = screen.getByTestId('add-template-btn');
    addBtn.click();
    expect(await screen.findByTestId('template-editor-form')).toBeVisible();
    expect(screen.getByText(/Hi Asha Tan/)).toBeInTheDocument();

    const fakeSnap = { docs: [{ id: 'tpl-1', data: () => ({ subject: 'Welcome', htmlBody: '<p>Hi</p>' }) }] };
    // @ts-ignore - ensure callback runs inside React act
    await waitFor(() => { cb?.(fakeSnap); });

    await waitFor(() => expect(screen.queryByTestId('templates-list-loading')).not.toBeInTheDocument());
    expect(screen.getByText(/Welcome/)).toBeInTheDocument();
  });
});
