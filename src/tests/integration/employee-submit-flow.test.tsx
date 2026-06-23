import '@/tests/mocks/next-navigation';

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import Employee from '@/features/employee';
import { handlers as defaultHandlers } from '@/mocks/handlers/default';
import { handlers as silentFailureHandlers } from '@/mocks/handlers/silent-failure';
import { server } from '@/mocks/server';
import { DEMO_EMPLOYEE } from '@/lib/demo-users';
import { renderWithProviders } from '@/tests/test-utils';

async function fillAndSubmitOneDayRequest() {
  await waitFor(() => {
    expect(screen.getByLabelText('Leave Type')).toHaveValue('annual');
  });

  fireEvent.change(screen.getByLabelText('Start Date'), {
    target: { value: '2026-07-01' },
  });
  fireEvent.change(screen.getByLabelText('End Date'), {
    target: { value: '2026-07-01' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));
}

function getBalancesSection() {
  return screen.getByRole('heading', { name: 'Balances' }).closest('section')!;
}

function getAnnualBalanceCard() {
  const section = getBalancesSection();
  const annualHeading = within(section).getByRole('heading', { name: 'Annual Leave' });
  return annualHeading.closest('article')!;
}

describe('employee submit flow', () => {
  afterEach(() => cleanup());

  it('full flow: see balance → submit → optimistic update → HCM confirms → balance updated', async () => {
    server.use(...defaultHandlers);

    renderWithProviders(<Employee />, { currentUser: DEMO_EMPLOYEE });

    await waitFor(() => {
      expect(within(getAnnualBalanceCard()).getByText('10')).toBeInTheDocument();
    });

    await fillAndSubmitOneDayRequest();

    await waitFor(() => {
      expect(within(getAnnualBalanceCard()).getByText('9')).toBeInTheDocument();
      expect(
        screen.queryByText(/Your request could not be confirmed/i),
      ).not.toBeInTheDocument();
    });
  });

  it('full flow with silent failure: optimistic → HCM 200 → verification fails → rollback → notification shown', async () => {
    server.use(...silentFailureHandlers);

    renderWithProviders(<Employee />, { currentUser: DEMO_EMPLOYEE });

    await waitFor(() => {
      expect(within(getAnnualBalanceCard()).getByText('10')).toBeInTheDocument();
    });

    await fillAndSubmitOneDayRequest();

    await waitFor(() => {
      expect(
        screen.getByText(/Your request could not be confirmed/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Balance verification failed after submission/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(within(getAnnualBalanceCard()).getByText('10')).toBeInTheDocument();
    });
  });
});
