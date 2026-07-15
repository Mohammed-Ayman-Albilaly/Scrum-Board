// Typed application errors. The error handler maps these to HTTP responses.

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.") {
    super(400, message, "VALIDATION_ERROR");
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required.") {
    super(401, message, "AUTH_ERROR");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(403, message, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists.") {
    super(409, message, "CONFLICT");
  }
}
