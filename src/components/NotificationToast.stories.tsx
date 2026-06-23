import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import {
  balanceChangedNotification,
  balanceRefreshedNotification,
  requestRolledBackNotification,
  stackedNotifications,
} from "@/stories/fixtures";

import { NotificationToast } from "./NotificationToast";

const meta = {
  title: "Components/NotificationToast",
  component: NotificationToast,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    onDismiss: fn(),
  },
} satisfies Meta<typeof NotificationToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BalanceRefreshedMidSession: Story = {
  args: {
    notifications: [balanceRefreshedNotification],
  },
};

export const RequestRolledBackNotification: Story = {
  args: {
    notifications: [requestRolledBackNotification],
  },
};

export const MultipleNotificationsStacked: Story = {
  args: {
    notifications: stackedNotifications,
  },
};

export const BalanceChangedWarning: Story = {
  args: {
    notifications: [balanceChangedNotification],
  },
};
