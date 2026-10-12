import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool, isFallbackActive, fallbackStore } from '../config/db.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../utils/audit.js';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({
      success: false,
      message: 'Username and password are required.'
    });
    return;
  }

  try {
    const pool = getPool();
    let user: any = null;

    if (pool && !isFallbackActive()) {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
      if (rows.length > 0) {
        user = rows[0];
      }
    } else {
      user = fallbackStore.users.find(u => u.username === username && u.is_active);
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials or inactive user account.'
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
      return;
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: '24h'
    });

    await logAuditEvent(user.id, 'LOGIN', 'user', String(user.id), { username: user.username }, req.ip);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      }
    });
  } catch (error: any) {
    console.error('[Auth Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication processing error.'
    });
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthenticated.' });
    return;
  }

  res.json({
    success: true,
    user: req.user
  });
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({
      success: false,
      message: 'Valid current password and new password (min 6 characters) are required.'
    });
    return;
  }

  try {
    const pool = getPool();
    let user: any = null;

    if (pool && !isFallbackActive()) {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      if (rows.length > 0) user = rows[0];
    } else {
      user = fallbackStore.users.find(u => u.id === userId);
    }

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Current password does not match.' });
      return;
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);

    if (pool && !isFallbackActive()) {
      await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedNew, userId]);
    } else {
      user.password_hash = hashedNew;
    }

    await logAuditEvent(userId || null, 'PASSWORD_CHANGE', 'user', String(userId), null, req.ip);

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
}
