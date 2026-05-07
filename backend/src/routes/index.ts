import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { problemRouter } from "../modules/problems/problems.routes.js";
import { fundamentalsRouter } from "../modules/fundamentals/fundamentals.routes.js";
import { progressRouter } from "../modules/progress/progress.routes.js";
import { submissionsRouter } from "../modules/submissions/submissions.routes.js";
import { testsRouter } from "../modules/tests/tests.routes.js";
import { assignedTestsRouter } from "../modules/assigned-tests/assigned-tests.routes.js";
import { notificationsRouter } from "../modules/notifications/notifications.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/problems", problemRouter);
apiRouter.use("/fundamentals", fundamentalsRouter);
apiRouter.use("/progress", progressRouter);
apiRouter.use("/submissions", submissionsRouter);
apiRouter.use("/tests", testsRouter);
apiRouter.use("/assigned-tests", assignedTestsRouter);
apiRouter.use("/notifications", notificationsRouter);

