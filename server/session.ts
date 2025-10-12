import session from 'express-session';
import { env, isDevelopment } from './env-config';
import MemoryStore from 'memorystore';
import connectPgSimple from 'connect-pg-simple';
import { neon } from '@neondatabase/serverless';

// Create session store based on environment
function createSessionStore() {
  if (isDevelopment || !env.DATABASE_URL) {
    // Use MemoryStore for development (with TTL)
    const MemStore = MemoryStore(session);
    return new MemStore({
      checkPeriod: 86400000, // 24 hours
    });
  } else {
    // Use PostgreSQL store for production
    const PgSession = connectPgSimple(session);
    const pgClient = neon(env.DATABASE_URL);

    return new PgSession({
      pool: pgClient as any,
      tableName: 'session', // This table will be created automatically
      createTableIfMissing: true,
    });
  }
}

// Session configuration
export const sessionConfig = session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: createSessionStore(),
  cookie: {
    secure: env.NODE_ENV === 'production' && !isDevelopment, // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // CSRF protection
  },
  name: 'sessionId', // Don't use default 'connect.sid'
});

// Session types for TypeScript
declare module 'express-session' {
  interface SessionData {
    passport: {
      user: string;
    };
    returnTo?: string;
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      emailVerified: boolean;
      isActive: boolean;
      lastLoginAt: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    }
  }
}