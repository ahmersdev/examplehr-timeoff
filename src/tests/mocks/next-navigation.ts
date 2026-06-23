import { vi } from "vitest";

export const mockReplace = vi.fn();
export const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));
