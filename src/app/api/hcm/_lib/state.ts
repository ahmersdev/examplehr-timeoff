import type { Employee, LeaveBalance, TimeOffRequest } from "@/types";

import { balanceKey } from "./utils";

interface HCMState {
  employees: Employee[];
  locations: { id: string; name: string }[];
  leaveTypes: { id: string; name: string }[];
  allowedDimensions: Set<string>;
  balances: Map<string, LeaveBalance>;
  requests: Map<string, TimeOffRequest>;
}

function now(): string {
  return new Date().toISOString();
}

function createSeedState(): HCMState {
  const employees: Employee[] = [
    {
      id: "emp-alice",
      name: "Alice Chen",
      email: "alice@example.com",
      locationId: "loc-nyc",
      role: "manager",
      anniversaryDate: "2020-03-15",
    },
    {
      id: "emp-bob",
      name: "Bob Martinez",
      email: "bob@example.com",
      locationId: "loc-london",
      role: "employee",
      anniversaryDate: "2021-06-01",
    },
  ];

  const locations = [
    { id: "loc-nyc", name: "New York" },
    { id: "loc-london", name: "London" },
  ];

  const leaveTypes = [
    { id: "annual", name: "Annual Leave" },
    { id: "sick", name: "Sick Leave" },
    { id: "personal", name: "Personal Leave" },
  ];

  const allowedDimensions = new Set([
    "loc-nyc:annual",
    "loc-nyc:sick",
    "loc-nyc:personal",
    "loc-london:annual",
    "loc-london:sick",
  ]);

  const seedBalances: Omit<LeaveBalance, "lastSyncedAt">[] = [
    {
      employeeId: "emp-alice",
      locationId: "loc-nyc",
      leaveType: "annual",
      available: 12,
      used: 3,
      total: 15,
    },
    {
      employeeId: "emp-alice",
      locationId: "loc-nyc",
      leaveType: "sick",
      available: 5,
      used: 0,
      total: 5,
    },
    {
      employeeId: "emp-alice",
      locationId: "loc-nyc",
      leaveType: "personal",
      available: 3,
      used: 0,
      total: 3,
    },
    {
      employeeId: "emp-bob",
      locationId: "loc-london",
      leaveType: "annual",
      available: 10,
      used: 2,
      total: 12,
    },
    {
      employeeId: "emp-bob",
      locationId: "loc-london",
      leaveType: "sick",
      available: 4,
      used: 1,
      total: 5,
    },
  ];

  const syncedAt = now();
  const balances = new Map<string, LeaveBalance>();
  for (const row of seedBalances) {
    const key = balanceKey(row.employeeId, row.locationId, row.leaveType);
    balances.set(key, { ...row, lastSyncedAt: syncedAt });
  }

  return {
    employees,
    locations,
    leaveTypes,
    allowedDimensions,
    balances,
    requests: new Map(),
  };
}

let state: HCMState = createSeedState();

export function resetHcmState(): void {
  state = createSeedState();
}

export function employeeExists(employeeId: string): boolean {
  return state.employees.some((e) => e.id === employeeId);
}

export function locationExists(locationId: string): boolean {
  return state.locations.some((l) => l.id === locationId);
}

export function isValidDimension(
  locationId: string,
  leaveType: string,
): boolean {
  return state.allowedDimensions.has(`${locationId}:${leaveType}`);
}

export function getEmployee(employeeId: string): Employee | undefined {
  return state.employees.find((e) => e.id === employeeId);
}

export function getBalance(
  employeeId: string,
  locationId: string,
  leaveType: string,
): LeaveBalance | undefined {
  return state.balances.get(balanceKey(employeeId, locationId, leaveType));
}

export function getAllBalances(): LeaveBalance[] {
  return Array.from(state.balances.values());
}

export function deductBalance(
  employeeId: string,
  locationId: string,
  leaveType: string,
  days: number,
): LeaveBalance | undefined {
  const key = balanceKey(employeeId, locationId, leaveType);
  const balance = state.balances.get(key);
  if (!balance) return undefined;

  const updated: LeaveBalance = {
    ...balance,
    available: balance.available - days,
    used: balance.used + days,
    lastSyncedAt: now(),
  };
  state.balances.set(key, updated);
  return updated;
}

export function restoreBalance(
  employeeId: string,
  locationId: string,
  leaveType: string,
  days: number,
): LeaveBalance | undefined {
  const key = balanceKey(employeeId, locationId, leaveType);
  const balance = state.balances.get(key);
  if (!balance) return undefined;

  const updated: LeaveBalance = {
    ...balance,
    available: balance.available + days,
    used: balance.used - days,
    lastSyncedAt: now(),
  };
  state.balances.set(key, updated);
  return updated;
}

export function addAnnualBonus(
  employeeId: string,
  days: number,
): LeaveBalance | undefined {
  const employee = getEmployee(employeeId);
  if (!employee) return undefined;

  const key = balanceKey(employeeId, employee.locationId, "annual");
  const balance = state.balances.get(key);
  if (!balance) return undefined;

  const updated: LeaveBalance = {
    ...balance,
    available: balance.available + days,
    total: balance.total + days,
    lastSyncedAt: now(),
  };
  state.balances.set(key, updated);
  return updated;
}

export function createRequest(
  input: Omit<TimeOffRequest, "id" | "status" | "submittedAt">,
): TimeOffRequest {
  const request: TimeOffRequest = {
    ...input,
    id: `req_${crypto.randomUUID()}`,
    status: "pending",
    submittedAt: now(),
  };
  state.requests.set(request.id, request);
  return request;
}

export function getRequest(id: string): TimeOffRequest | undefined {
  return state.requests.get(id);
}

export function updateRequest(
  id: string,
  updates: Partial<TimeOffRequest>,
): TimeOffRequest | undefined {
  const request = state.requests.get(id);
  if (!request) return undefined;

  const updated = { ...request, ...updates };
  state.requests.set(id, updated);
  return updated;
}

export function getAllRequests(): TimeOffRequest[] {
  return Array.from(state.requests.values()).sort(
    (a, b) => b.submittedAt.localeCompare(a.submittedAt),
  );
}

export function getRequestsByEmployee(employeeId: string): TimeOffRequest[] {
  return getAllRequests().filter((r) => r.employeeId === employeeId);
}

export function getPendingRequests(): TimeOffRequest[] {
  return getAllRequests().filter((r) => r.status === "pending");
}
