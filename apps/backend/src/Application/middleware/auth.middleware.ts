import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayloadSchema, TokenPayload } from '@rent-car/common';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const decoded = jwt.verify(token, jwtSecret);
    const parsed = TokenPayloadSchema.safeParse(decoded);

    if (!parsed.success) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token format' });
    }

    req.user = parsed.data;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }
};
