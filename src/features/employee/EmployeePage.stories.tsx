import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { handlers as anniversaryBonusHandlers } from "@/mocks/handlers/anniversary-bonus";
import { handlers as defaultHandlers } from "@/mocks/handlers/default";
import { handlers as loadingHandlers } from "@/mocks/handlers/loading";
import { handlers as silentFailureHandlers } from "@/mocks/handlers/silent-failure";
import { withDemoEmployee } from "@/stories/decorators";
import { triggerAnniversaryDrift } from "@/stories/helpers";

import Employee from "./index";

const meta = {
  title: "Pages/EmployeePage",
  component: Employee,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [withDemoEmployee],
} satisfies Meta<typeof Employee>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HappyPath: Story = {
  parameters: {
    msw: {
      handlers: defaultHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText("My Time Off")).resolves.toBeInTheDocument();
    await expect(
      canvas.findByText("Annual Leave"),
    ).resolves.toBeInTheDocument();
    await expect(
      canvas.findByText("Request Time Off"),
    ).resolves.toBeInTheDocument();
  },
};

export const HcmSlow: Story = {
  parameters: {
    msw: {
      handlers: loadingHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByRole("status", { name: "Loading balances" }),
    ).resolves.toBeInTheDocument();
    await expect(canvas.queryByText("Annual Leave")).not.toBeInTheDocument();
  },
};

export const HcmSilentFailure: Story = {
  parameters: {
    msw: {
      handlers: silentFailureHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.findByText("Request Time Off"),
    ).resolves.toBeInTheDocument();

    await userEvent.type(canvas.getByLabelText("Start Date"), "2026-07-01");
    await userEvent.type(canvas.getByLabelText("End Date"), "2026-07-01");
    await userEvent.click(
      canvas.getByRole("button", { name: "Submit Request" }),
    );

    await expect(
      canvas.findByText(/could not be confirmed/i),
    ).resolves.toBeInTheDocument();
  },
};

export const AnniversaryBonusMidSession: Story = {
  parameters: {
    msw: {
      handlers: anniversaryBonusHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.findByText("10")).resolves.toBeInTheDocument();

    await triggerAnniversaryDrift("emp-bob", "loc-london", "annual");

    await expect(
      canvas.findByText("Your leave balance was updated"),
    ).resolves.toBeInTheDocument();
    await expect(canvas.findByText("12")).resolves.toBeInTheDocument();
  },
};
