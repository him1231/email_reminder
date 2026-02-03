/**
 * Ensure useAuth gracefully no-ops when firebase client config is missing so
 * the app can render the dev-setup banner instead of crashing.
 */

jest.mock('../../src/lib/firebase/init', () => ({
  firebaseConfigIsValid: false,
  auth: {},
  googleProvider: {},
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useAuth } from '../../src/hooks/useAuth';

function TestComponent() {
  const { user, loading } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? 'yes' : 'no'}</div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
    </div>
  );
}

describe('useAuth guard', () => {
  it('does not call firebase SDK when config missing and returns loading=false', async () => {
    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('no');
  });
});
