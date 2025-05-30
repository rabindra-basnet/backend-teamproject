import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { z } from "zod";
import { HTTPSTATUS } from "../config/http.config";
import { joinWorkspaceByInviteService } from "../services/member.service";
import logger from "../utils/logger";

export const joinWorkspaceController = asyncHandler(
  async (req: Request, res: Response) => {
    const inviteCode = z.string().parse(req.params.inviteCode);
    const userId = req.user?._id;

    logger.info("Attempt to join workspace by invite", {
      userId,
      inviteCode,
    });

    try {
      const { workspaceId, role } = await joinWorkspaceByInviteService(
        userId,
        inviteCode
      );

      logger.info("Successfully joined workspace", {
        userId,
        workspaceId,
        role,
      });

      return res.status(HTTPSTATUS.OK).json({
        message: "Successfully joined the workspace",
        workspaceId,
        role,
      });
    } catch (error) {
      logger.error("Failed to join workspace by invite", {
        userId,
        inviteCode,
        error,
      });
      throw error; // let asyncHandler handle the error response
    }
  }
);
