import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { bobBalances } from '@/tests/test-utils';

import { BalanceGrid } from '../BalanceGrid';

describe('BalanceGrid', () => {
  afterEach(() => cleanup());

  it('filters balances by location', () => {
    render(
      <BalanceGrid
        balances={bobBalances}
        syncStatus="synced"
        locationId="loc-london"
      />,
    );

    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('Sick Leave')).toBeInTheDocument();
  });

  it('shows empty state when no balances match location', () => {
    render(
      <BalanceGrid
        balances={bobBalances}
        syncStatus="synced"
        locationId="loc-nyc"
      />,
    );

    expect(screen.getByText('No balances for this location')).toBeInTheDocument();
  });
});
