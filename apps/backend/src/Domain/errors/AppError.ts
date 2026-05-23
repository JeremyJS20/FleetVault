export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
