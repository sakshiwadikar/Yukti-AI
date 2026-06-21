import { Request, Response, NextFunction } from 'express';
import { verifyToken, type AuthPayload } from '../services/auth';

export interface AuthedRequest extends Request {
  authUser?: AuthPayload;
}

export const authMiddleware = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization token is required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.authUser = decoded;
  next();
};
