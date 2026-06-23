import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationToast } from './NotificationToast';
import { RequestStatusBadge } from './RequestStatusBadge';

describe('RequestStatusBadge', () => {
  it.each([
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['denied', 'Denied'],
    ['rolled_back', 'Rolled Back'],
  ] as const)('renders %s label', (status, label) => {
    render(<RequestStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('NotificationToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('auto-dismisses info notifications after 5 seconds', () => {
    const onDismiss = vi.fn();

    render(
      <NotificationToast
        notifications={[{ id: 'n1', type: 'info', message: 'Balance updated' }]}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText('Balance updated')).toBeInTheDocument();

    vi.advanceTimersByTime(5_000);

    expect(onDismiss).toHaveBeenCalledWith('n1');
  });

  it('does not auto-dismiss warning notifications', () => {
    const onDismiss = vi.fn();

    render(
      <NotificationToast
        notifications={[{ id: 'w1', type: 'warning', message: 'Balance changed' }]}
        onDismiss={onDismiss}
      />,
    );

    vi.advanceTimersByTime(10_000);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText('Balance changed')).toBeInTheDocument();
  });
});
