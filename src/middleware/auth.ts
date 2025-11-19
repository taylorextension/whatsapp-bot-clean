/**
 * Authentication Middleware for Express Routes
 * Validates Supabase JWT tokens
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn('⚠️  Supabase credentials not configured - Authentication will be disabled');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Middleware to verify authentication
 * Expects Authorization header with Bearer token
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`🔒 Unauthorized access attempt to ${req.path} - Missing token`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid Bearer token.',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn(`🔒 Unauthorized access attempt to ${req.path} - Invalid token`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token.',
        timestamp: new Date().toISOString()
      });
    }

    // Attach user to request object for use in routes
    (req as any).user = user;

    logger.info(`✅ Authenticated user: ${user.email} accessing ${req.path}`);
    next();
  } catch (error: any) {
    logger.error('Error in auth middleware:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication verification failed',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Optional authentication - doesn't block if no token provided
 * But validates token if present
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      (req as any).user = user;
      logger.info(`✅ Authenticated user: ${user.email} accessing ${req.path}`);
    }

    next();
  } catch (error: any) {
    logger.error('Error in optional auth middleware:', error.message);
    // Don't block on error, just continue
    next();
  }
}

/**
 * Middleware to verify authentication AND admin status
 * Requires user to be authenticated and in the admin_users table
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // First, verify authentication
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`🔒 Unauthorized admin access attempt to ${req.path} - Missing token`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid Bearer token.',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn(`🔒 Unauthorized admin access attempt to ${req.path} - Invalid token`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token.',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user is admin
    const { data: isAdmin, error: adminCheckError } = await supabase
      .rpc('is_user_admin', { user_email: user.email });

    if (adminCheckError) {
      logger.error('Error checking admin status:', adminCheckError.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify admin status',
        timestamp: new Date().toISOString()
      });
    }

    if (!isAdmin) {
      logger.warn(`🚫 Forbidden: User ${user.email} is not an admin - attempted to access ${req.path}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin privileges required to access this resource.',
        timestamp: new Date().toISOString()
      });
    }

    // User is authenticated and is admin
    (req as any).user = user;
    logger.info(`✅ Admin access granted: ${user.email} accessing ${req.path}`);
    next();
  } catch (error: any) {
    logger.error('Error in admin auth middleware:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication verification failed',
      timestamp: new Date().toISOString()
    });
  }
}
