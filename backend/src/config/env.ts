import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/royaldsa"),
  MONGODB_DB_NAME: z.string().min(1).default("royaldsa"),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev-access-secret-key-123"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev-refresh-secret-key-123"),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:8080"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_DURATION_SEC: z.coerce.number().int().positive().default(60),
  /** Self-hosted Judge0 (e.g. http://localhost:2358) or public https://ce.judge0.com */
  JUDGE0_BASE_URL: z.string().url().default("https://ce.judge0.com"),
  /** RapidAPI only — leave empty for self-hosted Judge0 */
  JUDGE0_API_KEY: z.string().default(""),
  JUDGE0_API_HOST: z.string().default(""),
  /** Self-hosted Judge0: set if AUTHN_TOKEN is configured in judge0.conf (header X-Auth-Token) */
  JUDGE0_AUTH_TOKEN: z.string().default(""),
  JUDGE0_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  JUDGE0_MAX_POLLS: z.coerce.number().int().positive().default(25),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  GEMINI_FALLBACK_MODELS: z.string().default("gemini-2.0-flash"),
  /** Google OAuth — leave blank to disable */
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().default("http://localhost:3002/api/v1/auth/oauth/google/callback"),
  /** Browser redirect after OAuth; SPA reads #accessToken & #refreshToken */
  FRONTEND_OAUTH_SUCCESS_URL: z.string().default("http://localhost:8080/oauth/callback"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
  GEMINI_FALLBACK_MODELS: parsed.data.GEMINI_FALLBACK_MODELS.split(",")
    .map((m) => m.trim())
    .filter(Boolean),
};

