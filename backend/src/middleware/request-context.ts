import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function requestContext(req: Request, _res: Response, next: NextFunction) {
  req.id = req.header("x-request-id") ?? randomUUID();
  next();
}

