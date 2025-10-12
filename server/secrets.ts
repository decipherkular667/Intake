import { createHash, randomBytes } from 'crypto';
import { env } from './env-config';

/**
 * Secrets management utilities
 * Provides secure handling of sensitive configuration
 */

// Mask sensitive values for logging
export function maskSecret(value: string | undefined, visibleChars = 4): string {
  if (!value) return '[NOT_SET]';
  if (value.length <= visibleChars * 2) return '[HIDDEN]';

  const start = value.slice(0, visibleChars);
  const end = value.slice(-visibleChars);
  const middle = '*'.repeat(Math.max(8, value.length - visibleChars * 2));

  return `${start}${middle}${end}`;
}

// Generate secure random strings
export function generateSecret(length = 32): string {
  return randomBytes(length).toString('base64url');
}

// Hash secrets for comparison (useful for API key validation)
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

// Validate API key format
export function validateApiKeyFormat(key: string | undefined, service: string): boolean {
  if (!key) return false;

  const patterns = {
    openai: /^sk-[a-zA-Z0-9_-]{20,}$/,
    google: /^AIza[0-9A-Za-z_-]{35}$/,
    huggingface: /^hf_[a-zA-Z0-9]{30,}$/,
    usda: /^[a-zA-Z0-9]{40}$/,
  };

  const pattern = patterns[service as keyof typeof patterns];
  return pattern ? pattern.test(key) : key.length > 10;
}

// Get available AI services based on configured keys
export function getAvailableAIServices(): string[] {
  const services: string[] = [];

  if (env.OPENAI_API_KEY && validateApiKeyFormat(env.OPENAI_API_KEY, 'openai')) {
    services.push('openai');
  }

  if (env.GOOGLE_GEMINI_API_KEY && validateApiKeyFormat(env.GOOGLE_GEMINI_API_KEY, 'google')) {
    services.push('gemini');
  }

  if (env.HF_TOKEN && validateApiKeyFormat(env.HF_TOKEN, 'huggingface')) {
    services.push('huggingface');
  }

  return services;
}

// Secure configuration object for logging/debugging
export function getSecureConfig() {
  return {
    app: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
      port: env.PORT,
      host: env.HOST,
    },
    database: {
      configured: !!env.DATABASE_URL,
      url: env.DATABASE_URL ? `${env.DATABASE_URL.split('@')[0].split('://')[0]}://***@${env.DATABASE_URL.split('@')[1]?.split('/')[0]}/***` : '[NOT_SET]',
    },
    security: {
      sessionSecret: maskSecret(env.SESSION_SECRET),
      jwtSecret: maskSecret(env.JWT_SECRET),
      corsOrigin: env.CORS_ORIGIN,
    },
    ai: {
      openai: maskSecret(env.OPENAI_API_KEY),
      googleTranslate: maskSecret(env.GOOGLE_TRANSLATE_API_KEY),
      googleGemini: maskSecret(env.GOOGLE_GEMINI_API_KEY),
      huggingface: maskSecret(env.HF_TOKEN),
      availableServices: getAvailableAIServices(),
    },
    external: {
      usda: maskSecret(env.USDA_API_KEY),
      food: maskSecret(env.FOOD_API_KEY),
    },
    email: {
      configured: !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS),
      host: env.SMTP_HOST,
      from: env.SMTP_FROM,
    },
    features: {
      aiInsights: env.ENABLE_AI_INSIGHTS,
      translation: env.ENABLE_TRANSLATION,
      foodSearch: env.ENABLE_FOOD_SEARCH,
      tcmRecommendations: env.ENABLE_TCM_RECOMMENDATIONS,
      analytics: env.ENABLE_ANALYTICS,
    },
  };
}

// Validate all secrets and return health status
export function validateSecrets(): { healthy: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Critical secrets
  if (!env.DATABASE_URL) {
    issues.push('DATABASE_URL is not configured');
  }

  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    issues.push('SESSION_SECRET is missing or too short (minimum 32 characters)');
  }

  // AI service validation
  const aiServices = getAvailableAIServices();
  if (aiServices.length === 0) {
    warnings.push('No AI services configured - AI features will be limited');
  }

  // API key format validation
  if (env.OPENAI_API_KEY && !validateApiKeyFormat(env.OPENAI_API_KEY, 'openai')) {
    warnings.push('OpenAI API key format appears invalid');
  }

  if (env.GOOGLE_GEMINI_API_KEY && !validateApiKeyFormat(env.GOOGLE_GEMINI_API_KEY, 'google')) {
    warnings.push('Google Gemini API key format appears invalid');
  }

  if (env.HF_TOKEN && !validateApiKeyFormat(env.HF_TOKEN, 'huggingface')) {
    warnings.push('Hugging Face token format appears invalid');
  }

  // Production-specific validations
  if (env.NODE_ENV === 'production') {
    if (env.SESSION_SECRET.length < 64) {
      warnings.push('SESSION_SECRET should be at least 64 characters in production');
    }

    if (!env.SSL_CERT_PATH || !env.SSL_KEY_PATH) {
      warnings.push('SSL certificates not configured for production');
    }

    if (env.DATABASE_URL?.includes('localhost')) {
      warnings.push('Using localhost database in production');
    }
  }

  return {
    healthy: issues.length === 0,
    issues,
    warnings,
  };
}

// Auto-generate missing non-critical secrets in development
export function generateMissingSecrets(): Record<string, string> {
  const generated: Record<string, string> = {};

  if (!env.SESSION_SECRET && env.NODE_ENV === 'development') {
    generated.SESSION_SECRET = generateSecret(32);
  }

  if (!env.JWT_SECRET && env.NODE_ENV === 'development') {
    generated.JWT_SECRET = generateSecret(32);
  }

  return generated;
}