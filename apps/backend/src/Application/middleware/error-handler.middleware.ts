import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../Domain/errors/AppError.js';
import { ValidationError } from '../../Domain/errors/ValidationError.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('[Error Handler]', err);

  if (err instanceof AppError) {
    const response: any = {
      success: false,
      error: err.message,
    };

    if (err instanceof ValidationError && err.errors) {
      response.details = err.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  return res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
