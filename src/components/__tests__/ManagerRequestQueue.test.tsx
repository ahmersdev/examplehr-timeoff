import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bobAnnualBalance, pendingBobRequest } from "@/tests/test-utils";

import { ManagerRequestQueue } from "../ManagerRequestQueue";

describe("ManagerRequestQueue", () => {
  afterEach(() => cleanup());

  it("shows warning when balance has changed since request submitted", () => {
    render(
      <ManagerRequestQueue
        requests={[pendingBobRequest]}
        balances={[bobAnnualBalance]}
        balanceChangedFlags={{ [pendingBobRequest.id]: true }}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        isLoadingBalance={false}
      />,
    );

    expect(
      screen.getByText(
        /Balance changed since one or more requests were submitted/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Balance changed since this request was submitted/i),
    ).toBeInTheDocument();
  });

  it("calls onApprove with correct request id", () => {
    const onApprove = vi.fn();

    render(
      <ManagerRequestQueue
        requests={[pendingBobRequest]}
        balances={[bobAnnualBalance]}
        onApprove={onApprove}
        onDeny={vi.fn()}
        isLoadingBalance={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(onApprove).toHaveBeenCalledWith(pendingBobRequest.id);
  });

  it("calls onDeny with correct request id", () => {
    const onDeny = vi.fn();

    render(
      <ManagerRequestQueue
        requests={[pendingBobRequest]}
        balances={[bobAnnualBalance]}
        onApprove={vi.fn()}
        onDeny={onDeny}
        isLoadingBalance={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Deny" }));

    expect(onDeny).toHaveBeenCalledWith(pendingBobRequest.id);
  });

  it("disables approve and deny while balance is loading", () => {
    render(
      <ManagerRequestQueue
        requests={[pendingBobRequest]}
        balances={[bobAnnualBalance]}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        isLoadingBalance
      />,
    );

    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deny" })).toBeDisabled();
  });
});
