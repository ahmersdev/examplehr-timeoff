import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  aliceBalances,
  allBalances,
  bobBalances,
} from '@/stories/fixtures';

import { BalanceCard } from './BalanceCard';
import { BalanceGrid } from './BalanceGrid';

const meta = {
  title: 'Components/BalanceGrid',
  component: BalanceGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof BalanceGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MultipleLocationsAllSynced: Story = {
  render: () => (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          London
        </h3>
        <BalanceGrid balances={allBalances} syncStatus="synced" locationId="loc-london" />
      </section>
      <section>
        <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          New York
        </h3>
        <BalanceGrid balances={allBalances} syncStatus="synced" locationId="loc-nyc" />
      </section>
    </div>
  ),
  args: {
    balances: allBalances,
    syncStatus: 'synced',
    locationId: 'loc-london',
  },
};

export const MixedSyncStatuses: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BalanceCard balance={bobBalances[0]} syncStatus="synced" />
      <BalanceCard balance={bobBalances[1]} syncStatus="stale" />
      <BalanceCard balance={aliceBalances[0]} syncStatus="syncing" />
      <BalanceCard balance={aliceBalances[1]} syncStatus="error" />
    </div>
  ),
  args: {
    balances: allBalances,
    syncStatus: 'synced',
    locationId: 'loc-london',
  },
};

export const Empty: Story = {
  args: {
    balances: [],
    syncStatus: 'synced',
    locationId: 'loc-london',
  },
};
