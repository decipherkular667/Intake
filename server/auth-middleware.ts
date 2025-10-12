import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from './env-config';

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Store the URL they were trying to access
  if (req.session) {
    req.session.returnTo = req.originalUrl;
  }

  return res.status(401).json({
    error: 'Authentication required',
    message: 'You must be logged in to access this resource',
    redirectTo: '/auth/login'
  });
}

// Middleware to check if user is NOT authenticated (for login/register pages)
export function requireGuest(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return next();
  }

  return res.status(403).json({
    error: 'Already authenticated',
    message: 'You are already logged in',
    user: req.user
  });
}

// Middleware to optionally get user (doesn't require auth)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just continue - req.user will be available if authenticated
  next();
}

// Middleware to check if user has verified email
export function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address to access this resource'
    });
  }

  next();
}

// Middleware to check if user is active
export function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      error: 'Account deactivated',
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  next();
}

// Rate limiting for auth endpoints
const authAttempts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitAuth(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isDevelopment) {
      return next(); // Skip rate limiting in development
    }

    const key = req.ip + ':auth';
    const now = Date.now();
    const attempts = authAttempts.get(key);

    if (attempts && now < attempts.resetTime) {
      if (attempts.count >= maxAttempts) {
        return res.status(429).json({
          error: 'Too many attempts',
          message: `Too many authentication attempts. Try again in ${Math.ceil((attempts.resetTime - now) / 60000)} minutes.`,
          retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
        });
      }
    } else {
      // Reset or initialize
      authAttempts.set(key, { count: 0, resetTime: now + windowMs });
    }

    // Increment attempt count on failed login
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      if (res.statusCode === 401 || res.statusCode === 400) {
        const attempts = authAttempts.get(key);
        if (attempts) {
          attempts.count++;
        }
      }
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// CSRF protection for state-changing operations
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // For development, you might want to skip CSRF
  if (isDevelopment) {
    return next();
  }

  // In production, implement proper CSRF token validation
  const token = req.headers['x-csrf-token'] || req.body._token;

  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token is required for this operation'
    });
  }

  // TODO: Implement actual CSRF token validation
  // For now, we'll just check that a token is provided
  next();
}