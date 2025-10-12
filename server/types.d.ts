declare namespace Express {
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