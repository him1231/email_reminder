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
    (mockOnSnapshot as jest.Mock).mockImplementation((arg, onNext: any) => {
      // first call is templates, second is rules
      if (arg && String(arg).includes('templates')) {
        onNext({ docs: [] });
        return jest.fn();
      }
      onNext({ docs: [] });
      return jest.fn();
    });

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
