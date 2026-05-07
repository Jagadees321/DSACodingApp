import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "./http-error.js";
import { logger } from "./logger.js";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, "NOT_FOUND", "Route not found"));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  void next;
  if (err instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: err.issues.map((i) => i.message).join(", ") },
      requestId: req.id,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code, message: err.message },
      requestId: req.id,
    });
  }

  logger.error({ err, requestId: req.id }, "Unhandled server error");
  return res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    requestId: req.id,
  });
}

