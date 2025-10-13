import session from 'express-session';
import { env, isDevelopment } from './env-config';
import MemoryStore from 'memorystore';
import connectPgSimple from 'connect-pg-simple';
import pkg from 'pg';
const { Pool } = pkg;

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
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for most cloud PostgreSQL providers
      }
    });

    return new PgSession({
      pool: pool,
      tableName: 'session',
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
    secure: env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // CSRF protection
    domain: env.NODE_ENV === 'production' ? undefined : 'localhost', // Let browser handle domain in production
  },
  name: 'sessionId', // Don't use default 'connect.sid'
  proxy: env.NODE_ENV === 'production', // Trust proxy in production (Render uses a proxy)
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