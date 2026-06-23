import { setupServer } from "msw/node";

import { handlers } from "./handlers/default";

export const server = setupServer(...handlers);
