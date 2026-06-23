import { http, HttpResponse } from 'msw';

import { getBalance, getRequest } from '@/app/api/hcm/_lib/state';
import { serializeBalance, serializeRequest } from '@/app/api/hcm/_lib/serializers';

import { handlers as defaultHandlers } from './default';

export const handlers = [
  ...defaultHandlers.slice(0, 4),
  http.post('/api/hcm/request/:id/approve', ({ params }) => {
    const { id } = params;
    const timeOffRequest = getRequest(id as string);

    if (!timeOffRequest) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: `Request not found: ${id}` },
        { status: 404 },
      );
    }

    const balance = getBalance(
      timeOffRequest.employeeId,
      timeOffRequest.locationId,
      timeOffRequest.leaveType,
    );

    return HttpResponse.json({
      conflict: true,
      message:
        'Balance changed externally while request was pending (e.g. anniversary bonus applied)',
      request: serializeRequest(timeOffRequest),
      balance: balance ? serializeBalance(balance) : null,
    });
  }),
  ...defaultHandlers.slice(5),
];
