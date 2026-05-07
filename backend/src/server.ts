import { createServer } from "node:http";
import { connectMongo } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";

async function bootstrap() {
  await connectMongo();
  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "Startup failure");
  process.exit(1);
});

