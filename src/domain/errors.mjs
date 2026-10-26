export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export function badRequest(code, message) {
  return new AppError(400, code, message);
}

export function conflict(code, message) {
  return new AppError(409, code, message);
}

export function unavailable(code, message) {
  return new AppError(503, code, message);
}
