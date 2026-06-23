import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { handlers as defaultHandlers } from "@/mocks/handlers/default";
import {
  approveErrorHandlers,
  seedBalanceSnapshot,
  seedPendingRequest,
} from "@/stories/helpers";
import { withDemoManager } from "@/stories/decorators";

import Manager from "./index";

function seedBobPendingRequest() {
  return seedPendingRequest({
    employeeId: "emp-bob",
    locationId: "loc-london",
    leaveType: "annual",
    startDate: "2026-08-01",
    endDate: "2026-08-03",
    days: 3,
  });
}

const meta = {
  title: "Pages/ManagerPage",
  component: Manager,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [withDemoManager],
} satisfies Meta<typeof Manager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HappyPath: Story = {
  parameters: {
    msw: {
      handlers: defaultHandlers,
    },
  },
  decorators: [
    (Story) => {
      seedBobPendingRequest();
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByText("Manager Queue"),
    ).resolves.toBeInTheDocument();
    await expect(
      canvas.findByText("Annual Leave"),
    ).resolves.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Approve" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Deny" }),
    ).toBeInTheDocument();
  },
};

export const BalanceChangedBeforeApproval: Story = {
  parameters: {
    msw: {
      handlers: defaultHandlers,
    },
  },
  decorators: [
    (Story) => {
      const request = seedBobPendingRequest();
      seedBalanceSnapshot(request.id, 10);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByText(
        /Balance changed since one or more requests were submitted/i,
      ),
    ).resolves.toBeInTheDocument();
    await expect(
      canvas.findByText(/Balance changed since this request was submitted/i),
    ).resolves.toBeInTheDocument();
  },
};

export const HcmErrorOnApproval: Story = {
  parameters: {
    msw: {
      handlers: approveErrorHandlers,
    },
  },
  decorators: [
    (Story) => {
      seedBobPendingRequest();
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByRole("button", { name: "Approve" }),
    ).resolves.toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Approve" }));

    await expect(
      canvas.findByRole("button", { name: "Approve" }),
    ).resolves.toBeInTheDocument();
  },
};
