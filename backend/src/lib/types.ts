// Shared TS interfaces. Also augments Express.Request with the authed user.
import type { Role, Specialization } from "../config/constants.js";

// Only fields safe to expose to the client. Never includes password hash / tokens.
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialization: Specialization | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export {};
