import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { handlers as defaultHandlers } from '@/mocks/handlers/default';
import { handlers as insufficientBalanceHandlers } from '@/mocks/handlers/insufficient-balance';
import { withSeededBobBalances } from '@/stories/decorators';
import { bobBalances } from '@/stories/fixtures';
import { DEMO_EMPLOYEE } from '@/lib/demo-users';

import { RequestForm } from './RequestForm';
import { RequestFormConnected } from './RequestFormConnected';

const meta = {
  title: 'Components/RequestForm',
  component: RequestForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    employeeId: DEMO_EMPLOYEE.id,
    locationId: DEMO_EMPLOYEE.locationId,
    availableBalances: bobBalances,
    onSubmit: fn(),
    isSubmitting: false,
  },
} satisfies Meta<typeof RequestForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

export const InsufficientBalance: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Start Date'), '2026-07-01');
    await userEvent.type(canvas.getByLabelText('End Date'), '2026-07-15');

    await expect(canvas.getByText(/exceeds available balance/)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Submit Request' })).toBeDisabled();
  },
};

export const HcmRejected: Story = {
  render: () => <RequestFormConnected />,
  parameters: {
    msw: {
      handlers: insufficientBalanceHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Start Date'), '2026-07-01');
    await userEvent.type(canvas.getByLabelText('End Date'), '2026-07-01');
    await userEvent.click(canvas.getByRole('button', { name: 'Submit Request' }));

    await expect(
      canvas.findByText(/only \d+ available/i),
    ).resolves.toBeInTheDocument();
  },
};

export const Success: Story = {
  render: () => <RequestFormConnected />,
  decorators: [withSeededBobBalances],
  parameters: {
    msw: {
      handlers: defaultHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Start Date'), '2026-07-01');
    await userEvent.type(canvas.getByLabelText('End Date'), '2026-07-01');
    await userEvent.click(canvas.getByRole('button', { name: 'Submit Request' }));

    await expect(
      canvas.findByText('Request submitted successfully.'),
    ).resolves.toBeInTheDocument();
    await expect(canvas.getByLabelText('Start Date')).toHaveValue('');
    await expect(canvas.getByLabelText('End Date')).toHaveValue('');
  },
};
