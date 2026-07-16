// Shared TS interfaces. Also augments Express.Request with the authed user.
import type { Role, Specialization } from "../config/constants.js";

// Only fields safe to expose to the client. Never includes password hash / tokens.
// Roles are per project (see Request.projectRoles), not part of the user identity.
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  specialization: Specialization | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser;
      // Set by requireProjectMember once membership is verified.
      projectId?: string;
      // The caller's roles within `projectId` (union = effective permissions).
      projectRoles?: Role[];
    }
  }
}

export {};
