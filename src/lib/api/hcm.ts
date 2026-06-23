import type {
  HCMBalanceResponse,
  HCMError,
  HCMRequestResponse,
  LeaveBalance,
  TimeOffRequest,
} from "@/types";

export class HcmApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HcmApiError";
  }
}

export class BalanceChangedError extends HcmApiError {
  constructor(
    message: string,
    public readonly balance: LeaveBalance | null,
  ) {
    super("BALANCE_CHANGED", message);
    this.name = "BalanceChangedError";
  }
}

export class VerificationError extends HcmApiError {
  constructor(
    message: string,
    public readonly balance: LeaveBalance | null,
  ) {
    super("VERIFICATION_FAILED", message);
    this.name = "VerificationError";
  }
}

export function deserializeBalance(response: HCMBalanceResponse): LeaveBalance {
  return {
    employeeId: response.employee_id,
    locationId: response.location_id,
    leaveType: response.leave_type,
    available: response.available,
    used: response.used,
    total: response.total,
    lastSyncedAt: response.last_synced_at,
  };
}

export function deserializeRequest(
  response: HCMRequestResponse,
): TimeOffRequest {
  return {
    id: response.id,
    employeeId: response.employee_id,
    locationId: response.location_id,
    leaveType: response.leave_type,
    startDate: response.start_date,
    endDate: response.end_date,
    days: response.days,
    status: response.status,
    submittedAt: response.submitted_at,
    resolvedAt: response.resolved_at,
    rejectionReason: response.rejection_reason,
  };
}

async function parseHcmError(response: Response): Promise<HCMError> {
  try {
    const body = (await response.json()) as HCMError;
    if (body.code && body.message) {
      return body;
    }
  } catch {
    // fall through
  }
  return {
    code: "UNKNOWN",
    message: `Request failed with status ${response.status}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await parseHcmError(response);
    throw new HcmApiError(error.code, error.message);
  }
  return response.json() as Promise<T>;
}

export async function fetchBalances(): Promise<LeaveBalance[]> {
  const response = await fetch("/api/hcm/balances");
  const data = await handleResponse<{ balances: HCMBalanceResponse[] }>(
    response,
  );
  return data.balances.map(deserializeBalance);
}

export async function fetchBalance(
  employeeId: string,
  locationId: string,
  leaveType: string,
): Promise<LeaveBalance> {
  const params = new URLSearchParams({ employeeId, locationId, leaveType });
  const response = await fetch(`/api/hcm/balance?${params}`);
  const data = await handleResponse<HCMBalanceResponse>(response);
  return deserializeBalance(data);
}

export interface SubmitRequestInput {
  employeeId: string;
  locationId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}

export async function submitRequest(
  input: SubmitRequestInput,
): Promise<TimeOffRequest> {
  const response = await fetch("/api/hcm/balance/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<HCMRequestResponse>(response);
  return deserializeRequest(data);
}

export interface ApproveRequestResult {
  conflict: boolean;
  message?: string;
  request: TimeOffRequest;
  balance: LeaveBalance | null;
}

export async function approveRequest(
  requestId: string,
): Promise<ApproveRequestResult> {
  const response = await fetch(`/api/hcm/request/${requestId}/approve`, {
    method: "POST",
  });
  const data = await handleResponse<{
    conflict: boolean;
    message?: string;
    request: HCMRequestResponse;
    balance: HCMBalanceResponse | null;
  }>(response);

  return {
    conflict: data.conflict,
    message: data.message,
    request: deserializeRequest(data.request),
    balance: data.balance ? deserializeBalance(data.balance) : null,
  };
}

export interface DenyRequestResult {
  request: TimeOffRequest;
  balance: LeaveBalance | null;
}

export async function denyRequest(
  requestId: string,
  rejectionReason?: string,
): Promise<DenyRequestResult> {
  const response = await fetch(`/api/hcm/request/${requestId}/deny`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rejectionReason ? { rejectionReason } : {}),
  });
  const data = await handleResponse<{
    request: HCMRequestResponse;
    balance: HCMBalanceResponse | null;
  }>(response);

  return {
    request: deserializeRequest(data.request),
    balance: data.balance ? deserializeBalance(data.balance) : null,
  };
}

export interface FetchRequestsParams {
  employeeId?: string;
  status?: "pending";
}

export async function fetchRequests(
  params: FetchRequestsParams,
): Promise<TimeOffRequest[]> {
  const searchParams = new URLSearchParams();
  if (params.employeeId) {
    searchParams.set("employeeId", params.employeeId);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }

  const response = await fetch(`/api/hcm/requests?${searchParams}`);
  const data = await handleResponse<{ requests: HCMRequestResponse[] }>(
    response,
  );
  return data.requests.map(deserializeRequest);
}
