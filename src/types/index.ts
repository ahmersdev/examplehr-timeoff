export interface LeaveBalance {
  employeeId: string;
  locationId: string;
  leaveType: string;
  available: number;
  used: number;
  total: number;
  lastSyncedAt: string;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  locationId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "denied" | "rolled_back";
  optimisticStatus?: "pending_submission" | "pending_approval";
  submittedAt: string;
  resolvedAt?: string;
  rejectionReason?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  locationId: string;
  role: "employee" | "manager";
  anniversaryDate: string;
}

export interface HCMBalanceResponse {
  employee_id: string;
  location_id: string;
  leave_type: string;
  available: number;
  used: number;
  total: number;
  last_synced_at: string;
}

export interface HCMRequestResponse {
  id: string;
  employee_id: string;
  location_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: "pending" | "approved" | "denied" | "rolled_back";
  submitted_at: string;
  resolved_at?: string;
  rejection_reason?: string;
}

export interface HCMError {
  code: string;
  message: string;
}

export type SyncStatus = "synced" | "stale" | "syncing" | "error";
