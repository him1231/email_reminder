/**
 * Verifies the rules list loading state and editor open flow
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
import { RuleList } from '../../src/pages/rules/RuleList';

describe('RuleList — loading & editor', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows loading placeholder then opens editor when Add is clicked', async () => {
    // simulate "still loading" by making onSnapshot a no-op (snapshot arrives later)
    (mockOnSnapshot as jest.Mock).mockImplementation(() => jest.fn());

    render(
      <ThemeProvider theme={theme}>
        <RuleList />
      </ThemeProvider>
    );

    expect(screen.getByTestId('rules-list-loading')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('add-rule-btn'));
    expect(await screen.findByTestId('rule-editor-form')).toBeVisible();
  });
});
