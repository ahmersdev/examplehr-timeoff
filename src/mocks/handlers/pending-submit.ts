import { http } from "msw";

import { handlers as defaultHandlers } from "./default";

export const handlers = [
  ...defaultHandlers.slice(0, 3),
  http.post("/api/hcm/balance/request", () => new Promise(() => {})),
  ...defaultHandlers.slice(4),
];
