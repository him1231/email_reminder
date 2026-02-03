/**
 * Unit tests for RuleList create-flow UI.
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
import { RuleList } from '../../src/pages/rules/RuleList';

describe('RuleList — create flow', () => {
  afterEach(() => jest.clearAllMocks());

  it('reveals editor and saves a rule', async () => {
    (mockOnSnapshot as jest.Mock).mockImplementation((arg, onNext: any) => {
      // templates then rules
      onNext({ docs: [] });
      return jest.fn();
    });

    render(
      <ThemeProvider theme={theme}>
        <RuleList />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('add-rule-btn'));
    expect(await screen.findByTestId('rule-editor-form')).toBeVisible();

    // stub auth currentUser so save() doesn't throw
    // @ts-ignore
    const fb = require('../../src/lib/firebase/init');
    fb.auth = { currentUser: { uid: 'user-1' } };

    (mockAddDoc as jest.Mock).mockResolvedValueOnce({ id: 'rule-1' });
    const saveBtn = screen.getByRole('button', { name: /save rule/i });
    fireEvent.click(saveBtn);
    expect(mockAddDoc).toHaveBeenCalled();
  });
});
