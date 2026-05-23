import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  readonly statusCode = 400;
  public readonly errors?: any;

  constructor(message: string, errors?: any) {
    super(message, errors);
    this.errors = errors;
  }
}
