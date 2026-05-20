import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  readonly statusCode = 400;

  constructor(message: string, public readonly errors?: any) {
    super(message);
  }
}
