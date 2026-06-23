export const hcmKeys = {
  all: ["hcm"] as const,
  balances: (employeeId: string) =>
    [...hcmKeys.all, "balances", employeeId] as const,
  balance: (employeeId: string, locationId: string, leaveType: string) =>
    [...hcmKeys.all, "balance", employeeId, locationId, leaveType] as const,
  requests: (params: { employeeId?: string; status?: "pending" }) =>
    [...hcmKeys.all, "requests", params] as const,
};

export const hcmMutations = {
  all: [...hcmKeys.all, "mutation"] as const,
  submit: [...hcmKeys.all, "mutation", "submit"] as const,
  approve: [...hcmKeys.all, "mutation", "approve"] as const,
  deny: [...hcmKeys.all, "mutation", "deny"] as const,
};
