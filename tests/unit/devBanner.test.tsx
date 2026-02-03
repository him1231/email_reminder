/**
 * Tests for DevSetupBanner — ensures the user sees actionable help when VITE_ config is missing.
 */

jest.mock('../../src/lib/firebase/init', () => ({
  firebaseConfigIsValid: false,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DevSetupBanner } from '../../src/components/DevSetupBanner';

describe('DevSetupBanner', () => {
  beforeEach(() => {
    // mock clipboard + alert to avoid test environment side-effects
    // @ts-ignore
    global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
    // @ts-ignore
    global.alert = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  it('renders helpful instructions and copies example to clipboard', async () => {
    render(<DevSetupBanner />);

    expect(screen.getByTestId('dev-setup-banner')).toBeVisible();
    const copy = screen.getByTestId('dev-setup-copy');
    fireEvent.click(copy);
    // clipboard should be called
    // @ts-ignore
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // wait for the async alert side-effect
    await (async () => {
      // eslint-disable-next-line jest/valid-expect
      await new Promise((res) => setTimeout(res, 0));
    })();
    // @ts-ignore
    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Example env copied'));
  });
});
