// Resolve + authorize the active project for a scoped request. Reads the
// projectId from the `?projectId=` query (defaulting to the shared project for
// backward compatibility), verifies membership, and pins it on req.projectId.
import type { Request, Response, NextFunction } from "express";
import { AuthError, ForbiddenError } from "../../lib/errors.js";
import { DEFAULT_PROJECT_ID } from "../../config/constants.js";
import { isMember } from "./logic.js";

export async function requireProjectMember(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AuthError();
    const raw = req.query.projectId;
    const projectId = typeof raw === "string" && raw.length > 0 ? raw : DEFAULT_PROJECT_ID;
    if (!(await isMember(projectId, req.user.id))) {
      throw new ForbiddenError("You are not a member of this project.");
    }
    req.projectId = projectId;
    next();
  } catch (err) {
    next(err);
  }
}
