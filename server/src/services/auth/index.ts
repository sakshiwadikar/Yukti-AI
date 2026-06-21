import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { serverEnv } from '../../config/env';

const JWT_SECRET = serverEnv.JWT_SECRET;
const JWT_EXPIRY = '7d';

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
}

export const generateToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

export const verifyToken = (token: string): AuthPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
