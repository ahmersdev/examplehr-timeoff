import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { handlers as insufficientBalanceHandlers } from "@/mocks/handlers/insufficient-balance";
import { server } from "@/mocks/server";
import { aliceAnnualBalance, renderWithProviders } from "@/tests/test-utils";

import { RequestFormConnected } from "../RequestFormConnected";
import { RequestForm } from "../RequestForm";

describe("RequestForm", () => {
  afterEach(() => cleanup());

  it("disables submit when days exceed available balance", () => {
    const onSubmit = vi.fn();

    renderWithProviders(
      <RequestForm
        employeeId="emp-alice"
        locationId="loc-nyc"
        availableBalances={[aliceAnnualBalance]}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
      { resetStore: false },
    );

    fireEvent.change(screen.getByLabelText("Start Date"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("End Date"), {
      target: { value: "2026-07-15" },
    });

    expect(screen.getByLabelText("Days")).toHaveValue("15");
    expect(screen.getByText(/exceeds available balance/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit Request" }),
    ).toBeDisabled();
  });

  it("calls onSubmit with correct payload", () => {
    const onSubmit = vi.fn();

    renderWithProviders(
      <RequestForm
        employeeId="emp-alice"
        locationId="loc-nyc"
        availableBalances={[aliceAnnualBalance]}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
      { resetStore: false },
    );

    fireEvent.change(screen.getByLabelText("Start Date"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("End Date"), {
      target: { value: "2026-07-02" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(onSubmit).toHaveBeenCalledWith({
      employeeId: "emp-alice",
      locationId: "loc-nyc",
      leaveType: "annual",
      startDate: "2026-07-01",
      endDate: "2026-07-02",
      days: 2,
    });
  });

  it("shows error message when HCM rejects", async () => {
    server.use(...insufficientBalanceHandlers);

    renderWithProviders(<RequestFormConnected />, { resetStore: false });

    fireEvent.change(screen.getByLabelText("Start Date"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("End Date"), {
      target: { value: "2026-07-01" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /only \d+ available/i,
      );
    });
  });
});
