import { setupWorker } from "msw/browser";

import { handlers } from "./handlers/default";

export const worker = setupWorker(...handlers);
