import { NextFunction } from "express"; 
import { Request, Response } from "express";
import { HTTPSTATUS } from "../config/http.config";
import logger from "../utils/logger";
import mongoose from "mongoose";


/**
 * Health check controller to verify the status of the Task Management API.
 * It checks if the database is connected and returns the status.
 *
 * @param {Request} _req - The request object (not used in this controller).
 * @param {Response} res - The response object to send the status.
 * @returns {Promise<Response>} - Returns a JSON response with the health status.
 */
export const checkHealth = async (_req: Request, res: Response, _next: NextFunction): Promise<Response> => {
    const dbStatus = mongoose.connection.readyState;
    const isDbConnected = dbStatus === 1; // 0 = disconnected, 1 = connected

    if (!isDbConnected) {
      logger.error("Database is not connected");
      return res.status(HTTPSTATUS.SERVICE_UNAVAILABLE).json({
        status: "fail",
        message: "Database is not connected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(HTTPSTATUS.OK).json({
      status: "ok",
      message: "Connected to Task Management API",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  };

