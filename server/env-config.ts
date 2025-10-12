import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Core Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5000'),
  // Bind to 0.0.0.0 in production for cloud platforms (Render, Railway, etc.)
  HOST: z.string().default(process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'),

  // Application Info
  APP_NAME: z.string().default('IntakeAI Health'),
  APP_VERSION: z.string().default('1.0.0'),

  // Database (Required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DB_POOL_MIN: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  DB_POOL_MAX: z.string().transform(Number).pipe(z.number().min(1)).optional(),

  // Security (Required in production)
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // AI Services (At least one required for full functionality)
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  HF_TOKEN: z.string().optional(),

  // External APIs
  USDA_API_KEY: z.string().optional(),
  FOOD_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_TO_FILE: z.string().transform(val => val === 'true').default('false'),
  SENTRY_DSN: z.string().optional(),

  // Email (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number()).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number()).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number()).default('100'),

  // Cache
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(Number).pipe(z.number()).default('3600'),

  // Development
  DEBUG: z.string().transform(val => val === 'true').default('false'),
  ENABLE_DOCS: z.string().transform(val => val === 'true').default('false'),
  AUTO_SEED_DB: z.string().transform(val => val === 'true').default('false'),

  // Production
  SSL_CERT_PATH: z.string().optional(),
  SSL_KEY_PATH: z.string().optional(),
  CLUSTER_MODE: z.string().transform(val => val === 'true').default('false'),
  WORKERS: z.string().transform(Number).pipe(z.number()).default('1'),

  // Feature Flags
  ENABLE_AI_INSIGHTS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_TRANSLATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_FOOD_SEARCH: z.string().transform(val => val === 'true').default('true'),
  ENABLE_TCM_RECOMMENDATIONS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),

  // Analytics
  GA_TRACKING_ID: z.string().optional(),
  MIXPANEL_TOKEN: z.string().optional(),

  // Backup
  BACKUP_S3_BUCKET: z.string().optional(),
  BACKUP_S3_ACCESS_KEY: z.string().optional(),
  BACKUP_S3_SECRET_KEY: z.string().optional(),
  BACKUP_SCHEDULE: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Validate and parse environment variables
function validateEnv(): EnvConfig {
  try {
    const parsed = envSchema.parse(process.env);

    // Additional validation for production
    if (parsed.NODE_ENV === 'production') {
      // Ensure strong session secret in production
      if (parsed.SESSION_SECRET.length < 64) {
        console.warn('⚠️  WARNING: SESSION_SECRET should be at least 64 characters in production');
      }

      // Warn about missing AI keys
      const aiKeys = [
        parsed.OPENAI_API_KEY,
        parsed.GOOGLE_GEMINI_API_KEY,
        parsed.HF_TOKEN
      ].filter(Boolean);

      if (aiKeys.length === 0) {
        console.warn('⚠️  WARNING: No AI service API keys configured. AI features will be limited.');
      }

      // SSL warning
      if (!parsed.SSL_CERT_PATH || !parsed.SSL_KEY_PATH) {
        console.warn('⚠️  WARNING: SSL certificates not configured for production');
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });

      console.error('\n📋 To fix this:');
      console.error('1. Copy .env.example to .env');
      console.error('2. Fill in the required values');
      console.error('3. Restart the application');

      process.exit(1);
    }
    throw error;
  }
}

// Load and validate environment
export const env = validateEnv();

// Helper functions for environment checks
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Feature flag helpers
export const features = {
  aiInsights: env.ENABLE_AI_INSIGHTS,
  translation: env.ENABLE_TRANSLATION,
  foodSearch: env.ENABLE_FOOD_SEARCH,
  tcmRecommendations: env.ENABLE_TCM_RECOMMENDATIONS,
  analytics: env.ENABLE_ANALYTICS,
};

// Log configuration summary
if (isDevelopment) {
  console.log('🔧 Environment Configuration:');
  console.log(`  - Environment: ${env.NODE_ENV}`);
  console.log(`  - Port: ${env.PORT}`);
  console.log(`  - Database: ${env.DATABASE_URL ? '✓ Configured' : '❌ Missing'}`);
  console.log(`  - Session Secret: ${env.SESSION_SECRET ? '✓ Configured' : '❌ Missing'}`);

  const aiServicesCount = [
    env.OPENAI_API_KEY,
    env.GOOGLE_GEMINI_API_KEY,
    env.HF_TOKEN
  ].filter(Boolean).length;

  console.log(`  - AI Services: ${aiServicesCount} configured`);
  console.log(`  - Features: ${Object.entries(features).filter(([, enabled]) => enabled).map(([name]) => name).join(', ')}`);
}