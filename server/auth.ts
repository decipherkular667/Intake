import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db, users } from './db';
import { eq } from 'drizzle-orm';
import type { User, DatabaseUser } from '../shared/schema-sqlite';

// Convert DatabaseUser to User (handling nullable fields and date conversion)
function toUser(dbUser: Omit<DatabaseUser, 'password'>): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    emailVerified: dbUser.emailVerified ?? false,
    isActive: dbUser.isActive ?? true,
    lastLoginAt: dbUser.lastLoginAt,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
}

// Configure local strategy for username/password authentication
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email: string, password: string, done) => {
    try {
      // Find user by email
      const userResult = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      const user = userResult[0];

      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if user is active
      if (!user.isActive) {
        return done(null, false, { message: 'Account is deactivated' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Update last login time
      await db.update(users)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(users.id, user.id));

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return done(null, toUser(userWithoutPassword));

    } catch (error) {
      console.error('Authentication error:', error);
      return done(error);
    }
  }
));

// Serialize user for session storage
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const userResult = await db.select().from(users).where(eq(users.id, id));
    const user = userResult[0];

    if (!user) {
      return done(null, false);
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    done(null, toUser(userWithoutPassword));
  } catch (error) {
    console.error('Deserialization error:', error);
    done(error);
  }
});

// Password hashing utility
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Password verification utility
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// User creation utility
export async function createUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<User> {
  const hashedPassword = await hashPassword(userData.password);

  const userResult = await db.insert(users).values({
    email: userData.email.toLowerCase(),
    password: hashedPassword,
    firstName: userData.firstName,
    lastName: userData.lastName,
  }).returning();

  const { password: _, ...userWithoutPassword } = userResult[0];
  return toUser(userWithoutPassword);
}

// Check if email already exists
export async function emailExists(email: string): Promise<boolean> {
  const userResult = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
  return userResult.length > 0;
}

export default passport;