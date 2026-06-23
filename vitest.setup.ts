import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetHcmState } from './src/app/api/hcm/_lib/state';
import { server } from './src/mocks/server';
import { resetAppStore } from './src/store/reset-app-store';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  resetHcmState();
  resetAppStore();
});
afterAll(() => server.close());
