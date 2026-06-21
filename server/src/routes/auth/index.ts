import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateToken, hashPassword, comparePassword } from '../../services/auth';
import { prisma } from '../../utils/prisma';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

const router = Router();

// Fallback store when database is unavailable.
const memoryUsers = new Map<string, AuthUser>();

const isDbUnavailable = (error: any): boolean => {
  return (
    error?.code === 'P1001' ||
    String(error?.message || '').toLowerCase().includes("can't reach database") ||
    String(error?.message || '').toLowerCase().includes('database server')
  );
};

const findUserByEmail = async (email: string): Promise<AuthUser | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true
      }
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || 'User',
      passwordHash: user.passwordHash
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      return memoryUsers.get(email) || null;
    }

    throw error;
  }
};

const createUser = async (name: string, email: string, passwordHash: string): Promise<AuthUser> => {
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true
      }
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name || 'User',
      passwordHash: user.passwordHash || passwordHash
    };
  } catch (error: any) {
    // Handle unique constraint violation (race condition: duplicate signup)
    if (error?.code === 'P2002') {
      throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }

    if (isDbUnavailable(error)) {
      const memoryUser: AuthUser = {
        id: `mem_${Date.now()}`,
        email,
        name,
        passwordHash
      };

      memoryUsers.set(email, memoryUser);
      return memoryUser;
    }

    throw error;
  }
};

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error?.message || 'Login failed' });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await createUser(name, normalizedEmail, passwordHash);

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ error: error?.message || 'Registration failed' });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user exists, otherwise create them
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || 'Google User',
          email: normalizedEmail,
          passwordHash: null
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name || 'User'
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error: any) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: error?.message || 'Google authentication failed' });
  }
});

export default router;
