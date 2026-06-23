import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { aliceAnnualBalance } from '@/tests/test-utils';

import { BalanceCard } from '../BalanceCard';

describe('BalanceCard', () => {
  afterEach(() => cleanup());

  it('renders correct balance numbers', () => {
    render(<BalanceCard balance={aliceAnnualBalance} syncStatus="synced" />);

    expect(screen.getByText('Annual Leave')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/3 used/)).toBeInTheDocument();
    expect(screen.getByText(/15 total/)).toBeInTheDocument();
  });

  it('shows stale indicator when syncStatus is "stale"', () => {
    const staleBalance = {
      ...aliceAnnualBalance,
      lastSyncedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };

    render(<BalanceCard balance={staleBalance} syncStatus="stale" />);

    expect(screen.getByText(/as of/)).toBeInTheDocument();
  });

  it('shows spinner when syncStatus is "syncing"', () => {
    render(<BalanceCard balance={aliceAnnualBalance} syncStatus="syncing" />);

    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('shows error indicator when syncStatus is "error"', () => {
    render(<BalanceCard balance={aliceAnnualBalance} syncStatus="error" />);

    expect(screen.getByText('Sync error')).toBeInTheDocument();
  });
});
