import type {
  HCMBalanceResponse,
  HCMRequestResponse,
  LeaveBalance,
  TimeOffRequest,
} from "@/types";

export function serializeBalance(balance: LeaveBalance): HCMBalanceResponse {
  return {
    employee_id: balance.employeeId,
    location_id: balance.locationId,
    leave_type: balance.leaveType,
    available: balance.available,
    used: balance.used,
    total: balance.total,
    last_synced_at: balance.lastSyncedAt,
  };
}

export function serializeRequest(request: TimeOffRequest): HCMRequestResponse {
  return {
    id: request.id,
    employee_id: request.employeeId,
    location_id: request.locationId,
    leave_type: request.leaveType,
    start_date: request.startDate,
    end_date: request.endDate,
    days: request.days,
    status: request.status,
    submitted_at: request.submittedAt,
    resolved_at: request.resolvedAt,
    rejection_reason: request.rejectionReason,
  };
}
