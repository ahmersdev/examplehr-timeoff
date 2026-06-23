import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { bobAnnualBalance, staleTimestamp } from "@/stories/fixtures";

import { BalanceCard } from "./BalanceCard";

const meta = {
  title: "Components/BalanceCard",
  component: BalanceCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof BalanceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Synced: Story = {
  args: {
    balance: bobAnnualBalance,
    syncStatus: "synced",
  },
};

export const Stale: Story = {
  args: {
    balance: {
      ...bobAnnualBalance,
      lastSyncedAt: staleTimestamp(30),
    },
    syncStatus: "stale",
  },
};

export const Syncing: Story = {
  args: {
    balance: bobAnnualBalance,
    syncStatus: "syncing",
  },
};

export const Error: Story = {
  args: {
    balance: bobAnnualBalance,
    syncStatus: "error",
  },
};

export const OptimisticPending: Story = {
  args: {
    balance: {
      ...bobAnnualBalance,
      available: bobAnnualBalance.available - 3,
      used: bobAnnualBalance.used + 3,
    },
    syncStatus: "synced",
    isOptimistic: true,
  },
};

export const OptimisticRolledBack: Story = {
  render: (args) => (
    <div className="space-y-3">
      <BalanceCard {...args} />
      <p
        role="alert"
        className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
      >
        Your request could not be confirmed. Please try again.
      </p>
    </div>
  ),
  args: {
    balance: bobAnnualBalance,
    syncStatus: "synced",
    isOptimistic: false,
  },
};
