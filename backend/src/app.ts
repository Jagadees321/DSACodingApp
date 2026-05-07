import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./lib/error-handler.js";
import { logger } from "./lib/logger.js";
import { httpRequestDurationMs } from "./lib/metrics.js";
import { requestContext } from "./middleware/request-context.js";
import { apiRouter } from "./routes/index.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(requestContext);
  morgan.token("id", (req) => (req as { id?: string }).id ?? "na");
  app.use(
    morgan(":method :url :status :response-time ms req=:id", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    }),
  );

  app.use(helmet());
  const corsOrigins =
    env.CORS_ORIGINS.length > 0
      ? env.CORS_ORIGINS
      : env.NODE_ENV === "development"
        ? true
        : false;
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.use((req, res, next) => {
    const end = httpRequestDurationMs.startTimer();
    res.on("finish", () => {
      end({
        method: req.method,
        route: req.route?.path ?? req.path,
        status_code: String(res.statusCode),
      });
    });
    next();
  });

  app.use("/health", healthRouter);
  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

