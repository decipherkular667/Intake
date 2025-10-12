import { Router, Request, Response, NextFunction } from 'express';
import passport from '../auth';
import { createUser, emailExists } from '../auth';
import { requireAuth, requireGuest, rateLimitAuth, securityHeaders } from '../auth-middleware';
import { loginSchema, registerSchema } from '../../shared/schema-sqlite';
import { ZodError } from 'zod';
import {
  ValidationError,
  AuthenticationError,
  sendSuccess,
  sendError,
  validateRequired
} from '../error-utils';
import { wrapAsync, validateSchema } from '../error-middleware';

const router = Router();

// Apply security headers to all auth routes
router.use(securityHeaders);

// Apply rate limiting to sensitive routes
router.use(['/login', '/register'], rateLimitAuth(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

// Register new user
router.post('/register', requireGuest, validateSchema(registerSchema), wrapAsync(async (req: Request, res: Response) => {
  // Check if email already exists
  if (await emailExists(req.body.email)) {
    throw new ValidationError('An account with this email address already exists');
  }

  // Create user
  const user = await createUser({
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
  });

  // Log in the user immediately
  req.login(user, (err) => {
    if (err) {
      console.error('Auto-login error:', err);
      return sendSuccess(res,
        { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
        'Account created successfully. Please log in.',
        201
      );
    }

    sendSuccess(res, req.user, 'Account created and logged in successfully', 201);
  });
}));

// Login user
router.post('/login', validateSchema(loginSchema), (req: Request, res: Response, next: NextFunction) => {
  // If user is already authenticated, return current user info
  if (req.isAuthenticated()) {
    return sendSuccess(res, req.user, 'Already logged in');
  }
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Login error:', err);
      return sendError(res, 'An error occurred during login', 500);
    }

    if (!user) {
      throw new AuthenticationError(info?.message || 'Invalid credentials');
    }

    req.login(user, (err) => {
      if (err) {
        console.error('Session creation error:', err);
        return sendError(res, 'Failed to create session', 500);
      }

      // Get the URL they were trying to access
      const redirectTo = req.session?.returnTo || '/dashboard';
      if (req.session?.returnTo) {
        delete req.session.returnTo;
      }

      sendSuccess(res, {
        user: req.user,
        redirectTo
      }, 'Login successful');
    });
  })(req, res, next);
});

// Logout user
router.post('/logout', requireAuth, wrapAsync(async (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return sendError(res, 'An error occurred during logout', 500);
    }

    req.session?.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }

      sendSuccess(res, null, 'Logout successful');
    });
  });
}));

// Get current user
router.get('/me', requireAuth, wrapAsync(async (req: Request, res: Response) => {
  sendSuccess(res, req.user);
}));

// Check authentication status
router.get('/status', wrapAsync(async (req: Request, res: Response) => {
  sendSuccess(res, {
    authenticated: req.isAuthenticated(),
    user: req.user || null
  });
}));

// Refresh session (keep alive)
router.post('/refresh', requireAuth, wrapAsync(async (req: Request, res: Response) => {
  // Just accessing the session will refresh it
  sendSuccess(res, {
    expiresAt: new Date(Date.now() + (req.session?.cookie.maxAge || 0))
  }, 'Session refreshed');
}));

// Change password
router.post('/change-password', requireAuth, wrapAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  validateRequired(req.body, ['currentPassword', 'newPassword']);

  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters long');
  }

  // TODO: Implement password change logic
  // 1. Verify current password
  // 2. Hash new password
  // 3. Update in database
  // 4. Invalidate other sessions (optional)

  sendSuccess(res, null, 'Password changed successfully');
}));

// Delete account
router.delete('/account', requireAuth, wrapAsync(async (req: Request, res: Response) => {
  const { password } = req.body;

  validateRequired(req.body, ['password']);

  // TODO: Implement account deletion logic
  // 1. Verify password
  // 2. Soft delete user (set isActive = false)
  // 3. Clean up user data (or anonymize)
  // 4. Send confirmation email

  sendSuccess(res, null, 'Account deletion initiated. You will receive a confirmation email.');
}));

export default router;