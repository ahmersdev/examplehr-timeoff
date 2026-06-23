import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import {
  bobAnnualBalance,
  multiplePendingRequests,
  pendingBobRequest,
} from "@/stories/fixtures";

import { ManagerRequestQueue } from "./ManagerRequestQueue";

const meta = {
  title: "Components/ManagerRequestQueue",
  component: ManagerRequestQueue,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    onApprove: fn(),
    onDeny: fn(),
    isLoadingBalance: false,
  },
} satisfies Meta<typeof ManagerRequestQueue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyQueue: Story = {
  args: {
    requests: [],
    balances: [],
  },
};

export const QueueWithMultipleRequests: Story = {
  args: {
    requests: multiplePendingRequests,
    balances: [
      bobAnnualBalance,
      {
        employeeId: "emp-alice",
        locationId: "loc-nyc",
        leaveType: "personal",
        available: 3,
        used: 0,
        total: 3,
        lastSyncedAt: new Date().toISOString(),
      },
    ],
  },
};

export const BalanceChangedWarningVisible: Story = {
  args: {
    requests: [pendingBobRequest],
    balances: [bobAnnualBalance],
    balanceChangedFlags: { [pendingBobRequest.id]: true },
  },
};

export const ApprovingInProgress: Story = {
  args: {
    requests: [pendingBobRequest],
    balances: [bobAnnualBalance],
    isLoadingBalance: true,
  },
};

export const ApprovalConflict: Story = {
  render: (args) => (
    <div className="space-y-4">
      <p
        role="alert"
        className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
      >
        Balance changed externally while request was pending (e.g. anniversary
        bonus applied)
      </p>
      <ManagerRequestQueue {...args} />
    </div>
  ),
  args: {
    requests: [pendingBobRequest],
    balances: [
      {
        ...bobAnnualBalance,
        available: bobAnnualBalance.available + 2,
      },
    ],
    balanceChangedFlags: { [pendingBobRequest.id]: true },
  },
};
