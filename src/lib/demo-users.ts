import type { Employee } from "@/types";

export const DEMO_EMPLOYEE: Employee = {
  id: "emp-bob",
  name: "Bob Martinez",
  email: "bob@example.com",
  locationId: "loc-london",
  role: "employee",
  anniversaryDate: "2021-06-01",
};

export const DEMO_MANAGER: Employee = {
  id: "emp-alice",
  name: "Alice Chen",
  email: "alice@example.com",
  locationId: "loc-nyc",
  role: "manager",
  anniversaryDate: "2020-03-15",
};
