import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

type AsyncControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler =
  (controller: AsyncControllerType): AsyncControllerType =>
  async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      logger.error(`Error in ${req.method} ${req.originalUrl}: ${(error as Error).message}`);
      next(error);
    }
  };
