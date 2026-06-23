import { describe, expect, it } from 'vitest';

import { handlers as defaultHandlers } from '@/mocks/handlers/default';
import { handlers as errorHandlers } from '@/mocks/handlers/errors';
import { handlers as insufficientBalanceHandlers } from '@/mocks/handlers/insufficient-balance';
import { server } from '@/mocks/server';

describe('HCM MSW handlers', () => {
  it('default handlers return balances', async () => {
    server.use(...defaultHandlers);

    const response = await fetch('/api/hcm/balances');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.balances).toHaveLength(5);
  });

  it('error handlers return 503', async () => {
    server.use(...errorHandlers);

    const response = await fetch('/api/hcm/balances');
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('insufficient-balance handlers return 422 on request submission', async () => {
    server.use(...insufficientBalanceHandlers);

    const response = await fetch('/api/hcm/balance/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 'emp-alice',
        locationId: 'loc-nyc',
        leaveType: 'annual',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        days: 1,
      }),
    });

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.code).toBe('INSUFFICIENT_BALANCE');
  });
});
